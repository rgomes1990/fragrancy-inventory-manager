
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Edit, Trash2, Search, Image as ImageIcon, ArrowDownToLine } from 'lucide-react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product, Category, ProductOrderRequest } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';

// Row displayed in the unified table — either a product or an order request
interface DisplayRow {
  type: 'product' | 'order_request';
  id: string;
  name: string;
  category_name: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  image_url?: string;
  badge: 'Estoque' | 'Sem Estoque' | 'Encomenda';
  product?: Product;
  orderRequest?: ProductOrderRequest;
}

import ImageModal from './ImageModal';
import OrderProductsPDFReport from './OrderProductsPDFReport';
import StockProductsPDFReport from './StockProductsPDFReport';

const ProductsPage = () => {
  const { tenantId, isAdmin, getTenantIdForInsert } = useTenantFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderRequests, setOrderRequests] = useState<ProductOrderRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Unified form: new product + stock entry
  const [formData, setFormData] = useState({
    name: '',
    cost_price: '',
    sale_price: '',
    quantity: '',
    category_id: '',
    image_url: '',
    is_order_product: false,
  });

  // Autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<Product | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        nameInputRef.current && !nameInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!isAdmin && !tenantId) {
      setProducts([]);
      setOrderRequests([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      let productsQuery = supabase
        .from('products')
        .select(`*, categories(id, name, created_at, updated_at)`);
      let categoriesQuery = supabase.from('categories').select('*');
      let orderRequestsQuery = supabase
        .from('product_order_requests')
        .select(`*, products(id, name, cost_price, sale_price, quantity, category_id, image_url, created_at, updated_at, is_order_product, categories(id, name, created_at, updated_at))`)
        .order('created_at', { ascending: false });

      if (!isAdmin && tenantId) {
        productsQuery = productsQuery.eq('tenant_id', tenantId);
        categoriesQuery = categoriesQuery.eq('tenant_id', tenantId);
        orderRequestsQuery = orderRequestsQuery.eq('tenant_id', tenantId);
      }

      const [productsRes, categoriesRes, orderRequestsRes] = await Promise.all([
        productsQuery.order('created_at', { ascending: false }),
        categoriesQuery.order('name'),
        orderRequestsQuery
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (orderRequestsRes.error) throw orderRequestsRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setOrderRequests(orderRequestsRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || tenantId) fetchData();
  }, [tenantId, isAdmin]);

  useEffect(() => {
    buildDisplayRows();
  }, [products, orderRequests, searchTerm, typeFilter]);

  const buildDisplayRows = () => {
    const rows: DisplayRow[] = [];

    // Add products as rows
    for (const product of products) {
      rows.push({
        type: 'product',
        id: product.id,
        name: product.name,
        category_name: product.categories?.name || 'Sem categoria',
        cost_price: Number(product.cost_price),
        sale_price: Number(product.sale_price),
        quantity: product.quantity,
        image_url: product.image_url,
        badge: product.is_order_product ? 'Encomenda' : product.quantity === 0 ? 'Sem Estoque' : 'Estoque',
        product,
      });
    }

    // Add order requests as separate rows
    for (const req of orderRequests) {
      rows.push({
        type: 'order_request',
        id: req.id,
        name: req.products?.name || 'Produto não encontrado',
        category_name: req.products?.categories?.name || 'Sem categoria',
        cost_price: Number(req.cost_price || req.products?.cost_price || 0),
        sale_price: Number(req.sale_price || req.products?.sale_price || 0),
        quantity: req.requested_quantity,
        image_url: req.products?.image_url,
        badge: 'Encomenda',
        orderRequest: req,
      });
    }

    // Apply search filter
    let filtered = rows;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.name.toLowerCase().includes(searchLower) ||
        row.category_name.toLowerCase().includes(searchLower) ||
        row.cost_price.toString().includes(searchLower) ||
        row.sale_price.toString().includes(searchLower) ||
        row.quantity.toString().includes(searchLower)
      );
    }
    if (typeFilter) {
      filtered = filtered.filter(row => {
        switch (typeFilter) {
          case 'Encomenda': return row.badge === 'Encomenda';
          case 'Estoque': return row.badge === 'Estoque';
          case 'Sem Estoque': return row.badge === 'Sem Estoque';
          default: return true;
        }
      });
    }
    setDisplayRows(filtered);
  };

  // Handle name input change for autocomplete
  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    setSelectedExistingProduct(null);

    if (value.length >= 2 && !editingProduct) {
      const lower = value.toLowerCase();
      const matches = products.filter(p => p.name.toLowerCase().includes(lower));
      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
      setNameSuggestions([]);
    }
  };

  // Select existing product from suggestions
  const handleSelectExistingProduct = (product: Product) => {
    setSelectedExistingProduct(product);
    setFormData({
      ...formData,
      name: product.name,
      cost_price: '',
      sale_price: product.sale_price.toString(),
      quantity: '',
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_order_product: false,
    });
    setShowSuggestions(false);
  };

  // Calculate estimated new weighted average
  const getWeightedAveragePreview = () => {
    if (!selectedExistingProduct || !formData.cost_price || !formData.quantity) return null;
    const currentQty = selectedExistingProduct.quantity;
    const currentCost = Number(selectedExistingProduct.cost_price);
    const newQty = parseInt(formData.quantity);
    const newCost = parseFloat(formData.cost_price);
    if (isNaN(newQty) || isNaN(newCost) || newQty <= 0) return null;
    const totalQty = currentQty + newQty;
    const avgCost = ((currentQty * currentCost) + (newQty * newCost)) / totalQty;
    return { avgCost: avgCost.toFixed(2), totalQty };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // CASE 1: Editing an existing product (direct update)
      if (editingProduct) {
        const productData: any = {
          name: formData.name,
          cost_price: parseFloat(formData.cost_price),
          sale_price: parseFloat(formData.sale_price),
          quantity: parseInt(formData.quantity),
          category_id: formData.category_id || null,
          image_url: formData.image_url || null,
          is_order_product: formData.is_order_product || false,
        };

        const { error } = await supabaseWithUser()
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });

      // CASE 2: Selected existing product
      } else if (selectedExistingProduct) {
        const qty = parseInt(formData.quantity);
        const cost = parseFloat(formData.cost_price);

        if (!qty || qty <= 0 || isNaN(cost)) {
          toast({ title: "Erro", description: "Informe quantidade e custo válidos.", variant: "destructive" });
          return;
        }

        const tenantId = getTenantIdForInsert();
        if (!isAdmin && !tenantId) {
          toast({ title: "Erro", description: "Empresa não identificada.", variant: "destructive" });
          return;
        }

        // Update sale_price if changed
        if (formData.sale_price && parseFloat(formData.sale_price) !== Number(selectedExistingProduct.sale_price)) {
          await supabaseWithUser()
            .from('products')
            .update({ sale_price: parseFloat(formData.sale_price) })
            .eq('id', selectedExistingProduct.id);
        }

        // Update category/image if changed
        const updateFields: any = {};
        if (formData.category_id && formData.category_id !== (selectedExistingProduct.category_id || '')) {
          updateFields.category_id = formData.category_id || null;
        }
        if (formData.image_url && formData.image_url !== (selectedExistingProduct.image_url || '')) {
          updateFields.image_url = formData.image_url || null;
        }
        if (Object.keys(updateFields).length > 0) {
          await supabaseWithUser()
            .from('products')
            .update(updateFields)
            .eq('id', selectedExistingProduct.id);
        }

        if (formData.is_order_product) {
          // ENCOMENDA: create a product_order_requests record, do NOT add to stock
          const { error } = await supabaseWithUser()
            .from('product_order_requests')
            .insert([{
              product_id: selectedExistingProduct.id,
              customer_name: 'Encomenda',
              requested_quantity: qty,
              cost_price: cost,
              sale_price: formData.sale_price ? parseFloat(formData.sale_price) : Number(selectedExistingProduct.sale_price),
              status: 'Pendente',
              tenant_id: tenantId,
            }]);

          if (error) throw error;
          toast({ title: "Sucesso", description: "Encomenda registrada! As unidades existentes em estoque não foram alteradas." });
        } else {
          // ESTOQUE: insert stock entry → trigger recalculates cost_price & quantity
          const { error } = await supabaseWithUser()
            .from('stock_entries')
            .insert([{
              product_id: selectedExistingProduct.id,
              quantity: qty,
              unit_cost: cost,
              tenant_id: tenantId,
            }]);

          if (error) throw error;
          toast({ title: "Sucesso", description: "Entrada de estoque registrada! Custo médio recalculado automaticamente." });
        }

      // CASE 3: Brand new product
      } else {
        const tenantIdForProduct = getTenantIdForInsert();
        if (!isAdmin && !tenantIdForProduct) {
          toast({ title: "Erro", description: "Empresa não identificada.", variant: "destructive" });
          return;
        }

        const productData: any = {
          name: formData.name,
          cost_price: parseFloat(formData.cost_price),
          sale_price: parseFloat(formData.sale_price),
          quantity: parseInt(formData.quantity),
          category_id: formData.category_id || null,
          image_url: formData.image_url || null,
          is_order_product: formData.is_order_product || false,
          tenant_id: tenantIdForProduct,
        };

        const { error } = await supabaseWithUser()
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({ title: "Erro", description: "Não foi possível salvar o produto.", variant: "destructive" });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSelectedExistingProduct(null);
    setFormData({
      name: product.name,
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      quantity: product.quantity.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_order_product: product.is_order_product || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    try {
      // Check dependent records
      const { data: stockData } = await supabaseWithUser().from('stock_entries').select('id').eq('product_id', product.id);
      const { data: orderData } = await supabaseWithUser().from('product_order_requests').select('id').eq('product_id', product.id);
      const { data: salesData } = await supabaseWithUser().from('sales').select('id').eq('product_id', product.id);

      const stockCount = stockData?.length || 0;
      const orderCount = orderData?.length || 0;
      const salesCount = salesData?.length || 0;

      if (stockCount > 0 || orderCount > 0 || salesCount > 0) {
        const deps: string[] = [];
        if (stockCount > 0) deps.push(`${stockCount} entrada(s) de estoque`);
        if (orderCount > 0) deps.push(`${orderCount} encomenda(s)`);
        if (salesCount > 0) deps.push(`${salesCount} venda(s)`);

        toast({
          title: "Exclusão bloqueada",
          description: `O produto "${product.name}" possui dependências e não pode ser excluído. Dependências encontradas: ${deps.join(', ')}.`,
          variant: "destructive",
        });
        return;
      }

      if (!confirm('Tem certeza que deseja excluir este produto?')) return;

      const { error } = await supabaseWithUser().from('products').delete().eq('id', product.id);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Produto excluído com sucesso!" });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({ title: "Erro", description: "Não foi possível excluir o produto.", variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
      toast({ title: "Sucesso", description: "Imagem enviada com sucesso!" });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast({ title: "Erro", description: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setImageUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', cost_price: '', sale_price: '', quantity: '', category_id: '', image_url: '', is_order_product: false });
    setEditingProduct(null);
    setSelectedExistingProduct(null);
    setShowForm(false);
    setShowSuggestions(false);
  };

  // Convert an order request into a stock entry (merge into product stock)
  const handleConvertOrderToStock = async (req: ProductOrderRequest) => {
    if (!confirm(`Converter encomenda de ${req.requested_quantity} un. para estoque? As unidades serão adicionadas ao estoque do produto.`)) return;
    try {
      const tenantIdInsert = getTenantIdForInsert();
      // Insert stock entry → trigger recalculates cost_price & quantity on the product
      const { error: stockError } = await supabaseWithUser()
        .from('stock_entries')
        .insert([{
          product_id: req.product_id,
          quantity: req.requested_quantity,
          unit_cost: req.cost_price || 0,
          tenant_id: tenantIdInsert,
        }]);
      if (stockError) throw stockError;

      // Delete the order request
      const { error: deleteError } = await supabaseWithUser()
        .from('product_order_requests')
        .delete()
        .eq('id', req.id);
      if (deleteError) throw deleteError;

      toast({ title: "Sucesso", description: "Encomenda convertida em estoque! Custo médio recalculado." });
      fetchData();
    } catch (error) {
      console.error('Erro ao converter encomenda:', error);
      toast({ title: "Erro", description: "Não foi possível converter a encomenda.", variant: "destructive" });
    }
  };

  // Delete an order request
  const handleDeleteOrderRequest = async (req: ProductOrderRequest) => {
    if (!confirm('Tem certeza que deseja excluir esta encomenda?')) return;
    try {
      const { error } = await supabaseWithUser()
        .from('product_order_requests')
        .delete()
        .eq('id', req.id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Encomenda excluída com sucesso!" });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir encomenda:', error);
      toast({ title: "Erro", description: "Não foi possível excluir a encomenda.", variant: "destructive" });
    }
  };

  const weightedPreview = getWeightedAveragePreview();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
        <Card><CardContent className="p-8 text-center"><p>Carregando produtos...</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
        <div className="flex gap-2">
          <OrderProductsPDFReport />
          <StockProductsPDFReport />
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto / Entrada
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Editar Produto' : selectedExistingProduct ? `Entrada de Estoque: ${selectedExistingProduct.name}` : 'Novo Produto / Entrada de Estoque'}
            </CardTitle>
            {!editingProduct && !selectedExistingProduct && (
              <p className="text-sm text-muted-foreground">
                Digite o nome do produto. Se ele já existir, selecione para dar entrada no estoque. Caso contrário, será criado como novo.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product name with autocomplete */}
              <div className="relative md:col-span-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  ref={nameInputRef}
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    if (formData.name.length >= 2 && nameSuggestions.length > 0 && !editingProduct) {
                      setShowSuggestions(true);
                    }
                  }}
                  required
                  disabled={!!selectedExistingProduct}
                  placeholder="Digite o nome do produto..."
                  autoComplete="off"
                />
                {selectedExistingProduct && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-7 text-xs"
                    onClick={() => {
                      setSelectedExistingProduct(null);
                      setFormData({ ...formData, name: '', cost_price: '', sale_price: '', quantity: '', category_id: '', image_url: '', is_order_product: false });
                    }}
                  >
                    Limpar seleção
                  </Button>
                )}
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {nameSuggestions.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm flex justify-between items-center"
                        onClick={() => handleSelectExistingProduct(p)}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground text-xs">
                          Estoque: {p.quantity} | Custo: R$ {Number(p.cost_price).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Weighted average preview for existing product */}
              {selectedExistingProduct && (
                <div className="md:col-span-2 bg-muted p-4 rounded-md space-y-1 text-sm">
                  <p className="font-medium text-foreground">Produto existente selecionado</p>
                  <p>Custo atual: <strong>R$ {Number(selectedExistingProduct.cost_price).toFixed(2)}</strong></p>
                  <p>Estoque atual: <strong>{selectedExistingProduct.quantity}</strong></p>
                  <p>Preço de venda atual: <strong>R$ {Number(selectedExistingProduct.sale_price).toFixed(2)}</strong></p>
                  {weightedPreview && (
                    <>
                      <hr className="my-2 border-border" />
                      <p className="text-primary font-medium">
                        Novo custo médio estimado: <strong>R$ {weightedPreview.avgCost}</strong>
                      </p>
                      <p className="text-primary">
                        Novo estoque total: <strong>{weightedPreview.totalQty}</strong>
                      </p>
                    </>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="cost_price">
                  {selectedExistingProduct ? 'Custo Unitário desta Compra' : 'Preço de Custo'}
                </Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required={!selectedExistingProduct}
                />
              </div>

              <div>
                <Label htmlFor="quantity">
                  {selectedExistingProduct ? 'Quantidade a Adicionar' : 'Quantidade'}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  min={selectedExistingProduct ? "1" : "0"}
                />
                {!selectedExistingProduct && formData.quantity === '0' && (
                  <div className="mt-1">
                    <span className="text-sm font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
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
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.filter(c => c.name !== 'Encomendas').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="image">Imagem do Produto</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" />
                {imageUploading && <p className="text-sm text-muted-foreground mt-1">Enviando imagem...</p>}
                {formData.image_url && (
                  <div className="mt-2">
                    <img src={formData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded border cursor-pointer" onClick={() => setSelectedImage(formData.image_url)} />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="is_order_product">
                  <input
                    type="checkbox"
                    id="is_order_product"
                    checked={formData.is_order_product}
                    onChange={(e) => setFormData({ ...formData, is_order_product: e.target.checked })}
                    className="mr-2"
                  />
                  Produto de Encomenda
                </Label>
              </div>

              {formData.is_order_product && selectedExistingProduct && (
                <div className="md:col-span-2 bg-accent/50 border border-border p-3 rounded-md text-sm">
                  <p className="font-medium text-foreground">⚠️ Modo Encomenda</p>
                  <p className="text-muted-foreground">
                    As {formData.quantity || '0'} unidades serão registradas como encomenda separadamente. 
                    O estoque atual ({selectedExistingProduct.quantity} un.) não será alterado.
                  </p>
                </div>
              )}

              <div className="md:col-span-2 flex space-x-2">
                <Button type="submit">
                  {editingProduct ? 'Atualizar Produto' : selectedExistingProduct ? (formData.is_order_product ? 'Registrar Encomenda' : 'Registrar Entrada de Estoque') : 'Criar Produto'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {typeFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Preço de Custo</h3>
              <p className="text-2xl font-bold text-primary">
                R$ {displayRows.reduce((sum, r) => sum + (r.cost_price * r.quantity), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground">Projeção de Vendas</h3>
              <p className="text-2xl font-bold text-primary">
                R$ {displayRows.reduce((sum, r) => sum + (r.sale_price * r.quantity), 0).toFixed(2)}
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
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
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
              {displayRows.map((row) => (
                <TableRow key={`${row.type}-${row.id}`} className={row.type === 'order_request' ? 'bg-accent/30' : ''}>
                  <TableCell>
                    {row.image_url ? (
                      <ImageModal imageUrl={row.image_url} productName={row.name}>
                        <div className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border">
                          <img src={row.image_url} alt={row.name} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                        </div>
                      </ImageModal>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell>R$ {row.cost_price.toFixed(2)}</TableCell>
                  <TableCell>R$ {row.sale_price.toFixed(2)}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={row.badge === 'Encomenda' ? "secondary" : row.badge === 'Sem Estoque' ? "destructive" : "default"}>
                      {row.badge}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {row.type === 'product' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(row.product!)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(row.product!)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {row.type === 'order_request' && row.orderRequest && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertOrderToStock(row.orderRequest!)}
                            title="Converter para estoque"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrderRequest(row.orderRequest!)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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
