import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PackagePlus } from 'lucide-react';
import { supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';

interface StockEntryDialogProps {
  products: Product[];
  onSuccess: () => void;
}

const StockEntryDialog: React.FC<StockEntryDialogProps> = ({ products, onSuccess }) => {
  const { getTenantIdForInsert, isAdmin } = useTenantFilter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !unitCost) return;

    try {
      setSubmitting(true);
      const tenantId = getTenantIdForInsert();
      if (!isAdmin && !tenantId) {
        toast({ title: "Erro", description: "Empresa não identificada.", variant: "destructive" });
        return;
      }

      const { error } = await supabaseWithUser()
        .from('stock_entries')
        .insert([{
          product_id: productId,
          quantity: parseInt(quantity),
          unit_cost: parseFloat(unitCost),
          notes: notes || null,
          tenant_id: tenantId,
        }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Entrada de estoque registrada! Custo médio recalculado automaticamente." });
      setProductId('');
      setQuantity('');
      setUnitCost('');
      setNotes('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({ title: "Erro", description: "Não foi possível registrar a entrada de estoque.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Only show non-order products
  const stockProducts = products.filter(p => !p.is_order_product);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PackagePlus className="w-4 h-4 mr-2" />
          Entrada de Estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entrada de Estoque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stock-product">Produto</Label>
            <select
              id="stock-product"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find(pr => pr.id === e.target.value);
                if (p) setUnitCost(p.cost_price.toString());
              }}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Selecione um produto</option>
              {stockProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Estoque: {p.quantity})</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
              <p>Custo atual: <strong>R$ {Number(selectedProduct.cost_price).toFixed(2)}</strong></p>
              <p>Estoque atual: <strong>{selectedProduct.quantity}</strong></p>
              {quantity && unitCost && (
                <>
                  <hr className="my-2" />
                  <p className="text-foreground font-medium">
                    Novo custo médio estimado: <strong>R$ {
                      ((selectedProduct.quantity * Number(selectedProduct.cost_price) + parseInt(quantity) * parseFloat(unitCost)) /
                      (selectedProduct.quantity + parseInt(quantity))).toFixed(2)
                    }</strong>
                  </p>
                  <p className="text-foreground">
                    Novo estoque: <strong>{selectedProduct.quantity + parseInt(quantity)}</strong>
                  </p>
                </>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="stock-quantity">Quantidade</Label>
            <Input
              id="stock-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="stock-unit-cost">Custo Unitário (R$)</Label>
            <Input
              id="stock-unit-cost"
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="stock-notes">Observações</Label>
            <Textarea
              id="stock-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Compra fornecedor X, lote 123..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockEntryDialog;
