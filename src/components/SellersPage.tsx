import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, UserCheck, FileText, TrendingUp } from 'lucide-react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Seller {
  id: string;
  name: string;
  commission_percentage: number;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SaleRow {
  id: string;
  seller: string | null;
  total_price: number;
  sale_date: string;
}

type PeriodKey = 'current_month' | 'last_month' | 'last_30' | 'current_year' | 'all';

const periodOptions: { value: PeriodKey; label: string }[] = [
  { value: 'current_month', label: 'Mês atual' },
  { value: 'last_month', label: 'Mês anterior' },
  { value: 'last_30', label: 'Últimos 30 dias' },
  { value: 'current_year', label: 'Ano atual' },
  { value: 'all', label: 'Todo período' },
];

const getRange = (p: PeriodKey): { start: Date | null; end: Date | null } => {
  const now = new Date();
  if (p === 'current_month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  if (p === 'last_month') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (p === 'last_30') {
    const s = new Date(now); s.setDate(s.getDate() - 30);
    return { start: s, end: null };
  }
  if (p === 'current_year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  }
  return { start: null, end: null };
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SellersPage = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('current_month');
  const [formData, setFormData] = useState({ name: '', commission_percentage: '0' });

  const fetchAll = async () => {
    try {
      let sq = supabase.from('sellers').select('*').order('name');
      let salesQ = supabase.from('sales').select('id, seller, total_price, sale_date');
      if (!isAdmin) {
        if (!tenantId) { setSellers([]); setSales([]); setLoading(false); return; }
        sq = sq.eq('tenant_id', tenantId);
        salesQ = salesQ.eq('tenant_id', tenantId);
      }
      const [{ data: sData, error: sErr }, { data: salesData, error: salesErr }] = await Promise.all([sq, salesQ]);
      if (sErr) throw sErr;
      if (salesErr) throw salesErr;
      setSellers((sData || []) as Seller[]);
      setSales((salesData || []) as SaleRow[]);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId !== undefined) fetchAll();
  }, [tenantId, isAdmin]);

  const filteredSales = useMemo(() => {
    const { start, end } = getRange(period);
    return sales.filter(s => {
      const d = new Date(s.sale_date);
      if (start && d < start) return false;
      if (end && d >= end) return false;
      return true;
    });
  }, [sales, period]);

  const commissionData = useMemo(() => {
    return sellers.map(seller => {
      const sellerSales = filteredSales.filter(s => (s.seller || '').toLowerCase() === seller.name.toLowerCase());
      const totalSold = sellerSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
      const commission = totalSold * (Number(seller.commission_percentage) / 100);
      return { seller, sales: sellerSales, totalSold, commission };
    });
  }, [sellers, filteredSales]);

  const resetForm = () => {
    setFormData({ name: '', commission_percentage: '0' });
    setEditingSeller(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const client = supabaseWithUser();
      const payload = {
        name: formData.name,
        commission_percentage: Number(formData.commission_percentage) || 0,
      };
      if (editingSeller) {
        const { error } = await client.from('sellers').update(payload).eq('id', editingSeller.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Vendedor atualizado!' });
      } else {
        if (!isAdmin && !tenantId) {
          toast({ title: 'Erro', description: 'Empresa não identificada.', variant: 'destructive' });
          return;
        }
        const { error } = await client.from('sellers').insert([{ ...payload, tenant_id: tenantId }]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Vendedor cadastrado!' });
      }
      resetForm();
      fetchAll();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({ name: seller.name, commission_percentage: String(seller.commission_percentage ?? 0) });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!sellerToDelete) return;
    try {
      const client = supabaseWithUser();
      const { error } = await client.from('sellers').delete().eq('id', sellerToDelete.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Vendedor excluído!' });
      setSellerToDelete(null);
      fetchAll();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const generateReceipt = (data: typeof commissionData[number]) => {
    const periodLabel = periodOptions.find(p => p.value === period)?.label || '';
    const rows = data.sales
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .map(s => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(s.sale_date).toLocaleDateString('pt-BR')}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(Number(s.total_price))}</td></tr>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comprovante de Comissão - ${data.seller.name}</title>
      <style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:24px;color:#1f2937;}
      h1{margin:0 0 4px;font-size:22px;} .muted{color:#6b7280;font-size:13px;}
      .box{margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;}
      .row{display:flex;justify-content:space-between;margin:6px 0;}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;}
      th{text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#f9fafb;}
      .total{font-size:18px;font-weight:bold;color:#059669;}
      @media print { .no-print{display:none;} }
      </style></head><body>
      <h1>Comprovante de Comissão</h1>
      <div class="muted">Emitido em ${new Date().toLocaleString('pt-BR')}</div>
      <div class="box">
        <div class="row"><strong>Vendedor:</strong><span>${data.seller.name}</span></div>
        <div class="row"><strong>Período:</strong><span>${periodLabel}</span></div>
        <div class="row"><strong>Comissão:</strong><span>${Number(data.seller.commission_percentage)}%</span></div>
        <div class="row"><strong>Quantidade de vendas:</strong><span>${data.sales.length}</span></div>
        <div class="row"><strong>Total vendido:</strong><span>${fmt(data.totalSold)}</span></div>
        <div class="row"><strong>Comissão a pagar:</strong><span class="total">${fmt(data.commission)}</span></div>
      </div>
      <h3 style="margin-top:24px;">Vendas no período</h3>
      <table><thead><tr><th>Data</th><th style="text-align:right;">Valor</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#9ca3af;">Sem vendas no período</td></tr>'}</tbody></table>
      <div style="margin-top:32px;text-align:center;" class="no-print">
        <button onclick="window.print()" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Imprimir / Salvar PDF</button>
      </div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (loading) {
    return <div className="space-y-6"><h1 className="text-3xl font-bold">Vendedores e Comissões</h1><div className="h-64 bg-muted rounded-lg animate-pulse" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Comissões */}
      <div>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-7 w-7 text-primary" />Comissões</h1>
            <p className="text-muted-foreground">Cálculo automático por vendedor</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {commissionData.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Cadastre vendedores para visualizar comissões.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commissionData.map(({ seller, sales: sSales, totalSold, commission }) => (
              <Card key={seller.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold uppercase shrink-0">
                        {seller.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{seller.name}</div>
                        <div className="text-xs text-muted-foreground">{sSales.length} venda(s)</div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">{Number(seller.commission_percentage)}%</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total vendido</span><span className="font-medium">{fmt(totalSold)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Comissão a pagar</span><span className="font-bold text-emerald-600">{fmt(commission)}</span></div>
                  </div>
                  {commission > 0 && (
                    <Button variant="outline" className="w-full" onClick={() => generateReceipt({ seller, sales: sSales, totalSold, commission })}>
                      <FileText className="h-4 w-4 mr-2" />Gerar Comprovante
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cadastro de Vendedores */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Cadastro de Vendedores</h2>
          <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); setShowForm(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Vendedor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input id="commission" type="number" step="0.01" min="0" max="100" value={formData.commission_percentage} onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })} required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit">{editingSeller ? 'Atualizar' : 'Cadastrar'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Vendedores ({sellers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {sellers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell><Badge variant="secondary">{Number(seller.commission_percentage)}%</Badge></TableCell>
                      <TableCell>{new Date(seller.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(seller)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => setSellerToDelete(seller)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhum vendedor cadastrado.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!sellerToDelete} onOpenChange={() => setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir o vendedor "{sellerToDelete?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellersPage;
