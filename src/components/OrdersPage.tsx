
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShoppingBag, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Order } from '@/types/database';
import OrderFormDialog from './OrderFormDialog';
import { useAuth } from '@/contexts/AuthContext';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const { setUserContext } = useAuth();

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

  const handleEdit = (order: Order) => {
    console.log('Editando encomenda:', order);
    setEditingOrder(order);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta encomenda?')) return;

    try {
      await setUserContext();
      
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

  const handleOrderSaved = () => {
    fetchOrders();
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingOrder(null);
  };

  const getTotalOrdersValue = () => {
    return orders.reduce((total, order) => total + order.total_amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Encomendas</h1>
        <Button 
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Encomenda
        </Button>
      </div>

      <OrderFormDialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        onOrderSaved={handleOrderSaved}
        editingOrder={editingOrder}
      />

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
