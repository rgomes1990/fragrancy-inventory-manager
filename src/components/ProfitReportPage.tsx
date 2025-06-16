
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Reinvestment {
  id: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
}

interface ProfitData {
  totalCostPrice: number;
  totalReinvestments: number;
  netInvestment: number;
  daniloShare: number;
  rogerioShare: number;
}

const ProfitReportPage = () => {
  const [reinvestments, setReinvestments] = useState<Reinvestment[]>([]);
  const [profitData, setProfitData] = useState<ProfitData>({
    totalCostPrice: 0,
    totalReinvestments: 0,
    netInvestment: 0,
    daniloShare: 0,
    rogerioShare: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: '',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar reenvestimentos
      const { data: reinvestmentData, error: reinvestmentError } = await supabase
        .from('reinvestments')
        .select('*')
        .order('date', { ascending: false });

      if (reinvestmentError) throw reinvestmentError;

      // Buscar soma dos preços de custo dos produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('cost_price');

      if (productsError) throw productsError;

      const totalCostPrice = productsData?.reduce((sum, product) => {
        return sum + Number(product.cost_price);
      }, 0) || 0;

      const totalReinvestments = reinvestmentData?.reduce((sum, reinvestment) => {
        return sum + Number(reinvestment.amount);
      }, 0) || 0;

      const netInvestment = totalCostPrice - totalReinvestments;
      const daniloShare = netInvestment / 2;
      const rogerioShare = netInvestment / 2;

      setReinvestments(reinvestmentData || []);
      setProfitData({
        totalCostPrice,
        totalReinvestments,
        netInvestment,
        daniloShare,
        rogerioShare,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('reinvestments')
        .insert({
          amount: Number(formData.amount),
          date: formData.date,
          description: formData.description || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reenvestimento cadastrado com sucesso!",
      });

      setFormData({ amount: '', date: '', description: '' });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar reenvestimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar reenvestimento",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reinvestments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reenvestimento excluído com sucesso!",
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao excluir reenvestimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir reenvestimento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Relatório de Lucro vs Investimento</h1>
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
        <h1 className="text-3xl font-bold text-gray-900">Relatório de Lucro vs Investimento</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Reenvestimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Reenvestimento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional do reenvestimento"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Soma Preços de Custo</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.totalCostPrice.toFixed(2)}</p>
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
                <p className="text-sm font-medium text-gray-600 mb-1">Total Reenvestimentos</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.totalReinvestments.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Investimento Líquido</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.netInvestment.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Custo - Reenvestimentos</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Por Pessoa</p>
                <p className="text-2xl font-bold text-gray-900">R$ {profitData.daniloShare.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Danilo / Rogério</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
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
              <p className="text-sm text-gray-500 mt-2">Investimento individual</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Rogério</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">R$ {profitData.rogerioShare.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-2">Investimento individual</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de reenvestimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Reenvestimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {reinvestments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reinvestments.map((reinvestment) => (
                  <TableRow key={reinvestment.id}>
                    <TableCell>
                      {new Date(reinvestment.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(reinvestment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {reinvestment.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reinvestment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum reenvestimento cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitReportPage;
