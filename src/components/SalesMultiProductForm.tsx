
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5" />
          <span>Nova Venda (Produtos e Kits)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cliente</Label>
              <SearchableSelect
                options={customers.filter(c => c?.id && c?.name).map(c => ({ value: c.id, label: c.name }))}
                value={customerID} onChange={setCustomerID} placeholder="Selecione o cliente" required
              />
            </div>
            <div>
              <Label>Data da Venda</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
            </div>
            <div>
              <Label>Vendedor</Label>
              <select value={seller} onChange={(e) => setSeller(e.target.value)} className="w-full p-2 border rounded-md" required>
                <option value="">Selecione o vendedor</option>
                {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo de Pagamento</Label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full p-2 border rounded-md">
                <option value="">Selecione o tipo</option>
                {paymentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Itens da Venda</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedProduct = item.product_id ? products.find(p => p.id === item.product_id) : null;
                const selectedKit = item.kit_id ? kits.find(k => k.id === item.kit_id) : null;
                const maxQty = item.item_type === 'product'
                  ? (selectedProduct?.quantity || 999)
                  : (selectedKit ? kitAvailability(selectedKit) : 999);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-3 p-4 border rounded-lg">
                    <div>
                      <Label>Tipo</Label>
                      <select value={item.item_type} onChange={(e) => changeType(index, e.target.value as any)}
                        className="w-full p-2 border rounded-md">
                        <option value="product">Produto</option>
                        <option value="kit">Kit</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>{item.item_type === 'kit' ? 'Kit' : 'Produto'}</Label>
                      {item.item_type === 'product' ? (
                        <SearchableSelect options={productOptions} value={item.product_id || ''}
                          onChange={(v) => handleProductChange(index, v)} placeholder="Selecione o produto" />
                      ) : (
                        <SearchableSelect options={kitOptions} value={item.kit_id || ''}
                          onChange={(v) => handleKitChange(index, v)} placeholder="Selecione o kit" />
                      )}
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" min="1" max={maxQty} value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })} required />
                    </div>
                    <div>
                      <Label>Preço Unit.</Label>
                      <Input type="number" step="0.01" value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })} required />
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <Input type="text" value={`R$ ${item.subtotal.toFixed(2)}`} readOnly className="bg-gray-50" />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}
                        disabled={items.length === 1} className="w-full">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="text-xl font-bold text-foreground">
                  Total da Venda: <span className="text-green-600">R$ {calculateTotal().toFixed(2)}</span>
                </div>
                {paymentReceived && partialPaymentAmount && parseFloat(partialPaymentAmount) > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 text-sm">
                    <div className="px-3 py-2 bg-green-100 text-green-800 rounded-md">
                      <span className="font-medium">Valor Pago:</span> R$ {parseFloat(partialPaymentAmount).toFixed(2)}
                    </div>
                    <div className="px-3 py-2 bg-amber-100 text-amber-800 rounded-md">
                      <span className="font-medium">Pendente:</span> R$ {(calculateTotal() - parseFloat(partialPaymentAmount)).toFixed(2)}
                    </div>
                  </div>
                )}
                {!paymentReceived && (
                  <div className="px-3 py-2 bg-red-100 text-red-800 rounded-md text-sm">
                    <span className="font-medium">Pendente:</span> R$ {calculateTotal().toFixed(2)} (sem recebimento)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <input id="payment_received_multi" type="checkbox" checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <Label htmlFor="payment_received_multi" className="text-sm font-medium cursor-pointer">
                Recebimento confirmado (desmarque se apenas quiser dar baixa no estoque)
              </Label>
            </div>
            {paymentReceived && (
              <div className="mt-4">
                <Label>Valor pago parcialmente (deixe em branco para pagamento total)</Label>
                <Input type="number" step="0.01" value={partialPaymentAmount}
                  onChange={(e) => setPartialPaymentAmount(e.target.value)} placeholder="Valor pago" />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600" disabled={!isFormValid()}>
              Registrar Venda
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SalesMultiProductForm;
