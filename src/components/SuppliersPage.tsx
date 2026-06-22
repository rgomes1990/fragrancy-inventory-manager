import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, MessageCircle, Truck, ClipboardList, Package, CheckCircle2 } from 'lucide-react';
import { suppliersApi, supplierOrdersApi, supplierOrderItemsApi, productsApi, stockEntriesApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Supplier {
  id: string;
  tenant_id: string | null;
  name: string;
  whatsapp: string | null;
  email: string | null;
  cnpj: string | null;
  delivery_days: number | null;
  min_order_amount: number | null;
  default_message: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SupplierOrder {
  id: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  order_date: string;
  received_date: string | null;
  tenant_id: string | null;
  supplier_name?: string;
  items?: SupplierOrderItem[];
  supplier?: Supplier;
}

interface SupplierOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

interface ProductRow {
  id: string;
  name: string;
  cost_price: number;
}

const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

const SuppliersPage = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);

  // supplier form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', whatsapp: '', email: '', cnpj: '',
    delivery_days: '0', min_order_amount: '0',
    default_message: 'Olá! Gostaria de fazer um novo pedido.', notes: '',
  });

  // order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{ product_id: string; product_name: string; quantity: string; unit_cost: string }[]>([
    { product_id: '', product_name: '', quantity: '1', unit_cost: '0' },
  ]);
  const [orderToDelete, setOrderToDelete] = useState<SupplierOrder | null>(null);

  const fetchAll = async () => {
    try {
      const [sD, oD, pD] = await Promise.all([
        suppliersApi.list(),
        supplierOrdersApi.list(),
        productsApi.list(),
      ]);

      const suppliersData = (sD || []) as Supplier[];

      // For each order, fetch its items and attach supplier info
      const allItems = await supplierOrderItemsApi.list();
      const items = (allItems || []) as SupplierOrderItem[];

      const ordersWithItems = (oD || []).map((o: any) => ({
        ...o,
        items: items.filter(it => it.order_id === o.id),
        supplier: suppliersData.find(s => s.id === o.supplier_id),
      })) as SupplierOrder[];

      setSuppliers(suppliersData);
      setOrders(ordersWithItems);
      setProducts((pD || []) as ProductRow[]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível carregar fornecedores.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId !== undefined) fetchAll();
  }, [tenantId, isAdmin]);

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '', whatsapp: '', email: '', cnpj: '',
      delivery_days: '0', min_order_amount: '0',
      default_message: 'Olá! Gostaria de fazer um novo pedido.', notes: '',
    });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: supplierForm.name,
        whatsapp: supplierForm.whatsapp || null,
        email: supplierForm.email || null,
        cnpj: supplierForm.cnpj || null,
        delivery_days: Number(supplierForm.delivery_days) || 0,
        min_order_amount: Number(supplierForm.min_order_amount) || 0,
        default_message: supplierForm.default_message || null,
        notes: supplierForm.notes || null,
      };
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, payload);
        toast({ title: 'Sucesso', description: 'Fornecedor atualizado!' });
      } else {
        if (!isAdmin && !tenantId) {
          toast({ title: 'Erro', description: 'Empresa não identificada.', variant: 'destructive' });
          return;
        }
        await suppliersApi.create({ ...payload, tenant_id: tenantId });
        toast({ title: 'Sucesso', description: 'Fornecedor cadastrado!' });
      }
      resetSupplierForm();
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  const handleEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      cnpj: s.cnpj || '',
      delivery_days: String(s.delivery_days ?? 0),
      min_order_amount: String(s.min_order_amount ?? 0),
      default_message: s.default_message || '',
      notes: s.notes || '',
    });
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await suppliersApi.delete(supplierToDelete.id);
      toast({ title: 'Sucesso', description: 'Fornecedor excluído!' });
      setSupplierToDelete(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const openWhatsApp = (s: Supplier, customMsg?: string) => {
    const phone = onlyDigits(s.whatsapp || '');
    if (!phone) {
      toast({ title: 'WhatsApp não cadastrado', description: 'Adicione o número do fornecedor.', variant: 'destructive' });
      return;
    }
    const msg = encodeURIComponent(customMsg || s.default_message || 'Olá!');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // ORDER
  const resetOrderForm = () => {
    setOrderSupplierId('');
    setOrderNotes('');
    setOrderItems([{ product_id: '', product_name: '', quantity: '1', unit_cost: '0' }]);
    setShowOrderForm(false);
  };

  const updateItem = (idx: number, patch: Partial<{ product_id: string; product_name: string; quantity: string; unit_cost: string }>) => {
    setOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const onPickProduct = (idx: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    updateItem(idx, {
      product_id: productId,
      product_name: prod?.name || '',
      unit_cost: prod ? String(prod.cost_price) : '0',
    });
  };

  const orderTotal = useMemo(() =>
    orderItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0),
  [orderItems]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      toast({ title: 'Selecione um fornecedor', variant: 'destructive' });
      return;
    }
    const validItems = orderItems.filter(it => it.product_name.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: 'Adicione ao menos um item', variant: 'destructive' });
      return;
    }
    try {
      const orderData = await supplierOrdersApi.create({
        supplier_id: orderSupplierId,
        tenant_id: tenantId,
        status: 'aberto',
        total_amount: orderTotal,
        notes: orderNotes || null,
      });

      for (const it of validItems) {
        await supplierOrderItemsApi.create({
          order_id: orderData.id,
          product_id: it.product_id || null,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          subtotal: Number(it.quantity) * Number(it.unit_cost),
        });
      }

      toast({ title: 'Sucesso', description: 'Pedido registrado!' });
      resetOrderForm();
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível registrar o pedido.', variant: 'destructive' });
    }
  };

  const buildOrderMessage = (o: SupplierOrder) => {
    const lines = (o.items || []).map(it => `• ${it.product_name} — ${it.quantity} x ${fmt(it.unit_cost)} = ${fmt(it.subtotal)}`).join('\n');
    const base = o.supplier?.default_message ? `${o.supplier.default_message}\n\n` : '';
    return `${base}*Novo Pedido*\n${lines}\n\n*Total:* ${fmt(o.total_amount)}${o.notes ? `\n\nObs: ${o.notes}` : ''}`;
  };

  const sendOrderWhatsApp = (o: SupplierOrder) => {
    if (!o.supplier) return;
    openWhatsApp(o.supplier, buildOrderMessage(o));
  };

  const completeOrder = async (o: SupplierOrder) => {
    try {
      // create stock entries for items with product_id
      const stockEntries = (o.items || [])
        .filter(it => it.product_id)
        .map(it => ({
          product_id: it.product_id,
          quantity: Math.round(Number(it.quantity)),
          unit_cost: Number(it.unit_cost),
          notes: `Pedido fornecedor: ${o.supplier?.name || ''}`,
          tenant_id: tenantId,
        }));
      for (const entry of stockEntries) {
        await stockEntriesApi.create(entry);
      }

      await supplierOrdersApi.update(o.id, {
        status: 'concluido', received_date: new Date().toISOString(),
      });

      toast({ title: 'Pedido concluído', description: stockEntries.length > 0 ? 'Entrada de estoque registrada automaticamente.' : 'Status atualizado.' });
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível concluir o pedido.', variant: 'destructive' });
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await supplierOrdersApi.delete(orderToDelete.id);
      toast({ title: 'Pedido excluído' });
      setOrderToDelete(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="space-y-6"><h1 className="text-3xl font-bold">Fornecedores</h1><div className="h-64 bg-muted rounded-lg animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Truck className="h-7 w-7 text-primary" />Fornecedores</h1>
        <p className="text-muted-foreground">Cadastro, contato via WhatsApp e acompanhamento de pedidos</p>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-2" />Fornecedores</TabsTrigger>
          <TabsTrigger value="orders"><ClipboardList className="h-4 w-4 mr-2" />Pedidos</TabsTrigger>
        </TabsList>

        {/* SUPPLIERS TAB */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showSupplierForm} onOpenChange={(o) => { if (!o) resetSupplierForm(); setShowSupplierForm(o); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSupplierSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>WhatsApp (com DDD)</Label>
                      <Input placeholder="5511999999999" value={supplierForm.whatsapp} onChange={(e) => setSupplierForm({ ...supplierForm, whatsapp: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CNPJ</Label>
                      <Input value={supplierForm.cnpj} onChange={(e) => setSupplierForm({ ...supplierForm, cnpj: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prazo de entrega (dias)</Label>
                      <Input type="number" min="0" value={supplierForm.delivery_days} onChange={(e) => setSupplierForm({ ...supplierForm, delivery_days: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pedido mínimo (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={supplierForm.min_order_amount} onChange={(e) => setSupplierForm({ ...supplierForm, min_order_amount: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mensagem padrão (WhatsApp)</Label>
                    <Textarea rows={3} value={supplierForm.default_message} onChange={(e) => setSupplierForm({ ...supplierForm, default_message: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observação</Label>
                    <Textarea rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetSupplierForm}>Cancelar</Button>
                    <Button type="submit">{editingSupplier ? 'Atualizar' : 'Cadastrar'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {suppliers.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.name}</div>
                        {s.cnpj && <div className="text-xs text-muted-foreground">CNPJ: {s.cnpj}</div>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => handleEditSupplier(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => setSupplierToDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      {s.whatsapp && <div className="text-muted-foreground">WhatsApp: <span className="text-foreground">{s.whatsapp}</span></div>}
                      {s.email && <div className="text-muted-foreground truncate">Email: <span className="text-foreground">{s.email}</span></div>}
                      <div className="flex justify-between"><span className="text-muted-foreground">Prazo</span><Badge variant="secondary">{s.delivery_days || 0} dias</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pedido mínimo</span><span className="font-medium">{fmt(Number(s.min_order_amount || 0))}</span></div>
                    </div>
                    {s.default_message && (
                      <div className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 border-primary/30 pl-2">"{s.default_message}"</div>
                    )}
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => openWhatsApp(s)}>
                      <MessageCircle className="h-4 w-4 mr-2" />Enviar WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showOrderForm} onOpenChange={(o) => { if (!o) resetOrderForm(); setShowOrderForm(o); }}>
              <DialogTrigger asChild>
                <Button disabled={suppliers.length === 0}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Pedido ao Fornecedor</DialogTitle></DialogHeader>
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Fornecedor *</Label>
                    <Select value={orderSupplierId} onValueChange={setOrderSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Itens *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setOrderItems([...orderItems, { product_id: '', product_name: '', quantity: '1', unit_cost: '0' }])}>
                        <Plus className="h-3 w-3 mr-1" />Adicionar
                      </Button>
                    </div>
                    {orderItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <Label className="text-xs">Produto</Label>
                          <Select value={it.product_id || 'custom'} onValueChange={(v) => v === 'custom' ? updateItem(idx, { product_id: '' }) : onPickProduct(idx, v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">— Livre (digitar) —</SelectItem>
                              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {!it.product_id && (
                            <Input className="mt-1" placeholder="Nome do item" value={it.product_name} onChange={(e) => updateItem(idx, { product_name: e.target.value })} />
                          )}
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <Label className="text-xs">Qtd</Label>
                          <Input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                        </div>
                        <div className="col-span-5 md:col-span-3 space-y-1">
                          <Label className="text-xs">Custo unit.</Label>
                          <Input type="number" step="0.01" min="0" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: e.target.value })} />
                        </div>
                        <div className="col-span-3 md:col-span-2 flex flex-col items-end">
                          <div className="text-xs text-muted-foreground">Subtotal</div>
                          <div className="font-medium text-sm">{fmt((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0))}</div>
                          {orderItems.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 mt-1" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end text-lg font-bold pt-2">Total: {fmt(orderTotal)}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observação</Label>
                    <Textarea rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetOrderForm}>Cancelar</Button>
                    <Button type="submit">Registrar Pedido</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Pedidos ({orders.length})</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum pedido registrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{new Date(o.order_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">{o.supplier_name || o.supplier?.name || '—'}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-[260px]">
                            {(o.items || []).map(it => `${it.quantity}x ${it.product_name}`).join(', ')}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{fmt(Number(o.total_amount))}</TableCell>
                        <TableCell>
                          {o.status === 'concluido'
                            ? <Badge className="bg-emerald-500 hover:bg-emerald-500">Concluído</Badge>
                            : <Badge variant="secondary">Aberto</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600/50" onClick={() => sendOrderWhatsApp(o)} title="Enviar via WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {o.status !== 'concluido' && (
                              <Button size="sm" variant="outline" onClick={() => completeOrder(o)} title="Marcar como concluído e dar entrada no estoque">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => setOrderToDelete(o)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir o fornecedor "{supplierToDelete?.name}"? Os pedidos vinculados também serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não afeta o estoque já lançado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersPage;
