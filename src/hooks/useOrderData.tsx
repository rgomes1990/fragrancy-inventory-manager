
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // Buscar dados da encomenda
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      // Buscar itens da encomenda
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

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
