
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
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
    payment_received: boolean;
    partial_payment_amount: number | null;
    payment_type: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

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

const SalesMultiProductForm = ({ customers, products, kits = [], sellers, initialKitId, onSubmit, onCancel }: Props) => {
  const [customerID, setCustomerID] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [seller, setSeller] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [items, setItems] = useState<SaleItem[]>([
    { item_type: 'product', product_id: '', kit_id: null, quantity: 1, unit_price: 0, subtotal: 0 }
  ]);

  const paymentTypes = ['Débito', 'Crédito', 'Pix', 'Link'];

  // Preload kit if passed via URL
  useEffect(() => {
    if (initialKitId) {
      const k = kits.find(x => x.id === initialKitId);
      if (k) {
        setItems([{ item_type: 'kit', product_id: null, kit_id: k.id, quantity: 1, unit_price: Number(k.sale_price), subtotal: Number(k.sale_price) }]);
      }
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

  const calculateTotal = () => items.reduce((t, it) => t + it.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = items.filter(it => it.quantity > 0 && it.unit_price > 0 && (it.product_id || it.kit_id));
    if (valid.length === 0) { alert('Adicione pelo menos um item à venda'); return; }
    if (!seller) { alert('Selecione um vendedor'); return; }
    const partialAmount = partialPaymentAmount ? parseFloat(partialPaymentAmount) : null;
    await onSubmit({
      customer_id: customerID,
      items: valid,
      sale_date: saleDate,
      seller,
      payment_received: paymentReceived,
      partial_payment_amount: partialAmount,
      payment_type: paymentType || null,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div>
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pagamento</Label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione...</option>
                {paymentTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
            <div className="px-5 py-4 bg-gradient-to-r from-accent/40 to-transparent border-t border-border/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">R$ {calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">R$ {calculateTotal().toFixed(2)}</span>
              </div>
              {paymentReceived && partialPaymentAmount && parseFloat(partialPaymentAmount) > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Pago: R$ {parseFloat(partialPaymentAmount).toFixed(2)}
                  </span>
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                    Pendente: R$ {(calculateTotal() - parseFloat(partialPaymentAmount)).toFixed(2)}
                  </span>
                </div>
              )}
              {!paymentReceived && (
                <div className="mt-3">
                  <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                    Pendente: R$ {calculateTotal().toFixed(2)} (sem recebimento)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pagamento */}
          <div className="rounded-2xl border border-border/60 p-5 bg-card space-y-4">
            <h3 className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Recebimento</h3>
            <div className="flex items-center gap-3">
              <input id="payment_received_multi" type="checkbox" checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
              <Label htmlFor="payment_received_multi" className="text-sm cursor-pointer">
                Recebimento confirmado <span className="text-muted-foreground">(desmarque apenas para dar baixa no estoque)</span>
              </Label>
            </div>
            {paymentReceived && (
              <div>
                <Label className="text-xs text-muted-foreground">Valor pago parcialmente (deixe em branco para pagamento total)</Label>
                <Input type="number" step="0.01" value={partialPaymentAmount}
                  onChange={(e) => setPartialPaymentAmount(e.target.value)} placeholder="Valor pago" className="rounded-lg max-w-xs" />
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
