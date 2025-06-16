
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sale, Product, Customer } from '@/types/database';

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            customers(name),
            products(name, sale_price)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
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
      if (quantity > product.quantity) {
        toast({
          title: "Erro",
          description: "Quantidade insuficiente em estoque.",
          variant: "destructive",
        });
        return;
      }

      const unit_price = product.sale_price;
      const total_price = unit_price * quantity;

      // Registrar a venda
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: formData.customer_id,
          product_id: formData.product_id,
          quantity,
          unit_price,
          total_price,
        }]);

      if (saleError) throw saleError;

      // Atualizar estoque do produto
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: product.quantity - quantity })
        .eq('id', formData.product_id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
      });

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a venda.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
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
    });
    setShowForm(false);
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);

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
            <CardTitle>Nova Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {products.filter(p => p.quantity > 0).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Estoque: {product.quantity})
                      </SelectItem>
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
                  max={selectedProduct?.quantity || 1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>
              
              {selectedProduct && formData.quantity && (
                <div className="md:col-span-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Resumo da Venda</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Produto:</span>
                      <p className="font-medium">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Preço Unitário:</span>
                      <p className="font-medium">R$ {selectedProduct.sale_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantidade:</span>
                      <p className="font-medium">{formData.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-bold text-lg">
                        R$ {(selectedProduct.sale_price * parseInt(formData.quantity || '0')).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-3 flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  disabled={!formData.customer_id || !formData.product_id || !formData.quantity}
                >
                  Registrar Venda
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
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>Histórico de Vendas</span>
          </CardTitle>
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
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">{sale.customer?.name}</TableCell>
                    <TableCell>{sale.product?.name}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>R$ {sale.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">R$ {sale.total_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sale)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
