import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Product, Customer } from '@/types/database';

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalesMultiProductFormProps {
  customers: Customer[];
  products: Product[];
  onSubmit: (saleData: {
    customer_id: string;
    items: SaleItem[];
    sale_date: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const SalesMultiProductForm = ({ customers, products, onSubmit, onCancel }: SalesMultiProductFormProps) => {
  const [customerID, setCustomerID] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<SaleItem[]>([
    { product_id: '', quantity: 1, unit_price: 0, subtotal: 0 }
  ]);

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = typeof value === 'number' && field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = typeof value === 'number' && field === 'unit_price' ? value : newItems[index].unit_price;
      newItems[index].subtotal = quantity * unitPrice;
    }
    
    setItems(newItems);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p && p.id === productId);
    if (product) {
      updateItem(index, 'product_id', productId);
      updateItem(index, 'unit_price', product.sale_price);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      item.product_id && item.quantity > 0 && item.unit_price > 0
    );
    
    if (validItems.length === 0) {
      alert('Adicione pelo menos um item à venda');
      return;
    }

    await onSubmit({
      customer_id: customerID,
      items: validItems,
      sale_date: saleDate,
    });
  };

  // Função para validar e filtrar dados com logs detalhados
  const getValidCustomers = () => {
    console.log('MultiForm - Raw customers data:', customers);
    const validCustomers = customers.filter(customer => {
      const isValid = customer && 
        customer.id && 
        typeof customer.id === 'string' &&
        customer.id.trim() !== '' && 
        customer.name && 
        typeof customer.name === 'string' &&
        customer.name.trim() !== '';
      
      if (!isValid) {
        console.log('MultiForm - Invalid customer found:', customer);
      }
      return isValid;
    });
    console.log('MultiForm - Valid customers:', validCustomers);
    return validCustomers;
  };

  const getValidProducts = () => {
    console.log('MultiForm - Raw products data:', products);
    const validProducts = products.filter(product => {
      const isValid = product && 
        product.id && 
        typeof product.id === 'string' &&
        product.id.trim() !== '' && 
        product.name && 
        typeof product.name === 'string' &&
        product.name.trim() !== '' &&
        product.quantity > 0;
      
      if (!isValid) {
        console.log('MultiForm - Invalid product found:', product);
      }
      return isValid;
    });
    console.log('MultiForm - Valid products:', validProducts);
    return validProducts;
  };

  const getProductsByCategory = () => {
    const validProducts = getValidProducts();
    return validProducts.reduce((acc, product) => {
      const categoryName = (product.categories?.name && typeof product.categories.name === 'string' && product.categories.name.trim()) || 'Sem categoria';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  };

  const validCustomers = getValidCustomers();
  const validProducts = getValidProducts();
  const productsByCategory = getProductsByCategory();

  // Log final data before rendering
  console.log('MultiForm - Final valid customers for rendering:', validCustomers);
  console.log('MultiForm - Final valid products for rendering:', validProducts);
  console.log('MultiForm - Products by category for rendering:', productsByCategory);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5" />
          <span>Nova Venda (Múltiplos Produtos)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Cliente</Label>
              <Select value={customerID} onValueChange={setCustomerID}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {validCustomers.map((customer) => {
                    console.log('MultiForm - Rendering customer SelectItem:', customer.id, customer.name);
                    // Extra safety check before rendering
                    if (!customer.id || customer.id.trim() === '') {
                      console.error('MultiForm - Attempted to render customer with empty ID:', customer);
                      return null;
                    }
                    return (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sale_date">Data da Venda</Label>
              <Input
                id="sale_date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Itens da Venda</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedProduct = validProducts.find(p => p.id === item.product_id);
                
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label>Produto</Label>
                      <Select 
                        value={item.product_id} 
                        onValueChange={(value) => handleProductChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => {
                            if (!categoryProducts || categoryProducts.length === 0) return null;
                            
                            return (
                              <div key={categoryName}>
                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">
                                  {categoryName}
                                </div>
                                {categoryProducts.map((product) => {
                                  console.log('MultiForm - Rendering product SelectItem:', product.id, product.name);
                                  // Extra safety check before rendering
                                  if (!product.id || product.id.trim() === '') {
                                    console.error('MultiForm - Attempted to render product with empty ID:', product);
                                    return null;
                                  }
                                  return (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} (Estoque: {product.quantity})
                                    </SelectItem>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedProduct?.quantity || 999}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Subtotal</Label>
                      <Input
                        type="text"
                        value={`R$ ${item.subtotal.toFixed(2)}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <Label>Estoque</Label>
                      <Input
                        type="text"
                        value={selectedProduct ? selectedProduct.quantity.toString() : '0'}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-right mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                Total da Venda: R$ {calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              disabled={!customerID || items.every(item => !item.product_id)}
            >
              Registrar Venda
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SalesMultiProductForm;
