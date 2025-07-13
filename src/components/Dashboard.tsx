import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Trophy, Crown, UserCheck } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  totalCostSum: number;
  totalSaleSum: number;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface TopCustomer {
  customer_name: string;
  total_purchases: number;
  total_spent: number;
}

interface UserSales {
  ana_paula_sales: number;
  ana_paula_revenue: number;
  danilo_sales: number;
  danilo_revenue: number;
  rogerio_sales: number;
  rogerio_revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCostSum: 0,
    totalSaleSum: 0,
  });
  
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [userSales, setUserSales] = useState<UserSales>({
    ana_paula_sales: 0,
    ana_paula_revenue: 0,
    danilo_sales: 0,
    danilo_revenue: 0,
    rogerio_sales: 0,
    rogerio_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [stockFilter]);

  const fetchDashboardData = async () => {
    try {
      let productsQuery = supabase.from('products').select('id, cost_price, sale_price, quantity');
      if (stockFilter === 'in-stock') {
        productsQuery = productsQuery.gt('quantity', 0);
      } else if (stockFilter === 'out-of-stock') {
        productsQuery = productsQuery.eq('quantity', 0);
      }

      const [productsRes, customersRes, salesRes] = await Promise.all([
        productsQuery,
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('sales').select('total_price', { count: 'exact' })
      ]);

      const { data: salesData } = await supabase
        .from('sales')
        .select('total_price');
      
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;

      const { data: allProductsData } = await supabase
        .from('products')
        .select('cost_price, sale_price, quantity');
      
      const totalCostSum = allProductsData?.reduce((sum, product) => {
        return sum + Number(product.cost_price);
      }, 0) || 0;
      
      const totalSaleSum = allProductsData?.reduce((sum, product) => {
        return sum + Number(product.sale_price);
      }, 0) || 0;

      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: topProductsData } = await supabase
        .from('sales')
        .select(`
          products(name),
          quantity,
          total_price
        `)
        .not('products', 'is', null);

      const { data: topCustomersData } = await supabase
        .from('sales')
        .select(`
          customers(name),
          quantity,
          total_price
        `)
        .not('customers', 'is', null);

      // Buscar vendas por usuário do audit_log
      const { data: auditData } = await supabase
        .from('audit_log')
        .select('user_name, new_values')
        .eq('table_name', 'sales')
        .eq('operation', 'INSERT');

      let anaPaulaSales = 0;
      let anaPaulaRevenue = 0;
      let daniloSales = 0;
      let daniloRevenue = 0;
      let rogerioSales = 0;
      let rogerioRevenue = 0;

      auditData?.forEach((audit) => {
        if (audit.new_values && typeof audit.new_values === 'object') {
          const newValues = audit.new_values as any;
          const revenue = Number(newValues.total_price) || 0;
          
          if (audit.user_name === 'Ana Paula') {
            anaPaulaSales += 1;
            anaPaulaRevenue += revenue;
          } else if (audit.user_name === 'Danilo') {
            daniloSales += 1;
            daniloRevenue += revenue;
          } else if (audit.user_name === 'Rogério') {
            rogerioSales += 1;
            rogerioRevenue += revenue;
          }
        }
      });

      const productSales = topProductsData?.reduce((acc, sale) => {
        const productName = sale.products?.name || 'Produto desconhecido';
        if (!acc[productName]) {
          acc[productName] = {
            product_name: productName,
            total_quantity: 0,
            total_revenue: 0
          };
        }
        acc[productName].total_quantity += sale.quantity;
        acc[productName].total_revenue += Number(sale.total_price);
        return acc;
      }, {} as Record<string, TopProduct>) || {};

      const customerPurchases = topCustomersData?.reduce((acc, sale) => {
        const customerName = sale.customers?.name || 'Cliente desconhecido';
        if (!acc[customerName]) {
          acc[customerName] = {
            customer_name: customerName,
            total_purchases: 0,
            total_spent: 0
          };
        }
        acc[customerName].total_purchases += sale.quantity;
        acc[customerName].total_spent += Number(sale.total_price);
        return acc;
      }, {} as Record<string, TopCustomer>) || {};

      const top5Products = Object.values(productSales)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

      const top5Customers = Object.values(customerPurchases)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      const productsData = productsRes.data || [];

      setStats({
        totalProducts: productsData.length,
        totalCustomers: customersRes.count || 0,
        totalSales: salesRes.count || 0,
        totalRevenue,
        totalCostSum,
        totalSaleSum,
      });

      setRecentSales(recentSalesData || []);
      setTopProducts(top5Products);
      setTopCustomers(top5Customers);
      setUserSales({
        ana_paula_sales: anaPaulaSales,
        ana_paula_revenue: anaPaulaRevenue,
        danilo_sales: daniloSales,
        danilo_revenue: daniloRevenue,
        rogerio_sales: rogerioSales,
        rogerio_revenue: rogerioRevenue,
      });
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
        title: 'Soma Preços de Custo',
        value: `R$ ${stats.totalCostSum.toFixed(2)}`,
        icon: TrendingUp,
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
      },
      {
        title: 'Soma Preços de Venda',
        value: `R$ ${stats.totalSaleSum.toFixed(2)}`,
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

      {/* Cards de vendas por usuário */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-pink-50 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-pink-500" />
              <span>Vendas - Ana Paula</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Vendas:</span>
                <span className="font-bold">{userSales.ana_paula_sales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Receita Total:</span>
                <span className="font-bold">R$ {userSales.ana_paula_revenue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-blue-500" />
              <span>Vendas - Danilo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Vendas:</span>
                <span className="font-bold">{userSales.danilo_sales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Receita Total:</span>
                <span className="font-bold">R$ {userSales.danilo_revenue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              <span>Vendas - Rogério</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Vendas:</span>
                <span className="font-bold">{userSales.rogerio_sales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Receita Total:</span>
                <span className="font-bold">R$ {userSales.rogerio_revenue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de TOP 5 e Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP 5 Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Top 5 Produtos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.product_name} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' :
                        'bg-blue-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.product_name}</p>
                        <p className="text-xs text-gray-500">Qtd: {product.total_quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">R$ {Number(product.total_revenue).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Receita Total</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma venda encontrada</p>
            )}
          </CardContent>
        </Card>

        {/* TOP 5 Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <span>Top 5 Clientes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div key={customer.customer_name} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-purple-500' :
                        index === 1 ? 'bg-pink-400' :
                        index === 2 ? 'bg-indigo-400' :
                        'bg-cyan-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.customer_name}</p>
                        <p className="text-xs text-gray-500">Compras: {customer.total_purchases}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">R$ {Number(customer.total_spent).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Total Gasto</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma compra encontrada</p>
            )}
          </CardContent>
        </Card>

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
