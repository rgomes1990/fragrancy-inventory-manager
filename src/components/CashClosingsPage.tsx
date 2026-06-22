import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import { useAuth } from '@/contexts/AuthContext';
import { cashClosingsApi } from '@/services/apiClient';
import { calculateCashBalance, CASH_BALANCE_PERIOD_START } from '@/lib/cashBalance';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Loader2 } from 'lucide-react';

interface CashClosing {
  id: string;
  tenant_id: string;
  closed_at: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  notes: string | null;
  created_by: string | null;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const CashClosingsPage: React.FC = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [opening, setOpening] = useState(0);
  const [current, setCurrent] = useState(0);
  const [periodStart, setPeriodStart] = useState<string>(CASH_BALANCE_PERIOD_START);
  const [notes, setNotes] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClosings = async () => {
    setLoading(true);
    try {
      const data = await cashClosingsApi.list();
      setClosings((data || []) as CashClosing[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar fechamentos', description: error.message || 'Erro desconhecido', variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId !== undefined) fetchClosings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, isAdmin]);

  const openNewDialog = async () => {
    if (!tenantId) {
      toast({ title: 'Selecione uma empresa', description: 'Apenas usuários vinculados a uma empresa podem fechar o caixa.', variant: 'destructive' });
      return;
    }
    setDialogOpen(true);
    setCalculating(true);
    setNotes('');
    // Saldo inicial = closing_balance do último fechamento; senão 0
    const last = closings[0];
    setOpening(last ? Number(last.closing_balance) : 0);
    setPeriodStart(last ? last.closed_at : CASH_BALANCE_PERIOD_START);
    try {
      const bal = await calculateCashBalance(tenantId, false);
      setCurrent(bal);
    } catch (e: any) {
      toast({ title: 'Erro ao calcular saldo', description: e.message, variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const confirmClosing = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await cashClosingsApi.create({
        tenant_id: tenantId,
        closed_at: now,
        period_start: periodStart,
        period_end: now,
        opening_balance: opening,
        closing_balance: current,
        notes: notes || null,
        created_by: currentUser || null,
      });
      toast({ title: 'Fechamento registrado', description: `Saldo final: ${fmt(current)}` });
      setDialogOpen(false);
      fetchClosings();
    } catch (error: any) {
      toast({ title: 'Erro ao registrar fechamento', description: error.message || 'Erro desconhecido', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Fechamento de Caixa</h1>
            <p className="text-sm text-muted-foreground">Histórico de fechamentos da sua empresa.</p>
          </div>
        </div>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Fechamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fechamentos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                    <TableHead className="text-right">Saldo inicial</TableHead>
                    <TableHead className="text-right">Saldo final</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closings.map((c) => {
                    const diff = Number(c.closing_balance) - Number(c.opening_balance);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(c.closed_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {fmtDate(c.period_start)} →<br />{fmtDate(c.period_end)}
                        </TableCell>
                        <TableCell className="text-right">{fmt(Number(c.opening_balance))}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(Number(c.closing_balance))}</TableCell>
                        <TableCell className={`text-right ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diff >= 0 ? '+' : ''}{fmt(diff)}
                        </TableCell>
                        <TableCell className="text-sm">{c.created_by || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[260px] truncate" title={c.notes || ''}>{c.notes || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo fechamento de caixa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Saldo inicial</div>
                <div className="text-xl font-semibold">{fmt(opening)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Desde {fmtDate(periodStart)}
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-emerald-50">
                <div className="text-xs text-emerald-700">Saldo final apurado</div>
                <div className="text-xl font-semibold text-emerald-700">
                  {calculating ? <Loader2 className="w-5 h-5 animate-spin" /> : fmt(current)}
                </div>
                <div className="text-[11px] text-emerald-700/70 mt-1">Caixa da Empresa agora</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: fechamento mensal de junho"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmClosing} disabled={saving || calculating}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando…</> : 'Confirmar fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashClosingsPage;
