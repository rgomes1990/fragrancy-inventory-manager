import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboardApi, productsApi, salesApi, customersApi, expensesApi, salesBalanceApi, salePaymentsApi } from '@/services/apiClient';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Trophy, Crown, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTenantFilter } from '@/hooks/useTenantFilter';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  revenueFromDate: number;
  totalCostSum: number;
  totalSaleSum: number;
  totalExpenses: number;
  totalCashIn: number;
  totalPendingPayments: number;
  totalPartialPayments: number;
  totalToReceive: number;
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

interface SellerSales {
  name: string;
  sales: number;
  revenue: number;
}

interface MonthlySales {
  month: string;
  vendas: number;
  receita: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { tenantId, isAdmin } = useTenantFilter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    revenueFromDate: 0,
    totalCostSum: 0,
    totalSaleSum: 0,
    totalExpenses: 0,
    totalCashIn: 0,
    totalPendingPayments: 0,
    totalPartialPayments: 0,
    totalToReceive: 0,
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [sellersSales, setSellersSales] = useState<SellerSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('in-stock');

  useEffect(() => {
    if (tenantId !== undefined) {
      fetchDashboardData();
    }
  }, [stockFilter, tenantId, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data via API
      const [allProducts, allSales, customersData, allExpenses, balanceData, salePaymentsData] = await Promise.all([
        productsApi.list(),
        salesApi.list(),
        customersApi.list(),
        expensesApi.list(),
        salesBalanceApi.list(),
        salePaymentsApi.list(),
      ]);

      // Filter products based on stockFilter
      let productsData = allProducts || [];
      if (stockFilter === 'in-stock') {
        productsData = productsData.filter((p: any) => Number(p.quantity) > 0);
      } else if (stockFilter === 'out-of-stock') {
        productsData = productsData.filter((p: any) => Number(p.quantity) === 0);
      }

      const salesData = allSales || [];
      const expensesArr = allExpenses || [];

      const totalRevenue = salesData.reduce((sum: number, sale: any) => sum + Number(sale.total_price), 0);

      // Caixa: logica legada (vendas com payment_received=true a partir de 29/08/2025)
      const CAIXA_LEGACY_START = '2025-08-29';
      const SALE_PAYMENTS_CUTOFF = '2026-06-13';

      const legacySales = salesData.filter((s: any) => new Date(s.sale_date) >= new Date(CAIXA_LEGACY_START));
      const legacyRevenue = legacySales.reduce((sum: number, row: any) => {
        if (row.payment_received) return sum + Number(row.total_price || 0);
        return sum + Number(row.partial_payment_amount || 0);
      }, 0);

      const newPayments = (salePaymentsData || []).filter((p: any) => new Date(p.created_at) >= new Date(SALE_PAYMENTS_CUTOFF));

      // Exclui pagamentos cuja venda ja esta marcada como payment_received=true
      const groupIds = Array.from(new Set(newPayments.map((p: any) => p.sale_group_id).filter(Boolean)));
      const paidGroupIds = new Set<string>();
      salesData.forEach((s: any) => {
        if (s.payment_received) {
          if (s.sale_group_id) paidGroupIds.add(s.sale_group_id);
          if (s.id) paidGroupIds.add(s.id);
        }
      });

      const newPaymentsRevenue = newPayments.reduce((sum: number, p: any) => {
        if (paidGroupIds.has(p.sale_group_id)) return sum;
        return sum + Number(p.amount || 0);
      }, 0);

      const revenueFromDate = legacyRevenue + newPaymentsRevenue;

      // Separar despesas (saidas) e entradas de caixa
      const totalExpenses = expensesArr.reduce((sum: number, expense: any) => {
        if (expense.category !== 'Entrada de Caixa') {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0);

      const totalCashIn = expensesArr.reduce((sum: number, expense: any) => {
        if (expense.category === 'Entrada de Caixa') {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0);

      // Total a Receber: usar salesBalance
      let totalPendingPayments = 0;
      let totalPartialPayments = 0;
      (balanceData || []).forEach((r: any) => {
        if (r.status === 'pago') return;
        const rem = Number(r.remaining) || 0;
        if (r.status === 'parcial') totalPartialPayments += rem;
        else totalPendingPayments += rem;
      });

      const totalToReceive = totalPendingPayments + totalPartialPayments;

      // Cost/Sale sums (use same filter as products)
      let costSaleProducts = allProducts || [];
      if (stockFilter === 'in-stock') {
        costSaleProducts = costSaleProducts.filter((p: any) => Number(p.quantity) > 0);
      } else if (stockFilter === 'out-of-stock') {
        costSaleProducts = costSaleProducts.filter((p: any) => Number(p.quantity) === 0);
      }

      const totalCostSum = costSaleProducts.reduce((sum: number, product: any) => {
        if (!product.is_order_product) {
          const qty = Number(product.quantity);
          const effectiveQty = qty > 0 ? qty : 1;
          return sum + (Number(product.cost_price) * effectiveQty);
        }
        return sum;
      }, 0);

      const totalSaleSum = costSaleProducts.reduce((sum: number, product: any) => {
        if (!product.is_order_product) {
          const qty = Number(product.quantity);
          const effectiveQty = qty > 0 ? qty : 1;
          return sum + (Number(product.sale_price) * effectiveQty);
        }
        return sum;
      }, 0);

      // Recent sales (use flat fields from API)
      const recentSalesData = salesData
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      // Top products
      const productSales: Record<string, TopProduct> = {};
      salesData.forEach((sale: any) => {
        const productName = sale.product_name || 'Produto desconhecido';
        if (!sale.product_id) return;
        if (!productSales[productName]) {
          productSales[productName] = {
            product_name: productName,
            total_quantity: 0,
            total_revenue: 0
          };
        }
        productSales[productName].total_quantity += sale.quantity;
        productSales[productName].total_revenue += Number(sale.total_price);
      });

      // Top customers
      const customerPurchases: Record<string, TopCustomer> = {};
      salesData.forEach((sale: any) => {
        const customerName = sale.customer_name || 'Cliente desconhecido';
        if (!sale.customer_id) return;
        if (!customerPurchases[customerName]) {
          customerPurchases[customerName] = {
            customer_name: customerName,
            total_purchases: 0,
            total_spent: 0
          };
        }
        customerPurchases[customerName].total_purchases += sale.quantity;
        customerPurchases[customerName].total_spent += Number(sale.total_price);
      });

      // Sales by seller
      const sellerStats: Record<string, { sales: number; revenue: number }> = {};
      salesData.forEach((sale: any) => {
        const sellerName = sale.seller || 'Nao informado';
        const revenue = Number(sale.total_price) || 0;

        if (!sellerStats[sellerName]) {
          sellerStats[sellerName] = { sales: 0, revenue: 0 };
        }
        sellerStats[sellerName].sales += 1;
        sellerStats[sellerName].revenue += revenue;
      });

      const sellersStatsArray: SellerSales[] = Object.entries(sellerStats)
        .map(([name, data]) => ({ name, sales: data.sales, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const top5Products = Object.values(productSales)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 15);

      const top5Customers = Object.values(customerPurchases)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 15);

      // Calcular vendas mensais para o grafico (ultimos 12 meses)
      const monthlySalesData: Record<string, { vendas: number; receita: number }> = {};

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlySalesData[monthKey] = { vendas: 0, receita: 0 };
      }

      salesData.forEach((sale: any) => {
        const saleDate = new Date(sale.sale_date);
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthlySalesData[monthKey]) {
          monthlySalesData[monthKey].vendas += 1;
          monthlySalesData[monthKey].receita += Number(sale.total_price);
        }
      });

      const chartData = Object.entries(monthlySalesData)
        .map(([month, data]) => {
          const [year, monthNum] = month.split('-');
          const date = new Date(Number(year), Number(monthNum) - 1, 1);
          const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          return {
            month: monthLabel,
            vendas: data.vendas,
            receita: data.receita
          };
        })
        .sort((a, b) => {
          const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
          const aMonth = a.month.split(' ')[0];
          const bMonth = b.month.split(' ')[0];
          const aYear = a.month.split(' ')[1];
          const bYear = b.month.split(' ')[1];

          if (aYear !== bYear) {
            return Number(aYear) - Number(bYear);
          }
          return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
        });

      // Somar a quantidade total de produtos em estoque
      const totalProductQuantity = productsData.reduce((sum: number, product: any) => sum + (Number(product.quantity) || 0), 0);

      setStats({
        totalProducts: totalProductQuantity,
        totalCustomers: (customersData || []).length,
        totalSales: salesData.length,
        totalRevenue,
        revenueFromDate,
        totalCostSum,
        totalSaleSum,
        totalExpenses,
        totalCashIn,
        totalPendingPayments,
        totalPartialPayments,
        totalToReceive,
      });

      setRecentSales(recentSalesData || []);
      setTopProducts(top5Products);
      setTopCustomers(top5Customers);
      setMonthlySales(chartData);
      setSellersSales(sellersStatsArray);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardType: string) => {
    if (cardType === 'parcial') {
      navigate('/sales?status=parcial');
    } else if (cardType === 'a-receber') {
      navigate('/sales?status=a-receber');
    } else if (cardType === 'pendente') {
      navigate('/sales?status=pendente');
    } else if (cardType.startsWith('seller-')) {
      const seller = cardType.replace('seller-', '');
      navigate(`/sales?seller=${encodeURIComponent(seller)}`);
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
        title: 'Vendas Totais',
        value: `R$ ${stats.totalRevenue.toFixed(2)}`,
        icon: DollarSign,
        color: 'from-yellow-500 to-yellow-600',
        bgColor: 'bg-yellow-50',
      },
      {
        title: 'Soma Precos de Custo',
        value: `R$ ${stats.totalCostSum.toFixed(2)}`,
        icon: TrendingUp,
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
      },
      {
        title: 'Projecao de Vendas',
        value: `R$ ${stats.totalSaleSum.toFixed(2)}`,
        icon: Package,
        color: 'from-indigo-500 to-indigo-600',
        bgColor: 'bg-indigo-50',
      },
      {
        title: 'Vendas Pendentes (Total)',
        value: `R$ ${stats.totalPendingPayments.toFixed(2)}`,
        icon: TrendingUp,
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50',
        clickable: true,
        clickType: 'pendente',
      },
      {
        title: 'Pagamentos Parciais (Falta Receber)',
        value: `R$ ${stats.totalPartialPayments.toFixed(2)}`,
        icon: DollarSign,
        color: 'from-amber-500 to-amber-600',
        bgColor: 'bg-amber-50',
        clickable: true,
        clickType: 'parcial',
      },
      {
        title: 'Total a Receber',
        value: `R$ ${stats.totalToReceive.toFixed(2)}`,
        icon: TrendingUp,
        color: 'from-rose-500 to-rose-600',
        bgColor: 'bg-rose-50',
        clickable: true,
        clickType: 'a-receber',
      },
        {
          title: 'Caixa da Empresa',
          value: `R$ ${(stats.revenueFromDate - stats.totalExpenses + stats.totalCashIn).toFixed(2)}`,
          icon: DollarSign,
          color: 'from-emerald-500 to-emerald-600',
          bgColor: 'bg-emerald-50',
        },
    ];

    return baseCards;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto">
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              <SelectItem value="in-stock">Com estoque</SelectItem>
              <SelectItem value="out-of-stock">Sem estoque</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-500">
            Ultima atualizacao: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Cards de estatisticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredStatsCards().map((card, index) => {
          const Icon = card.icon;
          const isClickable = (card as any).clickable;
          const clickType = (card as any).clickType;

          return (
            <Card
              key={index}
              className={`${card.bgColor} border-0 shadow-md hover:shadow-lg transition-shadow duration-300 ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary' : ''}`}
              onClick={isClickable ? () => handleCardClick(clickType) : undefined}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {card.title}
                      {isClickable && <span className="ml-1 text-xs text-primary">(clique para ver)</span>}
                    </p>
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

      {/* Cards de vendas por vendedor (dinamico) */}
      {sellersSales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellersSales.map((seller, index) => {
            const colors = [
              { bg: 'bg-pink-50', ring: 'ring-pink-400', text: 'text-pink-500' },
              { bg: 'bg-blue-50', ring: 'ring-blue-400', text: 'text-blue-500' },
              { bg: 'bg-green-50', ring: 'ring-green-400', text: 'text-green-500' },
              { bg: 'bg-purple-50', ring: 'ring-purple-400', text: 'text-purple-500' },
              { bg: 'bg-orange-50', ring: 'ring-orange-400', text: 'text-orange-500' },
            ];
            const color = colors[index % colors.length];

            return (
              <Card
                key={seller.name}
                className={`${color.bg} border-0 shadow-md cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-offset-2 hover:${color.ring} transition-all duration-300`}
                onClick={() => handleCardClick(`seller-${seller.name}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className={`w-5 h-5 ${color.text}`} />
                    <span>Vendas - {seller.name}</span>
                    <span className={`text-xs ${color.text}`}>(clique para ver)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total de Vendas:</span>
                      <span className="font-bold">{seller.sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Receita Total:</span>
                      <span className="font-bold">R$ {seller.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cards de TOP 5 e Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP 15 Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Top 15 Produtos</span>
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

        {/* TOP 15 Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <span>Top 15 Clientes</span>
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
                      <p className="font-medium text-sm">{sale.product_name || sale.kit_name || '-'}</p>
                      <p className="text-xs text-gray-500">{sale.customer_name || '-'}</p>
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

      {/* Grafico de Evolucao de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span>Evolucao de Vendas Mensais</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                yAxisId="left"
                style={{ fontSize: '12px' }}
                label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                style={{ fontSize: '12px' }}
                label={{ value: 'Receita (R$)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'receita') {
                    return [`R$ ${value.toFixed(2)}`, 'Receita'];
                  }
                  return [value, 'Vendas'];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="vendas"
                fill="#8b5cf6"
                name="Vendas"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="receita"
                fill="#10b981"
                name="Receita"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
