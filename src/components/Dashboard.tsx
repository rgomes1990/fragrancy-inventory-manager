import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboardApi, productsApi, salesApi, customersApi, expensesApi, salesBalanceApi, salePaymentsApi } from '@/services/apiClient';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Trophy, Crown, UserCheck, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
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

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Dashboard = () => {
  const navigate = useNavigate();
  const { tenantId, isAdmin } = useTenantFilter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0, totalCustomers: 0, totalSales: 0, totalRevenue: 0,
    revenueFromDate: 0, totalCostSum: 0, totalSaleSum: 0, totalExpenses: 0,
    totalCashIn: 0, totalPendingPayments: 0, totalPartialPayments: 0, totalToReceive: 0,
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [sellersSales, setSellersSales] = useState<SellerSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('in-stock');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showAllSales, setShowAllSales] = useState(false);

  useEffect(() => {
    if (tenantId !== undefined) fetchDashboardData();
  }, [stockFilter, tenantId, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      const [allProducts, allSales, customersData, allExpenses, balanceData, salePaymentsData] = await Promise.all([
        productsApi.list(), salesApi.list(), customersApi.list(),
        expensesApi.list(), salesBalanceApi.list(), salePaymentsApi.list(),
      ]);

      let productsData = allProducts || [];
      if (stockFilter === 'in-stock') productsData = productsData.filter((p: any) => Number(p.quantity) > 0);
      else if (stockFilter === 'out-of-stock') productsData = productsData.filter((p: any) => Number(p.quantity) === 0);

      const salesData = allSales || [];
      const expensesArr = allExpenses || [];
      const totalRevenue = salesData.reduce((sum: number, sale: any) => sum + Number(sale.total_price), 0);

      const CAIXA_LEGACY_START = '2025-08-29';
      const salesInPeriod = new Set<string>();
      salesData.forEach((s: any) => { if (s.sale_date >= CAIXA_LEGACY_START) salesInPeriod.add(s.id); });

      const revenueFromDate = (salePaymentsData || []).reduce((sum: number, p: any) => {
        const saleId = p.sale_id || p.sale_group_id;
        if (salesInPeriod.has(saleId)) return sum + Number(p.amount || 0);
        return sum;
      }, 0);

      const totalExpenses = expensesArr.reduce((sum: number, e: any) => e.category !== 'Entrada de Caixa' ? sum + Number(e.amount) : sum, 0);
      const totalCashIn = expensesArr.reduce((sum: number, e: any) => e.category === 'Entrada de Caixa' ? sum + Number(e.amount) : sum, 0);

      let totalPendingPayments = 0, totalPartialPayments = 0;
      (balanceData || []).forEach((r: any) => {
        if (r.status === 'pago') return;
        const rem = Number(r.remaining) || 0;
        if (r.status === 'parcial') totalPartialPayments += rem;
        else totalPendingPayments += rem;
      });

      let costSaleProducts = allProducts || [];
      if (stockFilter === 'in-stock') costSaleProducts = costSaleProducts.filter((p: any) => Number(p.quantity) > 0);
      else if (stockFilter === 'out-of-stock') costSaleProducts = costSaleProducts.filter((p: any) => Number(p.quantity) === 0);

      const totalCostSum = costSaleProducts.reduce((sum: number, p: any) => {
        if (!p.is_order_product) { const qty = Number(p.quantity); return sum + (Number(p.cost_price) * (qty > 0 ? qty : 1)); }
        return sum;
      }, 0);
      const totalSaleSum = costSaleProducts.reduce((sum: number, p: any) => {
        if (!p.is_order_product) { const qty = Number(p.quantity); return sum + (Number(p.sale_price) * (qty > 0 ? qty : 1)); }
        return sum;
      }, 0);

      const recentSalesData = salesData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

      const productSales: Record<string, TopProduct> = {};
      salesData.forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          const name = item.product_name || item.kit_name || 'Produto desconhecido';
          const key = item.product_id || item.kit_id;
          if (!key) return;
          if (!productSales[name]) productSales[name] = { product_name: name, total_quantity: 0, total_revenue: 0 };
          productSales[name].total_quantity += Number(item.quantity);
          productSales[name].total_revenue += Number(item.total_price);
        });
      });

      const customerPurchases: Record<string, TopCustomer> = {};
      salesData.forEach((sale: any) => {
        const name = sale.customer_name || 'Cliente desconhecido';
        if (!sale.customer_id) return;
        if (!customerPurchases[name]) customerPurchases[name] = { customer_name: name, total_purchases: 0, total_spent: 0 };
        customerPurchases[name].total_purchases += 1;
        customerPurchases[name].total_spent += Number(sale.total_price);
      });

      const sellerStats: Record<string, { sales: number; revenue: number }> = {};
      salesData.forEach((sale: any) => {
        const n = sale.seller || 'Nao informado';
        if (!sellerStats[n]) sellerStats[n] = { sales: 0, revenue: 0 };
        sellerStats[n].sales += 1;
        sellerStats[n].revenue += Number(sale.total_price) || 0;
      });

      const monthlySalesData: Record<string, { vendas: number; receita: number }> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlySalesData[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { vendas: 0, receita: 0 };
      }
      salesData.forEach((sale: any) => {
        const d = new Date(sale.sale_date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlySalesData[k]) { monthlySalesData[k].vendas += 1; monthlySalesData[k].receita += Number(sale.total_price); }
      });

      const chartData = Object.entries(monthlySalesData).map(([month, data]) => {
        const [y, m] = month.split('-');
        return { month: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }), vendas: data.vendas, receita: data.receita };
      });

      const totalProductQuantity = productsData.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0);

      setStats({
        totalProducts: totalProductQuantity, totalCustomers: (customersData || []).length,
        totalSales: salesData.length, totalRevenue, revenueFromDate,
        totalCostSum, totalSaleSum, totalExpenses, totalCashIn,
        totalPendingPayments, totalPartialPayments, totalToReceive: totalPendingPayments + totalPartialPayments,
      });
      setRecentSales(recentSalesData || []);
      setTopProducts(Object.values(productSales).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 15));
      setTopCustomers(Object.values(customerPurchases).sort((a, b) => b.total_spent - a.total_spent).slice(0, 15));
      setMonthlySales(chartData);
      setSellersSales(Object.entries(sellerStats).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (type: string) => {
    if (type === 'parcial') navigate('/sales?status=parcial');
    else if (type === 'a-receber') navigate('/receivables');
    else if (type === 'pendente') navigate('/sales?status=pendente');
    else if (type.startsWith('seller-')) navigate(`/sales?seller=${encodeURIComponent(type.replace('seller-', ''))}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const caixa = stats.revenueFromDate - stats.totalExpenses + stats.totalCashIn;

  const heroCards = [
    { label: 'Caixa da Empresa', value: fmt(caixa), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20' },
    { label: 'Total a Receber', value: fmt(stats.totalToReceive), icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', click: 'a-receber' },
    { label: 'Vendas Totais', value: fmt(stats.totalRevenue), icon: ShoppingCart, gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20' },
  ];

  const miniCards = [
    { label: stockFilter === 'all' ? 'Produtos' : stockFilter === 'in-stock' ? 'Com Estoque' : 'Sem Estoque', value: stats.totalProducts, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Clientes', value: stats.totalCustomers, icon: Users, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Vendas', value: stats.totalSales, icon: ShoppingCart, color: 'text-violet-600 bg-violet-100' },
    { label: 'Custo Estoque', value: fmt(stats.totalCostSum), icon: TrendingUp, color: 'text-rose-600 bg-rose-100' },
    { label: 'Projecao Vendas', value: fmt(stats.totalSaleSum), icon: Sparkles, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Pendentes', value: fmt(stats.totalPendingPayments), icon: Clock, color: 'text-orange-600 bg-orange-100', click: 'pendente' },
    { label: 'Parciais', value: fmt(stats.totalPartialPayments), icon: DollarSign, color: 'text-amber-600 bg-amber-100', click: 'parcial' },
  ];

  const sellerColors = ['from-pink-500 to-rose-500', 'from-sky-500 to-blue-600', 'from-lime-500 to-green-600', 'from-fuchsia-500 to-purple-600', 'from-orange-400 to-red-500'];

  const RankList = ({ items, show, toggle, renderItem }: { items: any[]; show: boolean; toggle: () => void; renderItem: (item: any, i: number) => React.ReactNode }) => (
    <div className="space-y-1">
      {(show ? items : items.slice(0, 5)).map(renderItem)}
      {items.length > 5 && (
        <button onClick={toggle} className="w-full flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 pt-3 transition-colors">
          {show ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver mais ({items.length - 5})</>}
        </button>
      )}
    </div>
  );

  const medalColors = ['bg-gradient-to-br from-yellow-400 to-amber-500', 'bg-gradient-to-br from-slate-300 to-slate-400', 'bg-gradient-to-br from-orange-400 to-amber-600'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-xs rounded-xl border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            <SelectItem value="in-stock">Com estoque</SelectItem>
            <SelectItem value="out-of-stock">Sem estoque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {heroCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i}
              onClick={c.click ? () => handleCardClick(c.click) : undefined}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-5 text-white shadow-lg ${c.glow} ${c.click ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} transition-transform duration-200`}>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{c.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {miniCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i}
              onClick={(c as any).click ? () => handleCardClick((c as any).click) : undefined}
              className={`rounded-xl border border-border/50 bg-card p-3 ${(c as any).click ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : ''} transition-all duration-200`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${c.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-sm font-bold text-foreground mt-0.5 truncate">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* Seller Cards */}
      {sellersSales.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sellersSales.map((seller, i) => (
            <div key={seller.name}
              onClick={() => handleCardClick(`seller-${seller.name}`)}
              className="group cursor-pointer rounded-xl border border-border/50 bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${sellerColors[i % sellerColors.length]} flex items-center justify-center text-white`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">{seller.name}</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">ver vendas</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div><span className="text-muted-foreground text-xs">Vendas</span><p className="font-bold">{seller.sales}</p></div>
                <div><span className="text-muted-foreground text-xs">Receita</span><p className="font-bold">{fmt(seller.revenue)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Produtos */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <RankList items={topProducts} show={showAllProducts} toggle={() => setShowAllProducts(!showAllProducts)}
                renderItem={(product, index) => (
                  <div key={product.product_name} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${index < 3 ? medalColors[index] : 'bg-muted text-muted-foreground'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.product_name}</p>
                      <p className="text-xs text-muted-foreground">{product.total_quantity} vendidos</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground shrink-0">{fmt(product.total_revenue)}</p>
                  </div>
                )}
              />
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="w-4 h-4 text-violet-500" /> Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <RankList items={topCustomers} show={showAllCustomers} toggle={() => setShowAllCustomers(!showAllCustomers)}
                renderItem={(customer, index) => (
                  <div key={customer.customer_name} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${index < 3 ? medalColors[index] : 'bg-muted text-muted-foreground'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{customer.total_purchases} compras</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground shrink-0">{fmt(customer.total_spent)}</p>
                  </div>
                )}
              />
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Vendas Recentes */}
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="w-4 h-4 text-sky-500" /> Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <RankList items={recentSales} show={showAllSales} toggle={() => setShowAllSales(!showAllSales)}
                renderItem={(sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium truncate">{(sale.items || []).map((i: any) => i.product_name || i.kit_name).filter(Boolean).join(', ') || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{sale.customer_name || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{fmt(Number(sale.total_price))}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              />
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Evolucao de Vendas Mensais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlySales} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="right" orientation="right" style={{ fontSize: '11px' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '13px' }}
                formatter={(value: number, name: string) => name === 'receita' ? [fmt(value), 'Receita'] : [value, 'Vendas']}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="vendas" fill="hsl(243 75% 59%)" name="Vendas" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="receita" fill="hsl(160 60% 45%)" name="Receita" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
