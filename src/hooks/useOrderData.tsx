
import { useState, useEffect } from 'react';
import { ordersApi, orderItemsApi } from '@/services/apiClient';
import { Order, OrderItem } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export const useOrderData = (orderId: string | null) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderData(orderId);
    } else {
      setOrder(null);
      setOrderItems([]);
    }
  }, [orderId]);

  const fetchOrderData = async (id: string) => {
    setLoading(true);
    try {
      console.log('Buscando dados da encomenda:', id);

      // Buscar dados da encomenda
      const orderData = await ordersApi.getById(id);

      // Buscar itens da encomenda
      const itemsData = await orderItemsApi.listByOrder(id);

      setOrder(orderData);
      setOrderItems(itemsData || []);

      console.log('Dados da encomenda carregados:', { orderData, itemsData });
    } catch (error) {
      console.error('Erro ao carregar dados da encomenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da encomenda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { order, orderItems, loading, refetch: () => orderId && fetchOrderData(orderId) };
};
