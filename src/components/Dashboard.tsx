
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  lowStockProducts: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
  });
  
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar estatísticas
      const [productsRes, customersRes, salesRes, lowStockRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('sales').select('total_price', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).lte('quantity', 5)
      ]);

      // Calcular receita total
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_price');
      
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;

      // Buscar vendas recentes
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProducts: productsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalSales: salesRes.count || 0,
        totalRevenue,
        lowStockProducts: lowStockRes.count || 0,
      });

      setRecentSales(recentSalesData || []);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total de Produtos',
      value: stats.totalProducts,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total de Clientes',
      value: stats.totalCustomers,
      icon: Users,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total de Vendas',
      value: stats.totalSales,
      icon: ShoppingCart,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className={`${card.bgColor} border-0 shadow-md hover:shadow-lg transition-shadow duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas e vendas recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de estoque baixo */}
        {stats.lowStockProducts > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Alerta de Estoque</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700">
                {stats.lowStockProducts} produto(s) com estoque baixo (≤ 5 unidades)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Vendas recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{sale.products?.name}</p>
                      <p className="text-xs text-gray-500">{sale.customers?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">R$ {Number(sale.total_price).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma venda encontrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
