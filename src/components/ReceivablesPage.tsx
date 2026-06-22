import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { salesBalanceApi, customersApi } from '@/services/apiClient';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import { DollarSign, Search, Wallet, AlertTriangle } from 'lucide-react';
import PaymentDialog from './PaymentDialog';

interface Row {
  sale_id: string;
  sale_group_id?: string; // backward compat
  tenant_id: string | null;
  customer_id: string | null;
  customer_name?: string;
  seller: string | null;
  sale_date: string;
  total: number;
  paid: number;
  remaining: number;
  status: 'pago' | 'parcial' | 'pendente';
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ReceivablesPage: React.FC = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'parcial' | 'vencidos'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const balanceData = await salesBalanceApi.list({ status_ne: 'pago' });

      const customerIds = Array.from(new Set((balanceData || []).map((r: any) => r.customer_id).filter(Boolean)));
      let customerMap: Record<string, string> = {};
      if (customerIds.length) {
        const cs = await customersApi.list();
        (cs || []).forEach((c: any) => { customerMap[c.id] = c.name; });
      }
      setRows((balanceData || []).map((r: any) => ({
        ...r,
        total: Number(r.total),
        paid: Number(r.paid),
        remaining: Number(r.remaining),
        customer_name: r.customer_id ? customerMap[r.customer_id] : 'Sem cliente',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [tenantId, isAdmin]);

  const OVERDUE_DAYS = 7;
  const daysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  const isOverdue = (r: Row) => daysSince(r.sale_date) > OVERDUE_DAYS;

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter === 'vencidos') {
      if (!isOverdue(r)) return false;
    } else if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !(r.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, search]);

  const totals = useMemo(() => {
    const totalReceber = filtered.reduce((s, r) => s + r.remaining, 0);
    const overdueRows = rows.filter(isOverdue);
    const overdueTotal = overdueRows.reduce((s, r) => s + r.remaining, 0);
    return { totalReceber, qtde: filtered.length, overdueQtde: overdueRows.length, overdueTotal };
  }, [filtered, rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" /> A Receber
          </h1>
          <p className="text-sm text-muted-foreground">Pedidos com pagamento pendente ou parcial</p>
        </div>
      </div>

      {totals.overdueQtde > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-rose-700">{totals.overdueQtde} pedido(s) vencido(s)</span>
            <span className="text-rose-600"> — mais de {OVERDUE_DAYS} dias em aberto, totalizando {formatBRL(totals.overdueTotal)}.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStatusFilter('vencidos')}>
            Ver vencidos
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total a Receber</div>
            <div className="text-2xl font-bold text-rose-600">{formatBRL(totals.totalReceber)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pedidos em aberto</div>
            <div className="text-2xl font-bold">{totals.qtde}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
            <div>
              <div className="text-xs text-muted-foreground">Vencidos (&gt;{OVERDUE_DAYS}d)</div>
              <div className="text-xl font-bold text-rose-600">{totals.overdueQtde}</div>
            </div>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all','pendente','parcial','vencidos'] as const).map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                  {s === 'all' ? 'Todos' : s === 'pendente' ? 'Pendentes' : s === 'parcial' ? 'Parciais' : 'Vencidos'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum pedido em aberto</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const overdue = isOverdue(r);
                  const days = daysSince(r.sale_date);
                  return (
                    <TableRow key={r.sale_id || r.sale_group_id} className={overdue ? 'bg-rose-50/40' : ''}>
                      <TableCell className="font-medium">
                        {r.customer_name}
                        {overdue && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> {days}d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(r.sale_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{r.seller || '—'}</TableCell>
                      <TableCell className="text-right">{formatBRL(r.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatBRL(r.paid)}</TableCell>
                      <TableCell className="text-right text-rose-600 font-semibold">{formatBRL(r.remaining)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {r.status === 'parcial' ? 'Parcial' : 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setSelected(r)}>Receber</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <PaymentDialog
          open={!!selected}
          onClose={() => setSelected(null)}
          saleGroupId={selected.sale_id || selected.sale_group_id!}
          tenantId={selected.tenant_id}
          total={selected.total}
          paid={selected.paid}
          customerName={selected.customer_name}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default ReceivablesPage;
