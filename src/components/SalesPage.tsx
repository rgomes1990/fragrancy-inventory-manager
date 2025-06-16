import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShoppingCart, Trash2, Edit, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sale, Product, Customer } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const { setUserContext } = useAuth();
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSalesByMonth();
  }, [sales, selectedMonth]);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            customers(id, name, whatsapp, email, created_at, updated_at),
            products(id, name, cost_price, sale_price, quantity, category_id, created_at, updated_at, categories(id, name, created_at, updated_at))
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select(`
            *,
            categories(id, name, created_at, updated_at)
          `)
          .order('name'),
        supabase
          .from('customers')
          .select('*')
          .order('name')
      ]);

      if (salesRes.error) throw salesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;

      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSalesByMonth = () => {
    if (!selectedMonth) {
      setFilteredSales(sales);
      setMonthlyTotal(0);
      return;
    }

    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      return saleMonth === selectedMonth;
    });

    const total = filtered.reduce((sum, sale) => sum + Number(sale.total_price), 0);
    
    setFilteredSales(filtered);
    setMonthlyTotal(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await setUserContext();
      
      const product = products.find(p => p.id === formData.product_id);
      if (!product) {
        toast({
          title: "Erro",
          description: "Produto não encontrado.",
          variant: "destructive",
        });
        return;
      }

      const quantity = parseInt(formData.quantity);
      const unit_price = parseFloat(formData.unit_price || product.sale_price.toString());
      
      // Se editando, restaurar o estoque antes de verificar
      if (editingSale) {
        const oldQuantity = editingSale.quantity;
        if (quantity > (product.quantity + oldQuantity)) {
          toast({
            title: "Erro",
            description: "Quantidade insuficiente em estoque.",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (quantity > product.quantity) {
          toast({
            title: "Erro",
            description: "Quantidade insuficiente em estoque.",
            variant: "destructive",
          });
          return;
        }
      }

      const total_price = unit_price * quantity;

      const saleData = {
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        quantity,
        unit_price,
        total_price,
        sale_date: formData.sale_date + 'T00:00:00.000Z',
      };

      if (editingSale) {
        // Atualizar venda
        const { error: saleError } = await supabase
          .from('sales')
          .update(saleData)
          .eq('id', editingSale.id);

        if (saleError) throw saleError;

        // Restaurar estoque da venda anterior e aplicar nova quantidade
        const newQuantity = product.quantity + editingSale.quantity - quantity;
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', formData.product_id);

        if (updateError) throw updateError;

        // Se o preço unitário foi alterado, atualizar o produto também
        if (unit_price !== product.sale_price) {
          const { error: priceUpdateError } = await supabase
            .from('products')
            .update({ sale_price: unit_price })
            .eq('id', formData.product_id);

          if (priceUpdateError) throw priceUpdateError;
        }

        toast({
          title: "Sucesso",
          description: "Venda atualizada com sucesso!",
        });
      } else {
        // Registrar nova venda
        const { error: saleError } = await supabase
          .from('sales')
          .insert([saleData]);

        if (saleError) throw saleError;

        // Atualizar estoque do produto
        const newQuantity = product.quantity - quantity;
        const updateData: any = { quantity: newQuantity };

        // Se o preço unitário foi alterado, atualizar o produto também
        if (unit_price !== product.sale_price) {
          updateData.sale_price = unit_price;
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', formData.product_id);

        if (updateError) throw updateError;

        toast({
          title: "Sucesso",
          description: "Venda registrada com sucesso!",
        });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a venda.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      customer_id: sale.customer_id,
      product_id: sale.product_id,
      quantity: sale.quantity.toString(),
      unit_price: sale.unit_price.toString(),
      sale_date: new Date(sale.sale_date).toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
      await setUserContext();
      
      // Restaurar estoque
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: product.quantity + sale.quantity })
          .eq('id', sale.product_id);

        if (updateError) throw updateError;
      }

      // Excluir venda
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Venda excluída com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a venda.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      product_id: '',
      quantity: '',
      unit_price: '',
      sale_date: new Date().toISOString().split('T')[0],
    });
    setEditingSale(null);
    setShowForm(false);
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);

  // Atualizar preço unitário quando produto for selecionado
  useEffect(() => {
    if (selectedProduct && !editingSale) {
      setFormData(prev => ({
        ...prev,
        unit_price: selectedProduct.sale_price.toString()
      }));
    }
  }, [selectedProduct, editingSale]);

  // Agrupar produtos por categoria - FIXED: ensure non-empty keys
  const productsByCategory = products.reduce((acc, product) => {
    const categoryName = product.categories?.name || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Gerar opções de mês dos últimos 12 meses
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSale ? 'Editar Venda' : 'Nova Venda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="product">Produto</Label>
                <Select value={formData.product_id} onValueChange={(value) => setFormData({...formData, product_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                      <div key={category}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">
                          {category}
                        </div>
                        {categoryProducts.filter(p => p.quantity > 0 || (editingSale && p.id === editingSale.product_id)).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Estoque: {product.quantity})
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit_price">Preço Unitário</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sale_date">Data da Venda</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                  required
                />
              </div>
              
              {selectedProduct && formData.quantity && formData.unit_price && (
                <div className="lg:col-span-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Resumo da Venda</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Produto:</span>
                      <p className="font-medium">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Preço Unitário:</span>
                      <p className="font-medium">R$ {parseFloat(formData.unit_price || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantidade:</span>
                      <p className="font-medium">{formData.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-bold text-lg">
                        R$ {(parseFloat(formData.unit_price || '0') * parseInt(formData.quantity || '0')).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="lg:col-span-4 flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  disabled={!formData.customer_id || !formData.product_id || !formData.quantity || !formData.unit_price}
                >
                  {editingSale ? 'Atualizar Venda' : 'Registrar Venda'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Histórico de Vendas</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os meses</SelectItem>
                  {getMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedMonth && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-800">
                Total do mês selecionado: R$ {monthlyTotal.toFixed(2)}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando vendas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor Unitário</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.customers?.name || 'Cliente não encontrado'}
                    </TableCell>
                    <TableCell>
                      {sale.products?.name || 'Produto não encontrado'}
                    </TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>R$ {sale.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">R$ {sale.total_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(sale)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sale)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

export default SalesPage;
