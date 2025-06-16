import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Package, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Category } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

// Extended Product type with all required fields
interface ExtendedProduct {
  id: string;
  name: string;
  category_id: string | null;
  cost_price: number;
  sale_price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  } | null;
}

interface ProductSummary {
  totalCostPrice: number;
  totalSalePrice: number;
  filteredCostPrice: number;
  filteredSalePrice: number;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [stockFilter, setStockFilter] = useState('all');
  const [productSummary, setProductSummary] = useState<ProductSummary>({
    totalCostPrice: 0,
    totalSalePrice: 0,
    filteredCostPrice: 0,
    filteredSalePrice: 0,
  });
  const { setUserContext } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    category_id: null as string | null,
    cost_price: '',
    sale_price: '',
    quantity: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category_id,
          cost_price,
          sale_price,
          quantity,
          created_at,
          updated_at,
          categories (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive",
      });
    }
  };

  const filterProducts = (products: ExtendedProduct[], filter: string) => {
    switch (filter) {
      case 'in-stock':
        return products.filter(product => product.quantity > 0);
      case 'out-of-stock':
        return products.filter(product => product.quantity === 0);
      default:
        return products;
    }
  };

  const calculateSummary = (allProducts: ExtendedProduct[], filtered: ExtendedProduct[]) => {
    const totalCostPrice = allProducts.reduce((sum, product) => {
      return sum + (Number(product.cost_price) * Number(product.quantity));
    }, 0);

    const totalSalePrice = allProducts.reduce((sum, product) => {
      return sum + (Number(product.sale_price) * Number(product.quantity));
    }, 0);

    const filteredCostPrice = filtered.reduce((sum, product) => {
      return sum + (Number(product.cost_price) * Number(product.quantity));
    }, 0);

    const filteredSalePrice = filtered.reduce((sum, product) => {
      return sum + (Number(product.sale_price) * Number(product.quantity));
    }, 0);

    return {
      totalCostPrice,
      totalSalePrice,
      filteredCostPrice,
      filteredSalePrice,
    };
  };

  useEffect(() => {
    const filtered = filterProducts(products, stockFilter);
    setFilteredProducts(filtered);
    setProductSummary(calculateSummary(products, filtered));
  }, [products, stockFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        name: formData.name,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        cost_price: parseFloat(formData.cost_price),
        sale_price: parseFloat(formData.sale_price),
        quantity: parseInt(formData.quantity),
      };

      await setUserContext();

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Produto atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Produto cadastrado com sucesso!",
        });
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: ExtendedProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || null,
      cost_price: String(product.cost_price),
      sale_price: String(product.sale_price),
      quantity: String(product.quantity),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await setUserContext();

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: null,
      cost_price: '',
      sale_price: '',
      quantity: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
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
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Cards de resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Investimento Total</p>
                <p className="text-lg font-bold text-gray-900">R$ {productSummary.totalCostPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Todos os produtos</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total Estoque</p>
                <p className="text-lg font-bold text-gray-900">R$ {productSummary.totalSalePrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Todos os produtos</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Investimento Filtrado</p>
                <p className="text-lg font-bold text-gray-900">R$ {productSummary.filteredCostPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  {stockFilter === 'all' ? 'Todos' : 
                   stockFilter === 'in-stock' ? 'Com estoque' : 'Sem estoque'}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Filtrado</p>
                <p className="text-lg font-bold text-gray-900">R$ {productSummary.filteredSalePrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  {stockFilter === 'all' ? 'Todos' : 
                   stockFilter === 'in-stock' ? 'Com estoque' : 'Sem estoque'}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Produto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(value) => setFormData({...formData, category_id: value === "none" ? null : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    required
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600">
                  {editingProduct ? 'Atualizar' : 'Cadastrar'}
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
            <Package className="w-5 h-5" />
            <span>Lista de Produtos</span>
            <span className="text-sm text-gray-500">
              ({filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando produtos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço de Custo</TableHead>
                  <TableHead>Preço de Venda</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categories?.name || 'Sem categoria'}</TableCell>
                    <TableCell>R$ {Number(product.cost_price).toFixed(2)}</TableCell>
                    <TableCell>R$ {Number(product.sale_price).toFixed(2)}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      {product.quantity === 0 ? (
                        <span className="flex items-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Sem estoque
                        </span>
                      ) : (
                        <span className="text-green-600">Disponível</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
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

export default ProductsPage;
