
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ShoppingCart, Calculator, Percent, DollarSign } from 'lucide-react';
import { Product, Customer, Kit } from '@/types/database';
import SearchableSelect from './SearchableSelect';

export interface SaleItem {
  item_type: 'product' | 'kit';
  product_id: string | null;
  kit_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentEntry {
  type: string;
  amount: number;
}

interface Seller { id: string; name: string; }

interface Props {
  customers: Customer[];
  products: Product[];
  kits?: Kit[];
  sellers: Seller[];
  initialKitId?: string | null;
  onSubmit: (saleData: {
    customer_id: string;
    items: SaleItem[];
    sale_date: string;
    seller: string;
    payments: PaymentEntry[];
    discount_amount: number;
    // Compat com lógica antiga (derivados):
    payment_received: boolean;
    partial_payment_amount: number | null;
    payment_type: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

const PAYMENT_TYPES = ['Pix', 'Débito', 'Crédito', 'Dinheiro', 'Crediário'];

const kitAvailability = (kit: Kit): number => {
  if (!kit.kit_items || kit.kit_items.length === 0) return 0;
  let m = Infinity;
  for (const it of kit.kit_items) {
    const stock = it.products?.quantity ?? 0;
    const p = Math.floor(stock / it.quantity);
    if (p < m) m = p;
  }
  return m === Infinity ? 0 : m;
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SalesMultiProductForm = ({ customers, products, kits = [], sellers, initialKitId, onSubmit, onCancel }: Props) => {
  const [customerID, setCustomerID] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [seller, setSeller] = useState('');
  const [items, setItems] = useState<SaleItem[]>([
    { item_type: 'product', product_id: '', kit_id: null, quantity: 1, unit_price: 0, subtotal: 0 }
  ]);

  // Desconto
  const [discountMode, setDiscountMode] = useState<'value' | 'percent'>('value');
  const [discountInput, setDiscountInput] = useState('');

  // Pagamentos múltiplos
  const [payments, setPayments] = useState<PaymentEntry[]>([{ type: 'Pix', amount: 0 }]);

  // Calculadora de parcelas (informativa)
  const [calcInstallments, setCalcInstallments] = useState(2);
  const [calcRate, setCalcRate] = useState(''); // % por parcela ou total — usaremos como % TOTAL da taxa
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    if (initialKitId) {
      const k = kits.find(x => x.id === initialKitId);
      if (k) setItems([{ item_type: 'kit', product_id: null, kit_id: k.id, quantity: 1, unit_price: Number(k.sale_price), subtotal: Number(k.sale_price) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKitId, kits.length]);

  const addItem = () => setItems([...items, { item_type: 'product', product_id: '', kit_id: null, quantity: 1, unit_price: 0, subtotal: 0 }]);
  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const updateItem = (i: number, patch: Partial<SaleItem>) => {
    const arr = [...items];
    arr[i] = { ...arr[i], ...patch };
    arr[i].subtotal = arr[i].quantity * arr[i].unit_price;
    setItems(arr);
  };

  const changeType = (i: number, type: 'product' | 'kit') => {
    const arr = [...items];
    arr[i] = { item_type: type, product_id: null, kit_id: null, quantity: 1, unit_price: 0, subtotal: 0 };
    setItems(arr);
  };

  const handleProductChange = (i: number, productId: string) => {
    const p = products.find(x => x.id === productId);
    if (p) updateItem(i, { product_id: productId, unit_price: Number(p.sale_price) });
  };
  const handleKitChange = (i: number, kitId: string) => {
    const k = kits.find(x => x.id === kitId);
    if (k) updateItem(i, { kit_id: kitId, unit_price: Number(k.sale_price) });
  };

  const subtotal = useMemo(() => items.reduce((t, it) => t + it.subtotal, 0), [items]);

  const discountAmount = useMemo(() => {
    const v = parseFloat(discountInput.replace(',', '.')) || 0;
    if (v <= 0) return 0;
    if (discountMode === 'percent') return Math.min(subtotal, (subtotal * v) / 100);
    return Math.min(subtotal, v);
  }, [discountInput, discountMode, subtotal]);

  const total = Math.max(subtotal - discountAmount, 0);

  const paidSum = useMemo(
    () => payments.filter(p => p.type !== 'Crediário').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );
  const crediarioSum = useMemo(
    () => payments.filter(p => p.type === 'Crediário').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );
  const remaining = Math.max(total - paidSum - crediarioSum, 0);

  // Calculadora informativa
  const calc = useMemo(() => {
    const rate = parseFloat(calcRate.replace(',', '.')) || 0;
    const n = Math.max(1, calcInstallments);
    const fee = (total * rate) / 100;
    const grandTotal = total + fee;
    const perInstallment = grandTotal / n;
    return { rate, n, fee, grandTotal, perInstallment };
  }, [calcRate, calcInstallments, total]);

  const addPayment = () => {
    const rest = Math.max(total - paidSum - crediarioSum, 0);
    setPayments([...payments, { type: 'Pix', amount: rest }]);
  };
  const removePayment = (i: number) => {
    if (payments.length === 1) setPayments([{ type: 'Pix', amount: 0 }]);
    else setPayments(payments.filter((_, idx) => idx !== i));
  };
  const updatePayment = (i: number, patch: Partial<PaymentEntry>) => {
    const arr = [...payments];
    arr[i] = { ...arr[i], ...patch };
    setPayments(arr);
  };
  const fillRemaining = (i: number) => {
    const rest = Math.max(total - paidSum - crediarioSum + (Number(payments[i].amount) || 0), 0);
    updatePayment(i, { amount: rest });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = items.filter(it => it.quantity > 0 && it.unit_price > 0 && (it.product_id || it.kit_id));
    if (valid.length === 0) { alert('Adicione pelo menos um item à venda'); return; }
    if (!seller) { alert('Selecione um vendedor'); return; }
    if (!customerID) { alert('Selecione o cliente'); return; }

    // limpa pagamentos zerados
    const cleanPayments = payments
      .map(p => ({ type: p.type, amount: Number(p.amount) || 0 }))
      .filter(p => p.amount > 0);

    if (paidSum + crediarioSum > total + 0.01) {
      alert('A soma dos pagamentos excede o total da venda.');
      return;
    }

    const partialAmount = paidSum > 0 && paidSum < total ? paidSum : null;
    const firstNonCred = cleanPayments.find(p => p.type !== 'Crediário')?.type
      ?? cleanPayments[0]?.type
      ?? null;

    await onSubmit({
      customer_id: customerID,
      items: valid,
      sale_date: saleDate,
      seller,
      payments: cleanPayments,
      discount_amount: discountAmount,
      payment_received: paidSum > 0,
      partial_payment_amount: partialAmount,
      payment_type: firstNonCred,
    });
  };

  const isFormValid = () => customerID && seller && items.some(it => it.quantity > 0 && it.unit_price > 0 && (it.product_id || it.kit_id));

  const productOptions = products.filter(p => p?.id && p?.name && p.quantity > 0 && !p.is_order_product)
    .map(p => ({ value: p.id, label: `${p.name} (Estoque: ${p.quantity})` }));
  const kitOptions = kits.map(k => ({ value: k.id, label: `${k.name} (Disp: ${kitAvailability(k)})` }));

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-accent/50 to-transparent border-b border-border/60">
        <CardTitle className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                style={{ background: 'var(--gradient-primary)' }}>
            <ShoppingCart className="w-5 h-5" />
          </span>
          <div className="leading-tight">
            <div className="text-xl font-serif">PDV / Caixa</div>
            <div className="text-xs text-muted-foreground font-normal">Registrar nova venda</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Dados gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Cliente</Label>
              <SearchableSelect
                options={customers.filter(c => c?.id && c?.name).map(c => ({ value: c.id, label: c.name }))}
                value={customerID} onChange={setCustomerID} placeholder="Buscar cliente..." required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Data</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required className="rounded-lg" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vendedor</Label>
              <select value={seller} onChange={(e) => setSeller(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" required>
                <option value="">Selecione...</option>
                {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Carrinho */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Carrinho</h3>
              <Button type="button" onClick={addItem} size="sm" variant="ghost"
                className="text-primary hover:text-primary hover:bg-accent rounded-lg h-8">
                <Plus className="w-4 h-4 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="divide-y divide-border/50">
              {items.map((item, index) => {
                const selectedProduct = item.product_id ? products.find(p => p.id === item.product_id) : null;
                const selectedKit = item.kit_id ? kits.find(k => k.id === item.kit_id) : null;
                const maxQty = item.item_type === 'product'
                  ? (selectedProduct?.quantity || 999)
                  : (selectedKit ? kitAvailability(selectedKit) : 999);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 hover:bg-muted/20 transition-colors">
                    <div className="md:col-span-2">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Tipo</Label>
                      <select value={item.item_type} onChange={(e) => changeType(index, e.target.value as any)}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                        <option value="product">🌸 Produto</option>
                        <option value="kit">🎁 Kit</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">{item.item_type === 'kit' ? 'Kit' : 'Produto'}</Label>
                      {item.item_type === 'product' ? (
                        <SearchableSelect options={productOptions} value={item.product_id || ''}
                          onChange={(v) => handleProductChange(index, v)} placeholder="Buscar produto..." />
                      ) : (
                        <SearchableSelect options={kitOptions} value={item.kit_id || ''}
                          onChange={(v) => handleKitChange(index, v)} placeholder="Buscar kit..." />
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Qtd</Label>
                      <Input type="number" min="1" max={maxQty} value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })} required className="rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Preço</Label>
                      <Input type="number" step="0.01" value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })} required className="rounded-lg" />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Total</Label>
                      <div className="h-10 px-3 flex items-center font-semibold text-primary text-sm rounded-lg bg-accent/50">
                        {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}
                        disabled={items.length === 1} className="w-full h-10 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais */}
            <div className="px-5 py-4 bg-gradient-to-r from-accent/40 to-transparent border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-medium text-rose-600">− {fmt(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">{fmt(total)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {paidSum > 0 && (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Pago agora: {fmt(paidSum)}
                  </span>
                )}
                {crediarioSum > 0 && (
                  <span className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full font-medium">
                    Crediário (a receber): {fmt(crediarioSum)}
                  </span>
                )}
                {remaining > 0 && (
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                    Falta lançar: {fmt(remaining)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desconto */}
          <div className="rounded-2xl border border-border/60 p-5 bg-card">
            <h3 className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase mb-3">Desconto</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex rounded-lg border border-input overflow-hidden">
                <button type="button" onClick={() => setDiscountMode('value')}
                  className={`px-3 h-10 text-sm flex items-center gap-1 ${discountMode === 'value' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                  <DollarSign className="w-3.5 h-3.5" /> R$
                </button>
                <button type="button" onClick={() => setDiscountMode('percent')}
                  className={`px-3 h-10 text-sm flex items-center gap-1 ${discountMode === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                  <Percent className="w-3.5 h-3.5" /> %
                </button>
              </div>
              <Input type="number" step="0.01" value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountMode === 'percent' ? 'Ex: 10' : 'Ex: 20,00'}
                className="rounded-lg max-w-[180px]" />
              {discountAmount > 0 && (
                <span className="text-sm text-muted-foreground">= − {fmt(discountAmount)}</span>
              )}
            </div>
          </div>

          {/* Pagamentos */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Formas de pagamento</h3>
              <Button type="button" onClick={addPayment} size="sm" variant="ghost"
                className="text-primary hover:text-primary hover:bg-accent rounded-lg h-8">
                <Plus className="w-4 h-4 mr-1" /> Adicionar pagamento
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {payments.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Forma</Label>
                    <select value={p.type} onChange={(e) => updatePayment(i, { type: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-5">
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Valor {p.type === 'Crediário' && <span className="text-sky-600">(a receber)</span>}
                    </Label>
                    <Input type="number" step="0.01" value={p.amount || ''}
                      onChange={(e) => updatePayment(i, { amount: parseFloat(e.target.value) || 0 })}
                      className="rounded-lg" placeholder="0,00" />
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => fillRemaining(i)}
                      className="h-10 text-xs flex-1" title="Preencher com o saldo">=Falta</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePayment(i)}
                      className="h-10 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Crediário não entra no caixa: a venda vai para <strong>A Receber</strong>.
              </p>
            </div>
          </div>

          {/* Calculadora de parcelas (informativa) */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <button type="button" onClick={() => setShowCalc(!showCalc)}
              className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 hover:bg-muted/50 transition">
              <span className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                <Calculator className="w-4 h-4" /> Calculadora de Parcelas
              </span>
              <span className="text-xs text-muted-foreground">{showCalc ? '−' : '+'}</span>
            </button>
            {showCalc && (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Total da venda</Label>
                    <div className="h-10 px-3 flex items-center font-semibold rounded-lg bg-accent/40">
                      {fmt(total)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Nº de parcelas</Label>
                    <Input type="number" min={1} max={24} value={calcInstallments}
                      onChange={(e) => setCalcInstallments(parseInt(e.target.value) || 1)} className="rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Taxa total (%)</Label>
                    <Input type="number" step="0.01" value={calcRate}
                      onChange={(e) => setCalcRate(e.target.value)}
                      placeholder="Ex: 2,5" className="rounded-lg" />
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm">
                  <strong>{calc.n}x</strong> de <strong>{fmt(calc.perInstallment)}</strong>
                  {' '}= Total: <strong>{fmt(calc.grandTotal)}</strong>
                  {' '}<span className="text-muted-foreground">(taxa: {fmt(calc.fee)})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Informativo — não altera o total da venda nem é salvo.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg">Cancelar</Button>
            <Button type="submit" disabled={!isFormValid()}
              className="rounded-lg text-white shadow-md hover:shadow-lg transition-shadow"
              style={{ background: 'var(--gradient-primary)' }}>
              Registrar Venda
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SalesMultiProductForm;
