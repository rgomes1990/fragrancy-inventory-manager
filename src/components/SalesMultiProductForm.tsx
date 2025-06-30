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

  // Função para validar e filtrar dados com logs ainda mais detalhados
  const getValidCustomers = () => {
    console.log('=== MULTI FORM: VALIDATING CUSTOMERS ===');
    console.log('MultiForm - Raw customers data:', customers);
    
    if (!Array.isArray(customers)) {
      console.error('MultiForm - Customers is not an array:', typeof customers);
      return [];
    }

    const validCustomers = customers.filter((customer, index) => {
      console.log(`MultiForm - Checking customer ${index}:`, customer);
      
      if (!customer) {
        console.log(`MultiForm - Customer ${index} is null/undefined`);
        return false;
      }
      
      if (!customer.id) {
        console.log(`MultiForm - Customer ${index} has no ID:`, customer);
        return false;
      }
      
      if (typeof customer.id !== 'string') {
        console.log(`MultiForm - Customer ${index} ID is not a string:`, typeof customer.id, customer.id);
        return false;
      }
      
      if (customer.id.trim() === '') {
        console.log(`MultiForm - Customer ${index} has empty ID after trim:`, customer);
        return false;
      }
      
      if (!customer.name) {
        console.log(`MultiForm - Customer ${index} has no name:`, customer);
        return false;
      }
      
      if (typeof customer.name !== 'string') {
        console.log(`MultiForm - Customer ${index} name is not a string:`, typeof customer.name, customer.name);
        return false;
      }
      
      if (customer.name.trim() === '') {
        console.log(`MultiForm - Customer ${index} has empty name after trim:`, customer);
        return false;
      }
      
      console.log(`MultiForm - Customer ${index} is VALID:`, customer.id, customer.name);
      return true;
    });
    
    console.log('MultiForm - Final valid customers count:', validCustomers.length);
    console.log('MultiForm - Valid customers:', validCustomers);
    return validCustomers;
  };

  const getValidProducts = () => {
    console.log('=== MULTI FORM: VALIDATING PRODUCTS ===');
    console.log('MultiForm - Raw products data:', products);
    
    if (!Array.isArray(products)) {
      console.error('MultiForm - Products is not an array:', typeof products);
      return [];
    }

    const validProducts = products.filter((product, index) => {
      console.log(`MultiForm - Checking product ${index}:`, product);
      
      if (!product) {
        console.log(`MultiForm - Product ${index} is null/undefined`);
        return false;
      }
      
      if (!product.id) {
        console.log(`MultiForm - Product ${index} has no ID:`, product);
        return false;
      }
      
      if (typeof product.id !== 'string') {
        console.log(`MultiForm - Product ${index} ID is not a string:`, typeof product.id, product.id);
        return false;
      }
      
      if (product.id.trim() === '') {
        console.log(`MultiForm - Product ${index} has empty ID after trim:`, product);
        return false;
      }
      
      if (!product.name) {
        console.log(`MultiForm - Product ${index} has no name:`, product);
        return false;
      }
      
      if (typeof product.name !== 'string') {
        console.log(`MultiForm - Product ${index} name is not a string:`, typeof product.name, product.name);
        return false;
      }
      
      if (product.name.trim() === '') {
        console.log(`MultiForm - Product ${index} has empty name after trim:`, product);
        return false;
      }
      
      if (product.quantity <= 0) {
        console.log(`MultiForm - Product ${index} has no stock:`, product);
        return false;
      }
      
      console.log(`MultiForm - Product ${index} is VALID:`, product.id, product.name);
      return true;
    });
    
    console.log('MultiForm - Final valid products count:', validProducts.length);
    console.log('MultiForm - Valid products:', validProducts);
    return validProducts;
  };

  const getProductsByCategory = () => {
    const validProducts = getValidProducts();
    console.log('=== MULTI FORM: GROUPING PRODUCTS BY CATEGORY ===');
    
    const grouped = validProducts.reduce((acc, product) => {
      const categoryName = (product.categories?.name && typeof product.categories.name === 'string' && product.categories.name.trim()) || 'Sem categoria';
      console.log(`MultiForm - Product ${product.id} (${product.name}) -> Category: ${categoryName}`);
      
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
    
    console.log('MultiForm - Products grouped by category:', grouped);
    return grouped;
  };

  const validCustomers = getValidCustomers();
  const validProducts = getValidProducts();
  const productsByCategory = getProductsByCategory();

  console.log('=== MULTI FORM: FINAL RENDER DATA ===');
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
                    console.log('=== MULTI FORM: RENDERING CUSTOMER SELECTITEM ===');
                    console.log('MultiForm - Customer ID:', customer.id);
                    console.log('MultiForm - Customer Name:', customer.name);
                    console.log('MultiForm - ID type:', typeof customer.id);
                    console.log('MultiForm - ID value check:', customer.id ? 'has value' : 'no value');
                    console.log('MultiForm - ID trim check:', customer.id?.trim() ? 'not empty after trim' : 'empty after trim');
                    
                    // Verificação extra rigorosa antes de renderizar
                    if (!customer.id || typeof customer.id !== 'string' || customer.id.trim() === '') {
                      console.error('MultiForm - BLOCKED: Customer with invalid ID from rendering:', customer);
                      return null;
                    }
                    
                    console.log('MultiForm - RENDERING: Customer SelectItem with ID:', customer.id);
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
                                  console.log('=== MULTI FORM: RENDERING PRODUCT SELECTITEM ===');
                                  console.log('MultiForm - Product ID:', product.id);
                                  console.log('MultiForm - Product Name:', product.name);
                                  console.log('MultiForm - ID type:', typeof product.id);
                                  console.log('MultiForm - ID value check:', product.id ? 'has value' : 'no value');
                                  console.log('MultiForm - ID trim check:', product.id?.trim() ? 'not empty after trim' : 'empty after trim');
                                  
                                  // Verificação extra rigorosa antes de renderizar
                                  if (!product.id || typeof product.id !== 'string' || product.id.trim() === '') {
                                    console.error('MultiForm - BLOCKED: Product with invalid ID from rendering:', product);
                                    return null;
                                  }
                                  
                                  console.log('MultiForm - RENDERING: Product SelectItem with ID:', product.id);
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
