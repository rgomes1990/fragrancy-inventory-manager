import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, DollarSign, Calendar, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  observacao?: string;
}

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cashInDialogOpen, setCashInDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [companyCash, setCompanyCash] = useState<number>(0);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    observacao: ''
  });
  const [cashInFormData, setCashInFormData] = useState({
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const categories = [
    'Despesa Produtos',
    'Despesas Viagem'
  ];

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Buscar os mesmos dados do Dashboard para o Caixa da Empresa
  useEffect(() => {
    const fetchCompanyCash = async () => {
      // Buscar vendas pagas a partir de 29/08/2025
      const { data: salesFromDateData } = await supabase
        .from('sales')
        .select('total_price, sale_date, payment_received, partial_payment_amount')
        .gte('sale_date', '2025-08-29');
      
      const revenueFromDate = salesFromDateData?.reduce((sum, sale) => {
        const partialAmount = Number((sale as any).partial_payment_amount) || 0;
        const totalPrice = Number(sale.total_price) || 0;
        
        if (sale.payment_received && (partialAmount === 0 || partialAmount >= totalPrice)) {
          return sum + totalPrice;
        }
        return sum;
      }, 0) || 0;

      // Buscar despesas e entradas de caixa
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, category');
      
      const totalExpensesOut = expensesData?.reduce((sum, expense) => {
        if (expense.category !== 'Entrada de Caixa') {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0) || 0;
      
      const totalCashInAmount = expensesData?.reduce((sum, expense) => {
        if (expense.category === 'Entrada de Caixa') {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0) || 0;

      return revenueFromDate - totalExpensesOut + totalCashInAmount;
    };

    fetchCompanyCash().then(setCompanyCash);
  }, [expenses]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar despesas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.category) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        expense_date: formData.expense_date,
        observacao: formData.observacao
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Despesa atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Despesa criada com sucesso",
        });
      }

      setDialogOpen(false);
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        observacao: ''
      });
      fetchExpenses();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar despesa",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      expense_date: expense.expense_date,
      observacao: expense.observacao || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso",
      });
      fetchExpenses();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir despesa",
        variant: "destructive",
      });
    }
  };

  const handleCashInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cashInFormData.amount || !cashInFormData.description) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const cashInData = {
        description: cashInFormData.description,
        amount: parseFloat(cashInFormData.amount),
        category: 'Entrada de Caixa',
        expense_date: cashInFormData.expense_date,
        observacao: cashInFormData.observacao
      };

      const { error } = await supabase
        .from('expenses')
        .insert([cashInData]);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Entrada de caixa lançada com sucesso",
      });

      setCashInDialogOpen(false);
      setCashInFormData({
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        observacao: ''
      });
      fetchExpenses();
    } catch (error) {
      console.error('Erro ao lançar entrada de caixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao lançar entrada de caixa",
        variant: "destructive",
      });
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => {
    if (expense.category === 'Entrada de Caixa') {
      return sum + expense.amount;
    }
    return sum - expense.amount;
  }, 0);
  
  const totalCashIn = expenses
    .filter(e => e.category === 'Entrada de Caixa')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalCashOut = expenses
    .filter(e => e.category !== 'Entrada de Caixa')
    .reduce((sum, e) => sum + e.amount, 0);

  const getCategoryBadgeVariant = (category: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'Entrada de Caixa': 'default',
      'Despesa Produtos': 'secondary',
      'Despesas Viagem': 'outline'
    };
    return variants[category] || 'outline';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Despesas</h1>
          <p className="text-muted-foreground">Gerencie as despesas da empresa</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={cashInDialogOpen} onOpenChange={setCashInDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Entrada de Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançar Entrada de Caixa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCashInSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cashInAmount">Valor *</Label>
                  <Input
                    id="cashInAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashInFormData.amount}
                    onChange={(e) => setCashInFormData({ ...cashInFormData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cashInDescription">Descrição *</Label>
                  <Input
                    id="cashInDescription"
                    placeholder="Ex: Sobrou de viagem"
                    value={cashInFormData.description}
                    onChange={(e) => setCashInFormData({ ...cashInFormData, description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cashInDate">Data</Label>
                  <Input
                    id="cashInDate"
                    type="date"
                    value={cashInFormData.expense_date}
                    onChange={(e) => setCashInFormData({ ...cashInFormData, expense_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cashInObservacao">Observação</Label>
                  <Textarea
                    id="cashInObservacao"
                    placeholder="Observações adicionais"
                    value={cashInFormData.observacao}
                    onChange={(e) => setCashInFormData({ ...cashInFormData, observacao: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Lançar Entrada
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingExpense(null);
                setFormData({
                  description: '',
                  amount: '',
                  category: '',
                  expense_date: new Date().toISOString().split('T')[0],
                  observacao: ''
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição da despesa"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense_date">Data da Despesa</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                  placeholder="Observações adicionais (opcional)"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo em Caixa (Empresa)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${companyCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {companyCash.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {expenses.filter(e => e.category === 'Entrada de Caixa').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalCashOut.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma despesa cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(expense.category)}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className={expense.category === 'Entrada de Caixa' ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {expense.category === 'Entrada de Caixa' ? '+' : '-'} R$ {expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{format(new Date(expense.expense_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.observacao || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(expense.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;