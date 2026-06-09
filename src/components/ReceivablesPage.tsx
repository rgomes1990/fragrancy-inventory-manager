import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import { DollarSign, Search, Wallet } from 'lucide-react';
import PaymentDialog from './PaymentDialog';

interface Row {
  sale_group_id: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'parcial'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from('v_sales_balance').select('*').neq('status', 'pago');
      if (!isAdmin && tenantId) q = q.eq('tenant_id', tenantId);
      const { data: balanceData, error } = await q.order('sale_date', { ascending: false });
      if (error) throw error;

      const customerIds = Array.from(new Set((balanceData || []).map((r: any) => r.customer_id).filter(Boolean)));
      let customerMap: Record<string, string> = {};
      if (customerIds.length) {
        const { data: cs } = await supabase.from('customers').select('id, name').in('id', customerIds as string[]);
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

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !(r.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, search]);

  const totals = useMemo(() => {
    const totalReceber = filtered.reduce((s, r) => s + r.remaining, 0);
    return { totalReceber, qtde: filtered.length };
  }, [filtered]);

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
            <DollarSign className="w-8 h-8 text-emerald-500" />
            <div className="text-sm text-muted-foreground">
              Registre recebimentos parciais até quitar o pedido.
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
            <div className="flex gap-1">
              {(['all','pendente','parcial'] as const).map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                  {s === 'all' ? 'Todos' : s === 'pendente' ? 'Pendentes' : 'Parciais'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum pedido em aberto 🎉</div>
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
                {filtered.map(r => (
                  <TableRow key={r.sale_group_id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
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
                      <Button size="sm" onClick={() => setSelected(r)}>
                        Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <PaymentDialog
          open={!!selected}
          onClose={() => setSelected(null)}
          saleGroupId={selected.sale_group_id}
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
