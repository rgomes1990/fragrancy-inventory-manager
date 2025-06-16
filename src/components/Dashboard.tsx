
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  totalInvestment: number;
  totalSaleValue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalInvestment: 0,
    totalSaleValue: 0,
  });
  
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [stockFilter]);

  const fetchDashboardData = async () => {
    try {
      // Buscar produtos com filtro de estoque se aplicável
      let productsQuery = supabase.from('products').select('id, cost_price, sale_price, quantity');
      if (stockFilter === 'in-stock') {
        productsQuery = productsQuery.gt('quantity', 0);
      } else if (stockFilter === 'out-of-stock') {
        productsQuery = productsQuery.eq('quantity', 0);
      }

      // Buscar estatísticas base
      const [productsRes, customersRes, salesRes] = await Promise.all([
        productsQuery,
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('sales').select('total_price', { count: 'exact' })
      ]);

      // Calcular receita total
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_price');
      
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;

      // Buscar TODOS os produtos para calcular o investimento total (sempre todos, independente do filtro)
      const { data: allProductsData } = await supabase
        .from('products')
        .select('cost_price, sale_price, quantity');
      
      // Investimento Total: soma de (preço de custo × quantidade) de TODOS os produtos
      const totalInvestment = allProductsData?.reduce((sum, product) => {
        return sum + (Number(product.cost_price) * Number(product.quantity));
      }, 0) || 0;
      
      // Valor em Estoque: soma de (preço de venda × quantidade) dos produtos filtrados
      const productsData = productsRes.data || [];
      const totalSaleValue = productsData.reduce((sum, product) => {
        return sum + (Number(product.sale_price) * Number(product.quantity));
      }, 0);

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
        totalProducts: productsData.length,
        totalCustomers: customersRes.count || 0,
        totalSales: salesRes.count || 0,
        totalRevenue,
        totalInvestment,
        totalSaleValue,
      });

      setRecentSales(recentSalesData || []);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStatsCards = () => {
    const baseCards = [
      {
        title: stockFilter === 'all' ? 'Total de Produtos' : 
               stockFilter === 'in-stock' ? 'Produtos com Estoque' : 'Produtos sem Estoque',
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
      {
        title: 'Investimento Total',
        value: `R$ ${stats.totalInvestment.toFixed(2)}`,
        icon: TrendingUp,
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
      },
      {
        title: stockFilter === 'all' ? 'Valor em Estoque' :
               stockFilter === 'in-stock' ? 'Valor Produtos c/ Estoque' : 'Valor Produtos s/ Estoque',
        value: `R$ ${stats.totalSaleValue.toFixed(2)}`,
        icon: Package,
        color: 'from-indigo-500 to-indigo-600',
        bgColor: 'bg-indigo-50',
      },
    ];

    return baseCards;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <div className="flex items-center space-x-4">
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              <SelectItem value="in-stock">Com estoque</SelectItem>
              <SelectItem value="out-of-stock">Sem estoque</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredStatsCards().map((card, index) => {
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

      {/* Vendas recentes */}
      <div className="grid grid-cols-1 gap-6">
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
