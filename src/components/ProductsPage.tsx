
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product, Category } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import ImageModal from './ImageModal';
import OrderProductsPDFReport from './OrderProductsPDFReport';
import StockProductsPDFReport from './StockProductsPDFReport';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { setUserContext } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    cost_price: '',
    sale_price: '',
    quantity: '',
    category_id: '',
    image_url: '',
    is_order_product: false,
    customer_name: '',
  });

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            categories(id, name, created_at, updated_at)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
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
    filterProducts();
  }, [products, searchTerm, typeFilter]);

  const filterProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.categories?.name?.toLowerCase().includes(searchLower) ||
        product.cost_price.toString().includes(searchLower) ||
        product.sale_price.toString().includes(searchLower) ||
        product.quantity.toString().includes(searchLower)
      );
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter(product => {
        switch (typeFilter) {
          case 'Encomenda':
            return product.is_order_product;
          case 'Estoque':
            return !product.is_order_product && product.quantity > 0;
          case 'Sem Estoque':
            return !product.is_order_product && product.quantity === 0;
          default:
            return true;
        }
      });
    }

    setFilteredProducts(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await setUserContext();
      
      const productData = {
        name: formData.name,
        cost_price: parseFloat(formData.cost_price),
        sale_price: parseFloat(formData.sale_price),
        quantity: parseInt(formData.quantity),
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        is_order_product: formData.is_order_product || false,
        customer_name: formData.is_order_product ? formData.customer_name : null,
      };

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
          description: "Produto criado com sucesso!",
        });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      quantity: product.quantity.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_order_product: product.is_order_product || false,
      customer_name: (product as any).customer_name || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await setUserContext();
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData({...formData, image_url: data.publicUrl});
      
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cost_price: '',
      sale_price: '',
      quantity: '',
      category_id: '',
      image_url: '',
      is_order_product: false,
      customer_name: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p>Carregando produtos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
        <div className="flex gap-2">
          <OrderProductsPDFReport />
          <StockProductsPDFReport />
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                {formData.quantity === '0' && (
                  <div className="mt-1">
                    <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      Tipo: Sem Estoque
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.filter(category => category.name !== 'Encomendas').map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="image">Imagem do Produto</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                {imageUploading && (
                  <p className="text-sm text-gray-500 mt-1">Enviando imagem...</p>
                )}
                {formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded border cursor-pointer"
                      onClick={() => setSelectedImage(formData.image_url)}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="is_order_product">
                  <input
                    type="checkbox"
                    id="is_order_product"
                    checked={formData.is_order_product}
                    onChange={(e) => setFormData({...formData, is_order_product: e.target.checked})}
                    className="mr-2"
                  />
                  Produto de Encomenda
                </Label>
              </div>

              {formData.is_order_product && (
                <div className="md:col-span-2">
                  <Label htmlFor="customer_name">Nome do Cliente</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name || ''}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="Digite o nome do cliente"
                    required={formData.is_order_product}
                  />
                </div>
              )}

              <div className="md:col-span-2 flex space-x-2">
                <Button type="submit">
                  {editingProduct ? 'Atualizar Produto' : 'Criar Produto'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {typeFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Preço de Custo</h3>
              </div>
              <p className="text-2xl font-bold text-primary">
                R$ {filteredProducts.reduce((sum, product) => sum + Number(product.cost_price), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Preço de Venda</h3>
              </div>
              <p className="text-2xl font-bold text-primary">
                R$ {filteredProducts.reduce((sum, product) => sum + Number(product.sale_price), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Lista de Produtos</span>
            </CardTitle>
            <div className="flex space-x-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="p-2 border rounded-md bg-background"
              >
                <option value="">Todos os tipos</option>
                <option value="Encomenda">Encomenda</option>
                <option value="Estoque">Estoque</option>
                <option value="Sem Estoque">Sem Estoque</option>
              </select>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço Custo</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? (
                      <ImageModal imageUrl={product.image_url} productName={product.name}>
                        <div className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border">
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        </div>
                      </ImageModal>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.categories?.name || 'Sem categoria'}
                  </TableCell>
                  <TableCell>R$ {Number(product.cost_price).toFixed(2)}</TableCell>
                  <TableCell>R$ {Number(product.sale_price).toFixed(2)}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={
                      product.is_order_product ? "secondary" : 
                      product.quantity === 0 ? "destructive" : "default"
                    }>
                      {product.is_order_product ? 'Encomenda' : 
                       product.quantity === 0 ? 'Sem Estoque' : 'Estoque'}
                    </Badge>
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
                        onClick={() => handleDelete(product)}
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

export default ProductsPage;
