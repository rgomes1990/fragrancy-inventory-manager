
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Edit, Trash2, Search, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ProductOrderRequest, Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const ProductOrderRequestsPage = () => {
  const [requests, setRequests] = useState<ProductOrderRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ProductOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ProductOrderRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { setUserContext } = useAuth();
  
  const [formData, setFormData] = useState({
    product_id: '',
    customer_name: '',
    requested_quantity: '',
    cost_price: '',
    sale_price: '',
    notes: '',
    status: 'Pendente',
  });

  // Calcular soma total do preço de custo
  const totalCostPrice = filteredRequests.reduce((total, request) => {
    const costPrice = request.cost_price || request.products?.cost_price || 0;
    return total + (costPrice * request.requested_quantity);
  }, 0);

  const fetchData = async () => {
    try {
      const [requestsRes, productsRes] = await Promise.all([
        supabase
          .from('product_order_requests')
          .select(`
            *,
            products(
              id, name, cost_price, sale_price, quantity, category_id, image_url, 
              created_at, updated_at,
              categories(id, name, created_at, updated_at)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .order('name')
      ]);

      if (requestsRes.error) throw requestsRes.error;
      if (productsRes.error) throw productsRes.error;

      setRequests(requestsRes.data || []);
      setProducts(productsRes.data || []);
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm]);

  const filterRequests = () => {
    if (!searchTerm) {
      setFilteredRequests(requests);
      return;
    }

    const filtered = requests.filter(request => {
      const searchLower = searchTerm.toLowerCase();
      return (
        request.customer_name.toLowerCase().includes(searchLower) ||
        request.products?.name?.toLowerCase().includes(searchLower) ||
        request.status.toLowerCase().includes(searchLower) ||
        request.requested_quantity.toString().includes(searchLower)
      );
    });

    setFilteredRequests(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await setUserContext();
      
      const requestData = {
        product_id: formData.product_id,
        customer_name: formData.customer_name,
        requested_quantity: parseInt(formData.requested_quantity),
        cost_price: parseFloat(formData.cost_price) || null,
        sale_price: parseFloat(formData.sale_price) || null,
        notes: formData.notes || null,
        status: formData.status,
      };

      if (editingRequest) {
        const { error } = await supabase
          .from('product_order_requests')
          .update(requestData)
          .eq('id', editingRequest.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Solicitação atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('product_order_requests')
          .insert([requestData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Solicitação criada com sucesso!",
        });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar solicitação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a solicitação.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (request: ProductOrderRequest) => {
    setEditingRequest(request);
    setFormData({
      product_id: request.product_id,
      customer_name: request.customer_name,
      requested_quantity: request.requested_quantity.toString(),
      cost_price: request.cost_price?.toString() || request.products?.cost_price?.toString() || '',
      sale_price: request.sale_price?.toString() || request.products?.sale_price?.toString() || '',
      notes: request.notes || '',
      status: request.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (request: ProductOrderRequest) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;

    try {
      await setUserContext();
      
      const { error } = await supabase
        .from('product_order_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação excluída com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a solicitação.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      customer_name: '',
      requested_quantity: '',
      cost_price: '',
      sale_price: '',
      notes: '',
      status: 'Pendente',
    });
    setEditingRequest(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return 'default';
      case 'Em Produção':
        return 'secondary';
      case 'Concluída':
        return 'outline';
      case 'Cancelada':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Solicitações de Encomenda</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p>Carregando solicitações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Solicitações de Encomenda</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Card com resumo financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Resumo Financeiro</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            Total Preço de Custo: R$ {totalCostPrice.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Baseado em {filteredRequests.length} solicitação(ões) filtrada(s)
          </p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRequest ? 'Editar Solicitação' : 'Nova Solicitação de Encomenda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product">Produto</Label>
                <select 
                  value={formData.product_id} 
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData, 
                      product_id: e.target.value,
                      cost_price: selectedProduct?.cost_price?.toString() || '',
                      sale_price: selectedProduct?.sale_price?.toString() || ''
                    });
                  }}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="customer_name">Nome do Cliente</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="requested_quantity">Quantidade Solicitada</Label>
                <Input
                  id="requested_quantity"
                  type="number"
                  min="1"
                  value={formData.requested_quantity}
                  onChange={(e) => setFormData({...formData, requested_quantity: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost_price">Preço de Custo</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                  placeholder="Preço automático do produto"
                />
              </div>

              <div>
                <Label htmlFor="sale_price">Preço de Venda</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                  placeholder="Preço automático do produto"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Produção">Em Produção</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex space-x-2">
                <Button type="submit">
                  {editingRequest ? 'Atualizar Solicitação' : 'Criar Solicitação'}
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
              <span>Lista de Solicitações</span>
            </CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar solicitações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Preço Custo</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.products?.name || 'Produto não encontrado'}
                  </TableCell>
                  <TableCell>{request.customer_name}</TableCell>
                  <TableCell>{request.requested_quantity}</TableCell>
                  <TableCell>
                    R$ {(request.cost_price || request.products?.cost_price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R$ {(request.sale_price || request.products?.sale_price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(request)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(request)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductOrderRequestsPage;
