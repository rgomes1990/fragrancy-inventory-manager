import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Kit, Product } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import SearchableSelect from './SearchableSelect';

interface KitFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kit?: Kit | null;
  products: Product[];
  onSaved: () => void;
}

interface ItemRow { product_id: string; quantity: number }

const KitFormDialog: React.FC<KitFormDialogProps> = ({ open, onOpenChange, kit, products, onSaved }) => {
  const { getTenantIdForInsert, isAdmin } = useTenantFilter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (kit) {
        setName(kit.name);
        setDescription(kit.description || '');
        setSalePrice(String(kit.sale_price));
        setItems(
          (kit.kit_items && kit.kit_items.length > 0)
            ? kit.kit_items.map(ki => ({ product_id: ki.product_id, quantity: ki.quantity }))
            : [{ product_id: '', quantity: 1 }]
        );
      } else {
        setName(''); setDescription(''); setSalePrice('');
        setItems([{ product_id: '', quantity: 1 }]);
      }
    }
  }, [open, kit]);

  const stockProducts = products.filter(p => !p.is_order_product);

  const suggestSum = () => {
    const sum = items.reduce((s, it) => {
      const p = products.find(x => x.id === it.product_id);
      return s + (p ? Number(p.sale_price) * it.quantity : 0);
    }, 0);
    setSalePrice(sum.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (!name.trim() || validItems.length === 0 || !salePrice) {
      toast({ title: 'Erro', description: 'Preencha nome, preço e ao menos 1 item.', variant: 'destructive' });
      return;
    }
    const tenantId = getTenantIdForInsert();
    if (!isAdmin && !tenantId) {
      toast({ title: 'Erro', description: 'Empresa não identificada.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const client = supabaseWithUser();
      let kitId = kit?.id;

      if (kit) {
        const { error } = await client.from('kits').update({
          name, description: description || null, sale_price: parseFloat(salePrice),
        }).eq('id', kit.id);
        if (error) throw error;
        await client.from('kit_items').delete().eq('kit_id', kit.id);
      } else {
        const { data, error } = await client.from('kits').insert([{
          name, description: description || null, sale_price: parseFloat(salePrice),
          tenant_id: tenantId, active: true,
        }]).select('id').single();
        if (error) throw error;
        kitId = data!.id;
      }

      const { error: itemsError } = await client.from('kit_items').insert(
        validItems.map(i => ({ kit_id: kitId!, product_id: i.product_id, quantity: i.quantity }))
      );
      if (itemsError) throw itemsError;

      toast({ title: 'Sucesso', description: kit ? 'Kit atualizado!' : 'Kit criado!' });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível salvar o kit.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kit ? 'Editar Kit' : 'Criar Novo Kit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do Kit</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Kit Dia das Mães" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes / composição do kit..." rows={2} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base">Itens do Kit</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md">
                  <div className="col-span-12 sm:col-span-7">
                    <Label className="text-xs">Produto</Label>
                    <SearchableSelect
                      options={stockProducts.map(p => ({ value: p.id, label: `${p.name} (Est: ${p.quantity})` }))}
                      value={it.product_id}
                      onChange={(val) => {
                        const arr = [...items]; arr[idx].product_id = val; setItems(arr);
                      }}
                      placeholder="Selecione produto"
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-3">
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min="1" value={it.quantity}
                      onChange={(e) => { const arr = [...items]; arr[idx].quantity = parseInt(e.target.value) || 1; setItems(arr); }} />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex">
                    <Button type="button" variant="outline" size="sm" className="w-full"
                      onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== idx) : items)}
                      disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Preço de Venda do Kit (R$)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={suggestSum}>Sugerir soma dos itens</Button>
            </div>
            <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : (kit ? 'Salvar' : 'Criar Kit')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KitFormDialog;
