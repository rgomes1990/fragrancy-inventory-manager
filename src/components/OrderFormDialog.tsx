
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Order, OrderItem } from '@/types/database';
import { useOrderData } from '@/hooks/useOrderData';

interface OrderFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSaved: () => void;
  editingOrder: Order | null;
}

interface FormOrderItem {
  product_name: string;
  cost_price: number;
  quantity: number;
  subtotal: number;
}

const OrderFormDialog = ({ isOpen, onClose, onOrderSaved, editingOrder }: OrderFormDialogProps) => {
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormOrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { order, orderItems, loading: loadingOrderData } = useOrderData(editingOrder?.id || null);

  // Resetar formulário quando o dialog é aberto/fechado
  useEffect(() => {
    if (isOpen && !editingOrder) {
      // Modo criação
      setCustomerName('');
      setNotes('');
      setItems([{ product_name: '', cost_price: 0, quantity: 1, subtotal: 0 }]);
    }
  }, [isOpen, editingOrder]);

  // Carregar dados quando estiver editando
  useEffect(() => {
    if (editingOrder && order && orderItems.length >= 0) {
      console.log('Carregando dados para edição:', { order, orderItems });
      setCustomerName(order.customer_name);
      setNotes(order.notes || '');
      
      if (orderItems.length > 0) {
        setItems(orderItems.map(item => ({
          product_name: item.product_name,
          cost_price: item.cost_price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })));
      } else {
        setItems([{ product_name: '', cost_price: 0, quantity: 1, subtotal: 0 }]);
      }
    }
  }, [editingOrder, order, orderItems]);

  const addItem = () => {
    setItems([...items, { product_name: '', cost_price: 0, quantity: 1, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof FormOrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular subtotal se quantidade ou preço mudaram
    if (field === 'quantity' || field === 'cost_price') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].cost_price;
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalAmount = calculateTotal();

      if (editingOrder) {
        // Atualizar encomenda existente
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            customer_name: customerName,
            notes: notes,
            total_amount: totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingOrder.id);

        if (orderError) throw orderError;

        // Remover itens antigos
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', editingOrder.id);

        if (deleteError) throw deleteError;

        // Adicionar novos itens
        const orderItemsToInsert = items.map(item => ({
          order_id: editingOrder.id,
          product_name: item.product_name,
          cost_price: item.cost_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;

        toast({
          title: "Sucesso",
          description: "Encomenda atualizada com sucesso!",
        });
      } else {
        // Criar nova encomenda
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_name: customerName,
            notes: notes,
            total_amount: totalAmount,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItemsToInsert = items.map(item => ({
          order_id: orderData.id,
          product_name: item.product_name,
          cost_price: item.cost_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;

        toast({
          title: "Sucesso",
          description: "Encomenda criada com sucesso!",
        });
      }

      onOrderSaved();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar encomenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a encomenda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
          </DialogTitle>
        </DialogHeader>

        {loadingOrderData ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome do Cliente</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Itens da Encomenda</h3>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label>Produto</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="Nome do produto"
                        required
                      />
                    </div>
                    <div>
                      <Label>Preço de Custo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.cost_price}
                        onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.subtotal.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-right mt-4">
                <div className="text-lg font-semibold">
                  Total: R$ {calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editingOrder ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormDialog;
