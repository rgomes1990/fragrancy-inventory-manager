import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { salePaymentsApi } from '@/services/apiClient';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import { History, Search, DollarSign, Hash, Calendar } from 'lucide-react';

interface PaymentRecord {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_type: string | null;
  notes: string | null;
  tenant_id: string | null;
  customer_name: string | null;
  sale_total: number | null;
  seller: string | null;
  created_at: string;
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PAYMENT_TYPES = ['all', 'Dinheiro', 'Pix', 'Débito', 'Crédito', 'Link'] as const;

const paymentTypeBadge = (type: string | null) => {
  const styles: Record<string, string> = {
    'Dinheiro': 'bg-green-100 text-green-700',
    'Pix': 'bg-cyan-100 text-cyan-700',
    'Débito': 'bg-blue-100 text-blue-700',
    'Crédito': 'bg-purple-100 text-purple-700',
    'Link': 'bg-orange-100 text-orange-700',
  };
  return styles[type || ''] || 'bg-gray-100 text-gray-600';
};

const PaymentHistoryPage: React.FC = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await salePaymentsApi.listWithDetails({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setPayments((data || []).map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        sale_total: r.sale_total ? Number(r.sale_total) : null,
        customer_name: r.customer_name || 'Sem cliente',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [tenantId, isAdmin, dateFrom, dateTo]);

  const filtered = useMemo(() => payments.filter(p => {
    if (typeFilter !== 'all' && p.payment_type !== typeFilter) return false;
    if (search && !(p.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [payments, typeFilter, search]);

  const totals = useMemo(() => ({
    totalRecebido: filtered.reduce((s, p) => s + p.amount, 0),
    qtde: filtered.length,
  }), [filtered]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-cyan-600" /> Recebimentos
        </h1>
        <p className="text-sm text-muted-foreground">Histórico de todas as baixas realizadas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-500" />
            <div>
              <div className="text-xs text-muted-foreground">Total Recebido</div>
              <div className="text-2xl font-bold text-emerald-600">{formatBRL(totals.totalRecebido)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Hash className="w-7 h-7 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Quantidade de Baixas</div>
              <div className="text-2xl font-bold">{totals.qtde}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-violet-500" />
            <div>
              <div className="text-xs text-muted-foreground">Período</div>
              <div className="text-sm font-medium">
                {dateFrom && dateTo
                  ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} - ${new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}`
                  : 'Todos os registros'}
              </div>
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
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
            <span className="text-muted-foreground text-sm">até</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            <div className="flex gap-1 flex-wrap">
              {PAYMENT_TYPES.map(t => (
                <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)}>
                  {t === 'all' ? 'Todos' : t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum recebimento encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total da Venda</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{p.customer_name}</TableCell>
                    <TableCell>{p.seller || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(p.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentTypeBadge(p.payment_type)}`}>
                        {p.payment_type || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.sale_total ? formatBRL(p.sale_total) : '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={p.notes || ''}>
                      {p.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistoryPage;
