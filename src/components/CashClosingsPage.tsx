import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import { useAuth } from '@/contexts/AuthContext';
import { cashClosingsApi } from '@/services/apiClient';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Loader2, Lock, Unlock, DollarSign, CreditCard, Smartphone, Landmark, Link2, ArrowDownCircle, ArrowUpCircle, Calculator, Clock } from 'lucide-react';
import type { CashClosing, SessionSummary } from '@/types/cashRegister';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const PAYMENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'Dinheiro': { label: 'Dinheiro', icon: <DollarSign className="w-4 h-4" />, color: 'text-green-600' },
  'Pix': { label: 'Pix', icon: <Smartphone className="w-4 h-4" />, color: 'text-purple-600' },
  'Débito': { label: 'Débito', icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-600' },
  'Crédito': { label: 'Crédito', icon: <CreditCard className="w-4 h-4" />, color: 'text-orange-600' },
  'Link': { label: 'Link', icon: <Link2 className="w-4 h-4" />, color: 'text-cyan-600' },
};

const CashClosingsPage: React.FC = () => {
  const { tenantId } = useTenantFilter();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { openRegister, isOpen, loading: registerLoading, refresh: refreshRegister } = useCashRegister();

  // History
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Session summary
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Open dialog
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [savingOpen, setSavingOpen] = useState(false);

  // Close dialog
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [savingClose, setSavingClose] = useState(false);

  const fetchClosings = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await cashClosingsApi.list();
      setClosings(((data || []) as CashClosing[]).filter(c => c.status === 'closed'));
    } catch (error: any) {
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
    }
    setLoadingHistory(false);
  }, [toast]);

  const fetchSummary = useCallback(async () => {
    if (!openRegister?.opened_at) return;
    setLoadingSummary(true);
    try {
      const data = await cashClosingsApi.getSessionSummary(openRegister.opened_at);
      setSummary(data);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar resumo', description: error.message, variant: 'destructive' });
    }
    setLoadingSummary(false);
  }, [openRegister?.opened_at, toast]);

  useEffect(() => {
    if (tenantId !== undefined) fetchClosings();
  }, [tenantId, fetchClosings]);

  // Auto-refresh summary every 60s while register is open
  useEffect(() => {
    if (!isOpen) return;
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [isOpen, fetchSummary]);

  const expectedCash = openRegister && summary
    ? Number(openRegister.opening_balance) + (summary.sales_by_type['Dinheiro'] || 0) - summary.expenses + summary.cash_entries
    : 0;

  // === ABRIR CAIXA ===
  const handleOpenRegister = async () => {
    if (!tenantId) {
      toast({ title: 'Selecione uma empresa', variant: 'destructive' });
      return;
    }
    setSavingOpen(true);
    try {
      const now = new Date().toISOString();
      await cashClosingsApi.create({
        tenant_id: tenantId,
        status: 'open',
        opened_at: now,
        opened_by: currentUser || null,
        period_start: now,
        opening_balance: parseFloat(openingAmount) || 0,
        closing_balance: 0,
        notes: openingNotes || null,
        created_by: currentUser || null,
      });
      toast({ title: 'Caixa aberto com sucesso!' });
      setOpenDialogVisible(false);
      setOpeningAmount('');
      setOpeningNotes('');
      await refreshRegister();
    } catch (error: any) {
      toast({ title: 'Erro ao abrir caixa', description: error.message, variant: 'destructive' });
    }
    setSavingOpen(false);
  };

  // === FECHAR CAIXA ===
  const handleCloseRegister = async () => {
    if (!openRegister) return;
    setSavingClose(true);
    try {
      const now = new Date().toISOString();
      const counted = parseFloat(countedAmount) || 0;
      const expected = expectedCash;
      const diff = counted - expected;

      await cashClosingsApi.update(openRegister.id, {
        status: 'closed',
        closed_at: now,
        period_end: now,
        closing_balance: expected,
        actual_closing_balance: counted,
        difference: diff,
        notes: closingNotes || null,
      });
      toast({ title: 'Caixa fechado com sucesso!', description: `Saldo contado: ${fmt(counted)}` });
      setCloseDialogVisible(false);
      setCountedAmount('');
      setClosingNotes('');
      setSummary(null);
      await refreshRegister();
      await fetchClosings();
    } catch (error: any) {
      toast({ title: 'Erro ao fechar caixa', description: error.message, variant: 'destructive' });
    }
    setSavingClose(false);
  };

  const closeDifference = countedAmount ? (parseFloat(countedAmount) || 0) - expectedCash : null;

  if (registerLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Caixa</h1>
              {isOpen ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <Unlock className="w-3 h-3 mr-1" /> Aberto
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  <Lock className="w-3 h-3 mr-1" /> Fechado
                </Badge>
              )}
            </div>
            {isOpen && openRegister ? (
              <p className="text-sm text-muted-foreground">
                Aberto em {fmtDate(openRegister.opened_at)} por {openRegister.opened_by || '—'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Abra o caixa para iniciar as operações.</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <Button variant="destructive" onClick={() => { setCloseDialogVisible(true); fetchSummary(); }} className="gap-2">
            <Lock className="w-4 h-4" /> Fechar Caixa
          </Button>
        ) : (
          <Button onClick={() => {
            const last = closings[0];
            const suggestion = last?.actual_closing_balance != null ? Number(last.actual_closing_balance) : 0;
            setOpeningAmount(suggestion > 0 ? suggestion.toString() : '');
            setOpenDialogVisible(true);
          }} className="gap-2">
            <Plus className="w-4 h-4" /> Abrir Caixa
          </Button>
        )}
      </div>

      {/* === SESSÃO ATIVA === */}
      {isOpen && openRegister && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Saldo Inicial */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4" /> Saldo Inicial
                </div>
                <div className="text-xl font-bold">{fmt(Number(openRegister.opening_balance))}</div>
              </CardContent>
            </Card>

            {/* Vendas por tipo */}
            {summary && Object.entries(PAYMENT_TYPE_CONFIG).map(([type, config]) => {
              const value = summary.sales_by_type[type] || 0;
              if (value === 0 && type !== 'Dinheiro' && type !== 'Pix') return null;
              return (
                <Card key={type}>
                  <CardContent className="p-4">
                    <div className={`flex items-center gap-2 text-sm mb-1 ${config.color}`}>
                      {config.icon} {config.label}
                    </div>
                    <div className="text-xl font-bold">{fmt(value)}</div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Despesas */}
            {summary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-rose-600 mb-1">
                    <ArrowDownCircle className="w-4 h-4" /> Despesas
                  </div>
                  <div className="text-xl font-bold text-rose-600">{fmt(summary.expenses)}</div>
                </CardContent>
              </Card>
            )}

            {/* Entradas de Caixa */}
            {summary && summary.cash_entries > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 mb-1">
                    <ArrowUpCircle className="w-4 h-4" /> Entradas de Caixa
                  </div>
                  <div className="text-xl font-bold text-emerald-600">{fmt(summary.cash_entries)}</div>
                </CardContent>
              </Card>
            )}

            {/* Total Vendas */}
            {summary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                    <Calculator className="w-4 h-4" /> Total Vendas
                  </div>
                  <div className="text-xl font-bold text-blue-600">{fmt(summary.total_sales)}</div>
                </CardContent>
              </Card>
            )}

            {/* Dinheiro Esperado no Caixa */}
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700 mb-1">
                  <DollarSign className="w-4 h-4" /> Dinheiro Esperado
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {loadingSummary ? <Loader2 className="w-5 h-5 animate-spin" /> : fmt(expectedCash)}
                </div>
              </CardContent>
            </Card>
          </div>

          {loadingSummary && !summary && (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando resumo…
            </div>
          )}
        </div>
      )}

      {/* === HISTÓRICO === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Histórico de Fechamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : closings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhum fechamento registrado ainda.
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/hora</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closings.map((c) => {
                    const diff = c.difference != null ? Number(c.difference) : null;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(c.closed_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {fmtDate(c.period_start)} →<br />{fmtDate(c.period_end)}
                        </TableCell>
                        <TableCell className="text-right">{fmt(Number(c.opening_balance))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(c.closing_balance))}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {c.actual_closing_balance != null ? fmt(Number(c.actual_closing_balance)) : '—'}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${diff != null ? (diff >= 0 ? 'text-emerald-600' : 'text-rose-600') : ''}`}>
                          {diff != null ? (
                            <>
                              {diff >= 0 ? '+' : ''}{fmt(diff)}
                              <span className="block text-[10px] font-normal">
                                {diff > 0 ? 'Sobra' : diff < 0 ? 'Falta' : 'Exato'}
                              </span>
                            </>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{c.created_by || c.opened_by || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={c.notes || ''}>{c.notes || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === DIALOG ABRIR CAIXA === */}
      <Dialog open={openDialogVisible} onOpenChange={setOpenDialogVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" /> Abrir Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor em dinheiro no caixa (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Conte o dinheiro físico no caixa e informe o valor.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Ex.: abertura do turno da manhã"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogVisible(false)} disabled={savingOpen}>
              Cancelar
            </Button>
            <Button onClick={handleOpenRegister} disabled={savingOpen}>
              {savingOpen ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Abrindo…</> : 'Confirmar Abertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DIALOG FECHAR CAIXA === */}
      <Dialog open={closeDialogVisible} onOpenChange={setCloseDialogVisible}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" /> Fechar Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumo da sessão */}
            {summary && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <h4 className="text-sm font-semibold text-muted-foreground">Resumo da Sessão</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Saldo Inicial:</div>
                  <div className="text-right font-medium">{fmt(Number(openRegister?.opening_balance || 0))}</div>

                  {Object.entries(PAYMENT_TYPE_CONFIG).map(([type, config]) => {
                    const value = summary.sales_by_type[type] || 0;
                    if (value === 0) return null;
                    return (
                      <React.Fragment key={type}>
                        <div className={`flex items-center gap-1 ${config.color}`}>
                          {config.icon} {config.label}:
                        </div>
                        <div className="text-right font-medium">{fmt(value)}</div>
                      </React.Fragment>
                    );
                  })}

                  {summary.expenses > 0 && (
                    <>
                      <div className="text-rose-600">Despesas:</div>
                      <div className="text-right font-medium text-rose-600">- {fmt(summary.expenses)}</div>
                    </>
                  )}

                  {summary.cash_entries > 0 && (
                    <>
                      <div className="text-emerald-600">Entradas de Caixa:</div>
                      <div className="text-right font-medium text-emerald-600">+ {fmt(summary.cash_entries)}</div>
                    </>
                  )}

                  <div className="border-t pt-2 font-semibold">Total Vendas:</div>
                  <div className="border-t pt-2 text-right font-bold">{fmt(summary.total_sales)}</div>

                  <div className="font-semibold text-emerald-700">Dinheiro Esperado:</div>
                  <div className="text-right font-bold text-emerald-700">{fmt(expectedCash)}</div>
                </div>
              </div>
            )}

            {loadingSummary && !summary && (
              <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculando resumo…
              </div>
            )}

            {/* Input do valor contado */}
            <div>
              <label className="text-sm font-medium">Valor contado no caixa (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Conte o dinheiro físico no caixa e informe o valor real.
              </p>
            </div>

            {/* Diferença */}
            {closeDifference !== null && (
              <div className={`rounded-lg border p-3 ${closeDifference >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${closeDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {closeDifference > 0 ? 'Sobra' : closeDifference < 0 ? 'Falta' : 'Exato'}
                  </span>
                  <span className={`text-xl font-bold ${closeDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {closeDifference >= 0 ? '+' : ''}{fmt(closeDifference)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex.: fechamento do turno da noite"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogVisible(false)} disabled={savingClose}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseRegister} disabled={savingClose || loadingSummary || !countedAmount}>
              {savingClose ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Fechando…</> : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashClosingsPage;
