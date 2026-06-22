import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { salesApi, expensesApi, productsApi } from '@/services/apiClient';
import { calculateCashBalance } from '@/lib/cashBalance';
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProfitData {
  totalRevenue: number;
  companyCash: number;
  daniloShare: number;
  anaPaulaShare: number;
  totalCostSum: number;
  travelExpenses: number;
}

const ProfitReportPage = () => {
  const [profitData, setProfitData] = useState<ProfitData>({
    totalRevenue: 0,
    companyCash: 0,
    daniloShare: 0,
    anaPaulaShare: 0,
    totalCostSum: 0,
    travelExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar todas as vendas, despesas e produtos em paralelo
      const [allSalesData, allExpensesData, allProductsData] = await Promise.all([
        salesApi.list(),
        expensesApi.list(),
        productsApi.list(),
      ]);

      const totalRevenue = (allSalesData || []).reduce((sum: number, sale: any) => {
        return sum + Number(sale.total_price);
      }, 0);

      // Buscar soma dos custos dos produtos (exceto produtos de encomenda)
      const totalCostSum = (allProductsData || []).reduce((sum: number, product: any) => {
        if (!product.is_order_product) {
          return sum + Number(product.cost_price);
        }
        return sum;
      }, 0);

      const totalExpenses = (allExpensesData || []).reduce((sum: number, expense: any) => {
        if (expense.category !== 'Entrada de Caixa') {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0);

      // Calcular caixa da empresa usando a mesma logica do Dashboard
      const companyCash = await calculateCashBalance(null, false);

      // Dividir por 2 para cada pessoa
      const daniloShare = companyCash / 2;
      const anaPaulaShare = companyCash / 2;

      setProfitData({
        totalRevenue,
        companyCash,
        daniloShare,
        anaPaulaShare,
        totalCostSum,
        travelExpenses: totalExpenses,
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Relatório de Lucro vs Despesas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Relatório de Lucro vs Despesas</h1>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Todas as vendas desde o início</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Soma Preços de Custo</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.totalCostSum.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Custo de todos os produtos</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Caixa da Empresa</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.companyCash.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Vendas (29/08+) - Todas Despesas</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card className="bg-purple-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Despesas</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.travelExpenses.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Soma de todas as despesas</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por pessoa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Danilo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">R$ {profitData.daniloShare.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-2">Lucro Individual</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Ana Paula</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">R$ {profitData.anaPaulaShare.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-2">Lucro Individual</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitReportPage;
