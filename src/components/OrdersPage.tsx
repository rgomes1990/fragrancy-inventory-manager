
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShoppingBag, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Order, OrderItem } from '@/types/database';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    notes: '',
  });
  const [items, setItems] = useState([{ product_name: '', cost_price: '', quantity: '' }]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as encomendas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const totalAmount = items.reduce((total, item) => {
        if (item.product_name && item.cost_price && item.quantity) {
          return total + (parseFloat(item.cost_price) * parseInt(item.quantity));
        }
        return total;
      }, 0);

      const orderData = {
        customer_name: formData.customer_name,
        notes: formData.notes,
        total_amount: totalAmount,
      };

      let orderId;

      if (editingOrder) {
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', editingOrder.id);

        if (error) throw error;
        orderId = editingOrder.id;

        // Deletar itens existentes
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;
        orderId = data.id;
      }

      // Inserir itens da encomenda
      const orderItems = items
        .filter(item => item.product_name && item.cost_price && item.quantity)
        .map(item => ({
          order_id: orderId,
          product_name: item.product_name,
          cost_price: parseFloat(item.cost_price),
          quantity: parseInt(item.quantity),
          subtotal: parseFloat(item.cost_price) * parseInt(item.quantity),
        }));

      if (orderItems.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: editingOrder ? "Encomenda atualizada com sucesso!" : "Encomenda cadastrada com sucesso!",
      });

      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Erro ao salvar encomenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a encomenda.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name,
      notes: order.notes || '',
    });
    
    if (order.items && order.items.length > 0) {
      setItems(order.items.map(item => ({
        product_name: item.product_name,
        cost_price: item.cost_price.toString(),
        quantity: item.quantity.toString(),
      })));
    } else {
      setItems([{ product_name: '', cost_price: '', quantity: '' }]);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta encomenda?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Encomenda excluída com sucesso!",
      });
      fetchOrders();
    } catch (error) {
      console.error('Erro ao excluir encomenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a encomenda.",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setItems([...items, { product_name: '', cost_price: '', quantity: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      notes: '',
    });
    setItems([{ product_name: '', cost_price: '', quantity: '' }]);
    setEditingOrder(null);
    setShowForm(false);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => {
      if (item.product_name && item.cost_price && item.quantity) {
        return total + (parseFloat(item.cost_price) * parseInt(item.quantity));
      }
      return total;
    }, 0);
  };

  const getTotalOrdersValue = () => {
    return orders.reduce((total, order) => total + order.total_amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Encomendas</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Encomenda
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingOrder ? 'Editar Encomenda' : 'Nova Encomenda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Nome do Cliente</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Observações sobre a encomenda..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Itens da Encomenda</Label>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                    <div>
                      <Label>Nome do Produto</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="Nome do produto"
                      />
                    </div>
                    <div>
                      <Label>Preço de Custo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.cost_price}
                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      {items.length > 1 && (
                        <Button type="button" onClick={() => removeItem(index)} variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {item.cost_price && item.quantity && (
                        <span className="ml-2 text-sm font-medium">
                          Subtotal: R$ {(parseFloat(item.cost_price) * parseInt(item.quantity)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold">
                    Total da Encomenda: R$ {getTotalAmount().toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600">
                  {editingOrder ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5" />
            <span>Lista de Encomendas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-800">
              Valor Total de Todas as Encomendas: R$ {getTotalOrdersValue().toFixed(2)}
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Carregando encomendas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold">R$ {order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default OrdersPage;
