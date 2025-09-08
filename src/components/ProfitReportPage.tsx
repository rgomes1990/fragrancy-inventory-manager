import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProfitData {
  totalRevenue: number;
  companyCash: number;
  daniloShare: number;
  anaPaulaShare: number;
  totalCostSum: number;
  productExpenses: number;
  travelExpenses: number;
}

const ProfitReportPage = () => {
  const [profitData, setProfitData] = useState<ProfitData>({
    totalRevenue: 0,
    companyCash: 0,
    daniloShare: 0,
    anaPaulaShare: 0,
    totalCostSum: 0,
    productExpenses: 0,
    travelExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar soma de todas as vendas
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_price');

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, sale) => {
        return sum + Number(sale.total_price);
      }, 0) || 0;

      // Buscar despesas por categoria
      const { data: productExpensesData, error: productExpensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('category', 'Despesa Produtos');

      if (productExpensesError) throw productExpensesError;

      const productExpenses = productExpensesData?.reduce((sum, expense) => {
        return sum + Number(expense.amount);
      }, 0) || 0;

      const { data: travelExpensesData, error: travelExpensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('category', 'Despesas Viagem');

      if (travelExpensesError) throw travelExpensesError;

      const travelExpenses = travelExpensesData?.reduce((sum, expense) => {
        return sum + Number(expense.amount);
      }, 0) || 0;

      // Buscar soma dos custos dos produtos (exceto produtos de encomenda)
      const { data: allProductsData, error: productsError } = await supabase
        .from('products')
        .select('cost_price, is_order_product');

      if (productsError) throw productsError;

      const totalCostSum = allProductsData?.reduce((sum, product) => {
        // Excluir produtos de encomenda (is_order_product = true)
        if (!product.is_order_product) {
          return sum + Number(product.cost_price);
        }
        return sum;
      }, 0) || 0;

      // Calcular caixa da empresa (receita - custos - despesas produtos - despesas viagem)
      const companyCash = totalRevenue - totalCostSum - productExpenses - travelExpenses;
      
      // Dividir por 2 para cada pessoa
      const daniloShare = companyCash / 2;
      const anaPaulaShare = companyCash / 2;

      setProfitData({
        totalRevenue,
        companyCash,
        daniloShare,
        anaPaulaShare,
        totalCostSum,
        productExpenses,
        travelExpenses,
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
                <p className="text-xs text-gray-500">Soma de todas as vendas</p>
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
                <p className="text-xs text-gray-500">Receita - Custos - Despesas</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-orange-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Despesas Produtos</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.productExpenses.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Total de despesas com produtos</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Despesas Viagem</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.travelExpenses.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Total de despesas com viagens</p>
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