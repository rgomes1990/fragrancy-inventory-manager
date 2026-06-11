import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShoppingCart, Trash2, Edit, Calendar, Search } from 'lucide-react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sale, Product, Customer, Kit } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';

import SalesMultiProductForm from './SalesMultiProductForm';
import SearchableSelect from './SearchableSelect';
import SaleSuccessDialog, { SaleSuccessData } from './SaleSuccessDialog';

const SalesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantId, isAdmin, getTenantIdForInsert } = useTenantFilter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [balanceMap, setBalanceMap] = useState<Record<string, { total: number; paid: number; remaining: number; status: string }>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [initialKitId, setInitialKitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMultiForm, setShowMultiForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [successData, setSuccessData] = useState<SaleSuccessData | null>(null);
  

  

  // Ler parâmetros da URL na inicialização
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const sellerParam = searchParams.get('seller');
    const customerParam = searchParams.get('customer');
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
    if (sellerParam) {
      setSelectedSeller(sellerParam);
    }
    if (customerParam) {
      setSelectedCustomerId(customerParam);
    }
    const newKitParam = searchParams.get('newKit');
    if (newKitParam) {
      setInitialKitId(newKitParam);
      setShowMultiForm(true);
    }
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date: new Date().toISOString().split('T')[0],
    seller: '',
    payment_received: true,
    partial_payment_amount: '',
    payment_type: '',
  });

  const paymentTypes = ['Débito', 'Crédito', 'Pix', 'Link'];

  const [sellers, setSellers] = useState<{id: string, name: string}[]>([]);

  const fetchData = async () => {
    // Usuário não-admin PRECISA ter tenantId carregado
    if (!isAdmin && !tenantId) {
      setSales([]);
      setProducts([]);
      setCustomers([]);
      setSellers([]);
      setLoading(false);
      return;
    }

    try {
      // Construir queries com filtro de tenant
      let salesQuery = supabase
        .from('sales')
        .select(`
          *,
          customers(id, name, whatsapp, email, created_at, updated_at),
          products(id, name, cost_price, sale_price, quantity, category_id, created_at, updated_at, categories(id, name, created_at, updated_at)),
          kits(id, name, sale_price)
        `);
      
      let productsQuery = supabase
        .from('products')
        .select(`
          *,
          categories(id, name, created_at, updated_at)
        `);
      
      let customersQuery = supabase
        .from('customers')
        .select('*');

      let sellersQuery = supabase
        .from('sellers')
        .select('id, name');

      let kitsQuery = supabase
        .from('kits')
        .select('*, kit_items(*, products(id, name, quantity, cost_price, sale_price))')
        .eq('active', true);

      // Aplicar filtro de tenant para usuários não-admin
      if (!isAdmin && tenantId) {
        salesQuery = salesQuery.eq('tenant_id', tenantId);
        productsQuery = productsQuery.eq('tenant_id', tenantId);
        customersQuery = customersQuery.eq('tenant_id', tenantId);
        sellersQuery = sellersQuery.eq('tenant_id', tenantId);
        kitsQuery = kitsQuery.eq('tenant_id', tenantId);
      }

      let balanceQuery = (supabase as any).from('v_sales_balance').select('sale_group_id, tenant_id, total, paid, remaining, status');
      if (!isAdmin && tenantId) balanceQuery = balanceQuery.eq('tenant_id', tenantId);

      const [salesRes, productsRes, customersRes, sellersRes, kitsRes, balanceRes] = await Promise.all([
        salesQuery.order('created_at', { ascending: false }),
        productsQuery.order('name'),
        customersQuery.order('name'),
        sellersQuery.order('name'),
        kitsQuery.order('name'),
        balanceQuery,
      ]);

      if (salesRes.error) throw salesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (sellersRes.error) throw sellersRes.error;
      if (kitsRes.error) throw kitsRes.error;

      const bmap: Record<string, any> = {};
      (balanceRes?.data || []).forEach((b: any) => {
        bmap[b.sale_group_id] = {
          total: Number(b.total),
          paid: Number(b.paid),
          remaining: Number(b.remaining),
          status: b.status,
        };
      });
      setBalanceMap(bmap);

      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);
      setSellers(sellersRes.data || []);
      setKits((kitsRes.data || []) as any);
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
    // Só buscar dados quando tenantId estiver definido (ou for admin)
    if (isAdmin || tenantId) {
      fetchData();
    }
  }, [tenantId, isAdmin]);

  useEffect(() => {
    filterSalesBySearch();
  }, [sales, balanceMap, searchTerm, selectedMonth, selectedSeller, selectedStatus, selectedCustomerId, selectedPaymentType, startDate, endDate]);

  const filterSalesBySearch = () => {
    let filtered = sales;

    // Filtro por range de datas
    if (startDate || endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && end) {
          return saleDate >= start && saleDate <= end;
        } else if (start) {
          return saleDate >= start;
        } else if (end) {
          return saleDate <= end;
        }
        return true;
      });
    } else if (selectedMonth) {
      // Apenas filtrar por mês se não houver range de datas
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        return saleMonth === selectedMonth;
      });
    }

    if (selectedSeller) {
      filtered = filtered.filter(sale => {
        return sale.seller === selectedSeller;
      });
    }

    // Filtro por cliente
    if (selectedCustomerId) {
      filtered = filtered.filter(sale => sale.customer_id === selectedCustomerId);
    }

    // Filtro por tipo de pagamento
    if (selectedPaymentType) {
      filtered = filtered.filter(sale => (sale as any).payment_type === selectedPaymentType);
    }

    if (selectedStatus) {
      filtered = filtered.filter(sale => {
        const groupKey = (sale as any).sale_group_id || sale.id;
        const bal = balanceMap[groupKey];
        // Fallback para lógica legada caso a venda não esteja na view (não deve acontecer)
        if (!bal) {
          const partialAmount = Number((sale as any).partial_payment_amount) || 0;
          const totalPrice = Number(sale.total_price) || 0;
          if (selectedStatus === 'recebido') return sale.payment_received === true && (partialAmount === 0 || partialAmount >= totalPrice);
          if (selectedStatus === 'pendente') return sale.payment_received === false;
          if (selectedStatus === 'parcial') return sale.payment_received === true && partialAmount > 0 && partialAmount < totalPrice;
          if (selectedStatus === 'a-receber') return sale.payment_received === false || (sale.payment_received === true && partialAmount > 0 && partialAmount < totalPrice);
          return true;
        }
        if (selectedStatus === 'recebido') return bal.status === 'pago';
        if (selectedStatus === 'pendente') return bal.status === 'pendente';
        if (selectedStatus === 'parcial') return bal.status === 'parcial';
        if (selectedStatus === 'a-receber') return bal.status !== 'pago';
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(sale => {
        const searchLower = searchTerm.toLowerCase();
        return (
          sale.customers?.name?.toLowerCase().includes(searchLower) ||
          sale.products?.name?.toLowerCase().includes(searchLower) ||
          (sale as any).kits?.name?.toLowerCase().includes(searchLower) ||
          sale.quantity.toString().includes(searchLower) ||
          sale.unit_price.toString().includes(searchLower) ||
          sale.total_price.toString().includes(searchLower) ||
          new Date(sale.sale_date).toLocaleDateString('pt-BR').includes(searchTerm)
        );
      });
    }

    setFilteredSales(filtered);

    // Total dos resultados filtrados
    let total = 0;
    if (selectedStatus === 'pendente' || selectedStatus === 'parcial' || selectedStatus === 'a-receber') {
      // Para "a receber", soma o que falta receber, deduplicando por grupo
      const seen = new Set<string>();
      filtered.forEach(sale => {
        const groupKey = (sale as any).sale_group_id || sale.id;
        if (seen.has(groupKey)) return;
        seen.add(groupKey);
        const bal = balanceMap[groupKey];
        total += bal ? bal.remaining : Number(sale.total_price);
      });
    } else {
      total = filtered.reduce((sum, sale) => sum + Number(sale.total_price), 0);
    }
    setFilteredTotal(total);
    
    // Manter o cálculo mensal para compatibilidade
    if (selectedMonth) {
      setMonthlyTotal(total);
    } else {
      setMonthlyTotal(0);
    }
  };

  const handleMultiProductSubmit = async (saleData: {
    customer_id: string;
    items: Array<{
      item_type: 'product' | 'kit';
      product_id: string | null;
      kit_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
    sale_date: string;
    seller: string;
    payments?: Array<{ type: string; amount: number }>;
    discount_amount?: number;
    payment_received: boolean;
    partial_payment_amount: number | null;
    payment_type: string | null;
  }) => {
    const tenantIdToUse = getTenantIdForInsert();
    if (!isAdmin && !tenantIdToUse) {
      toast({ title: "Erro", description: "Empresa não identificada. Por favor, faça login novamente.", variant: "destructive" });
      return;
    }
    try {
      // Compute total decrement required per product (combining direct + kit components)
      const productDecrement: Record<string, number> = {};
      for (const item of saleData.items) {
        if (item.item_type === 'product' && item.product_id) {
          productDecrement[item.product_id] = (productDecrement[item.product_id] || 0) + item.quantity;
        } else if (item.item_type === 'kit' && item.kit_id) {
          const kit = kits.find(k => k.id === item.kit_id);
          if (!kit || !kit.kit_items) {
            toast({ title: "Erro", description: "Kit não encontrado.", variant: "destructive" });
            return;
          }
          for (const ki of kit.kit_items) {
            productDecrement[ki.product_id] = (productDecrement[ki.product_id] || 0) + (ki.quantity * item.quantity);
          }
        }
      }

      // Validate stock
      for (const [pid, qty] of Object.entries(productDecrement)) {
        const p = products.find(x => x.id === pid);
        if (!p) {
          toast({ title: "Erro", description: "Produto não encontrado.", variant: "destructive" });
          return;
        }
        if (qty > p.quantity) {
          toast({ title: "Erro", description: `Quantidade insuficiente em estoque para ${p.name}.`, variant: "destructive" });
          return;
        }
      }

      const supabaseClient = supabaseWithUser();
      const groupId = saleData.items.length > 1 ? crypto.randomUUID() : null;

      // Aplica desconto rateado entre itens (proporcional ao subtotal)
      const discount = Number(saleData.discount_amount) || 0;
      const subtotalAll = saleData.items.reduce((s, it) => s + it.subtotal, 0);
      const itemsWithDiscount = saleData.items.map((it) => {
        const ratio = subtotalAll > 0 ? it.subtotal / subtotalAll : 0;
        const itemDisc = discount * ratio;
        const newSubtotal = Math.max(it.subtotal - itemDisc, 0);
        const newUnit = it.quantity > 0 ? newSubtotal / it.quantity : it.unit_price;
        return { ...it, unit_price: newUnit, subtotal: newSubtotal };
      });
      const totalAllItems = itemsWithDiscount.reduce((sum, item) => sum + item.subtotal, 0);

      let firstSaleId: string | null = null;
      for (const item of itemsWithDiscount) {
        const itemPartialPayment = saleData.partial_payment_amount
          ? (item.subtotal / Math.max(totalAllItems, 0.01)) * saleData.partial_payment_amount
          : null;

        const saleRecord: any = {
          customer_id: saleData.customer_id,
          product_id: item.item_type === 'product' ? item.product_id : null,
          kit_id: item.item_type === 'kit' ? item.kit_id : null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.subtotal,
          sale_date: saleData.sale_date + 'T00:00:00.000Z',
          seller: saleData.seller,
          payment_received: saleData.payment_received,
          partial_payment_amount: itemPartialPayment,
          payment_type: saleData.payment_type,
          tenant_id: tenantIdToUse,
          sale_group_id: groupId,
        };

        const { data: inserted, error: saleError } = await supabaseClient.from('sales').insert([saleRecord]).select('id').single();
        if (saleError) throw saleError;
        if (!firstSaleId && inserted) firstSaleId = (inserted as any).id;
      }

      // Registrar cada forma de pagamento em sale_payments
      // Crediário NÃO entra em sale_payments (fica como saldo "A Receber")
      const paymentGroupId = groupId || firstSaleId;
      const paymentsList = (saleData.payments || []).filter(p => p.type !== 'Crediário' && p.amount > 0);

      if (paymentGroupId && paymentsList.length > 0) {
        const rows = paymentsList.map(p => ({
          sale_group_id: paymentGroupId,
          tenant_id: tenantIdToUse,
          amount: p.amount,
          payment_type: p.type,
          payment_date: saleData.sale_date + 'T12:00:00.000Z',
          notes: 'Recebimento no ato da venda',
        }));
        await (supabaseClient as any).from('sale_payments').insert(rows);
      } else if (paymentGroupId && !saleData.payments && saleData.payment_received) {
        // Compat com chamadas legadas
        const initialPaid = saleData.partial_payment_amount && saleData.partial_payment_amount > 0
          ? saleData.partial_payment_amount
          : totalAllItems;
        if (initialPaid > 0) {
          await (supabaseClient as any).from('sale_payments').insert([{
            sale_group_id: paymentGroupId,
            tenant_id: tenantIdToUse,
            amount: initialPaid,
            payment_type: saleData.payment_type || null,
            payment_date: saleData.sale_date + 'T12:00:00.000Z',
            notes: 'Recebimento no ato da venda',
          }]);
        }
      }

      // Apply stock decrements
      for (const [pid, qty] of Object.entries(productDecrement)) {
        const p = products.find(x => x.id === pid);
        if (!p) continue;
        const { error: updateError } = await supabaseClient
          .from('products')
          .update({ quantity: p.quantity - qty })
          .eq('id', pid);
        if (updateError) throw updateError;
      }


      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
      });

      // Build success summary
      const customer = customers.find(c => c.id === saleData.customer_id);
      const summaryItems = saleData.items.map(it => {
        if (it.item_type === 'kit') {
          const k = kits.find(x => x.id === it.kit_id);
          return { name: k?.name || 'Kit', quantity: it.quantity, subtotal: it.subtotal, isKit: true };
        }
        const p = products.find(x => x.id === it.product_id);
        return { name: p?.name || 'Produto', quantity: it.quantity, subtotal: it.subtotal, isKit: false };
      });
      setSuccessData({
        customerName: customer?.name || '',
        customerWhatsapp: (customer as any)?.whatsapp || null,
        items: summaryItems,
        total: totalAllItems,
        paymentType: saleData.payment_type,
        paymentAmount: saleData.partial_payment_amount && saleData.partial_payment_amount > 0
          ? saleData.partial_payment_amount
          : (saleData.payment_received ? totalAllItems : null),
      });

      setShowMultiForm(false);
      setInitialKitId(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Obter cliente com header do usuário atual
      const supabaseClient = supabaseWithUser();
      
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

      const partialAmount = formData.partial_payment_amount ? parseFloat(formData.partial_payment_amount) : null;
      
      const saleData: any = {
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        quantity,
        unit_price,
        total_price,
        sale_date: formData.sale_date + 'T00:00:00.000Z',
        seller: formData.seller,
        payment_received: formData.payment_received,
        partial_payment_amount: partialAmount,
        payment_type: formData.payment_type || null,
      };

      // Adicionar tenant_id para novos registros - com validação
      if (!editingSale) {
        const tenantIdForSale = getTenantIdForInsert();
        if (!isAdmin && !tenantIdForSale) {
          toast({
            title: "Erro",
            description: "Empresa não identificada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        saleData.tenant_id = tenantIdForSale;
      }

      if (editingSale) {
        const { error: saleError } = await supabaseClient
          .from('sales')
          .update(saleData)
          .eq('id', editingSale.id);

        if (saleError) throw saleError;

        const newQuantity = product.quantity + editingSale.quantity - quantity;
        
        console.log(`[EDIÇÃO VENDA] Atualizando estoque do produto ${product.name}:`, {
          estoqueAtual: product.quantity,
          quantidadeAnterior: editingSale.quantity,
          novaQuantidade: quantity,
          novoEstoque: newQuantity,
          productId: formData.product_id
        });

        const { error: updateError } = await supabaseClient
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', formData.product_id);

        if (updateError) {
          console.error('[EDIÇÃO VENDA] Erro ao atualizar estoque:', updateError);
          throw updateError;
        }

        console.log(`[EDIÇÃO VENDA] Estoque atualizado com sucesso para ${product.name}`);

        if (unit_price !== product.sale_price) {
          const { error: priceUpdateError } = await supabaseClient
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
        const { data: insertedSale, error: saleError } = await supabaseClient
          .from('sales')
          .insert([saleData])
          .select('id')
          .single();

        if (saleError) throw saleError;

        // Registrar pagamento inicial (venda simples)
        const initialPaid = partialAmount && partialAmount > 0
          ? partialAmount
          : (formData.payment_received ? total_price : 0);
        if (initialPaid > 0 && insertedSale) {
          await (supabaseClient as any).from('sale_payments').insert([{
            sale_group_id: (insertedSale as any).id,
            tenant_id: saleData.tenant_id,
            amount: initialPaid,
            payment_type: formData.payment_type || null,
            payment_date: formData.sale_date + 'T12:00:00.000Z',
            notes: 'Recebimento no ato da venda',
          }]);
        }

        const newQuantity = product.quantity - quantity;
        const updateData: any = { quantity: newQuantity };

        console.log(`[VENDA SIMPLES] Atualizando estoque do produto ${product.name}:`, {
          estoqueAnterior: product.quantity,
          quantidadeVendida: quantity,
          novoEstoque: newQuantity,
          productId: formData.product_id
        });

        if (unit_price !== product.sale_price) {
          updateData.sale_price = unit_price;
        }

        const { error: updateError } = await supabaseClient
          .from('products')
          .update(updateData)
          .eq('id', formData.product_id);

        if (updateError) {
          console.error('[VENDA SIMPLES] Erro ao atualizar estoque:', updateError);
          throw updateError;
        }

        console.log(`[VENDA SIMPLES] Estoque atualizado com sucesso para ${product.name}`);

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
      seller: sale.seller || '',
      payment_received: sale.payment_received ?? true,
      partial_payment_amount: sale.partial_payment_amount ? sale.partial_payment_amount.toString() : '',
      payment_type: (sale as any).payment_type || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
      const supabaseClient = supabaseWithUser();
      
      const saleKitId = (sale as any).kit_id as string | null;
      if (saleKitId) {
        // Devolver estoque de cada componente do kit
        const kit = kits.find(k => k.id === saleKitId);
        if (kit?.kit_items) {
          for (const ki of kit.kit_items) {
            const p = products.find(x => x.id === ki.product_id);
            if (p) {
              const novo = p.quantity + (ki.quantity * sale.quantity);
              const { error: upErr } = await supabaseClient.from('products').update({ quantity: novo }).eq('id', p.id);
              if (upErr) throw upErr;
            }
          }
        }
      } else {
        const product = products.find(p => p.id === sale.product_id);
        if (product) {
          const novoEstoque = product.quantity + sale.quantity;
          const { error: updateError } = await supabaseClient
            .from('products')
            .update({ quantity: novoEstoque })
            .eq('id', sale.product_id);
          if (updateError) throw updateError;
        }
      }

      const { error } = await supabaseClient
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
      seller: '',
      payment_received: true,
      partial_payment_amount: '',
      payment_type: '',
    });
    setEditingSale(null);
    setShowForm(false);
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);

  useEffect(() => {
    if (selectedProduct && !editingSale) {
      setFormData(prev => ({
        ...prev,
        unit_price: selectedProduct.sale_price.toString()
      }));
    }
  }, [selectedProduct, editingSale]);

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

  // Filtrar dados válidos de forma mais rigorosa
  const validCustomers = customers.filter(c => c?.id && c?.name);
  const validProducts = products.filter(p => p?.id && p?.name);
  // Filtrar produtos com estoque maior que 0 e que NÃO sejam produtos de encomenda para os selects
  const availableProducts = validProducts.filter(p => p.quantity > 0 && !p.is_order_product);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p>Carregando dados...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SaleSuccessDialog
        open={!!successData}
        onClose={() => setSuccessData(null)}
        onNewSale={() => { setSuccessData(null); setShowMultiForm(true); }}
        data={successData}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 min-w-0">Vendas</h1>
        <Button 
          onClick={() => setShowMultiForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar Venda
        </Button>
      </div>

      {showMultiForm && (
        <SalesMultiProductForm
          customers={validCustomers}
          products={availableProducts}
          kits={kits}
          initialKitId={initialKitId}
          onSubmit={handleMultiProductSubmit}
          onCancel={() => { setShowMultiForm(false); setInitialKitId(null); }}
          sellers={sellers}
        />
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSale ? 'Editar Venda' : 'Nova Venda Simples'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <SearchableSelect
                  options={validCustomers.map(c => ({ value: c.id, label: c.name }))}
                  value={formData.customer_id}
                  onChange={(val) => setFormData({...formData, customer_id: val})}
                  placeholder="Selecione o cliente"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="product">Produto</Label>
                <SearchableSelect
                  options={validProducts
                    .filter(p => p.quantity > 0 || (editingSale && p.id === editingSale.product_id))
                    .map(p => ({ value: p.id, label: `${p.name} (Estoque: ${p.quantity})` }))}
                  value={formData.product_id}
                  onChange={(val) => setFormData({...formData, product_id: val})}
                  placeholder="Selecione o produto"
                  required
                />
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

              <div>
                <Label htmlFor="seller">Vendedor</Label>
                <select 
                  value={formData.seller} 
                  onChange={(e) => setFormData({...formData, seller: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Selecione o vendedor</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.name}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="payment_type">Tipo de Pagamento</Label>
                <select 
                  value={formData.payment_type} 
                  onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Selecione o tipo</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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

              <div className="lg:col-span-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    id="payment_received"
                    type="checkbox"
                    checked={formData.payment_received}
                    onChange={(e) => setFormData({...formData, payment_received: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="payment_received" className="text-sm font-medium cursor-pointer">
                    Recebimento confirmado (desmarque se apenas quiser dar baixa no estoque)
                  </Label>
                </div>
                
                {formData.payment_received && (
                  <div>
                    <Label htmlFor="partial_payment">Valor pago parcialmente (deixe em branco para pagamento total)</Label>
                    <Input
                      id="partial_payment"
                      type="number"
                      step="0.01"
                      value={formData.partial_payment_amount}
                      onChange={(e) => setFormData({...formData, partial_payment_amount: e.target.value})}
                      placeholder="Valor pago"
                    />
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  disabled={!formData.customer_id || !formData.product_id || !formData.quantity || !formData.unit_price || !formData.seller}
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
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Vendas</span>
            </CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar vendas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <select 
                value={selectedSeller} 
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="p-2 border rounded-md w-full"
              >
                <option value="">Todos vendedores</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.name}>
                    {seller.name}
                  </option>
                ))}
              </select>
              <select 
                value={selectedStatus} 
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  if (searchParams.has('status')) {
                    searchParams.delete('status');
                    setSearchParams(searchParams);
                  }
                }}
                className="p-2 border rounded-md w-full"
              >
                <option value="">Todos status</option>
                <option value="recebido">Recebido</option>
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="a-receber">A Receber (todos)</option>
              </select>
              <select 
                value={selectedPaymentType} 
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="p-2 border rounded-md w-full"
              >
                <option value="">Todos tipos</option>
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
                <option value="Pix">Pix</option>
                <option value="Link">Link</option>
              </select>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) setSelectedMonth('');
                  }}
                  placeholder="Data início"
                  className="w-full"
                />
                <span className="text-gray-500 shrink-0">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value) setSelectedMonth('');
                  }}
                  placeholder="Data fim"
                  className="w-full"
                />
              </div>
              {!startDate && !endDate && (
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="p-2 border rounded-md w-full"
                >
                  <option value="">Todos os meses</option>
                  {getMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {(selectedMonth || selectedSeller || selectedStatus || selectedPaymentType || searchTerm || startDate || endDate) && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-800">
                Total dos resultados filtrados: R$ {filteredTotal.toFixed(2)}
              </div>
              <div className="text-sm text-green-700 mt-1">
                {filteredSales.length} {filteredSales.length === 1 ? 'venda encontrada' : 'vendas encontradas'}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Valor Unitário</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Agrupar vendas pelo sale_group_id
                const groupedSales: Map<string, Sale[]> = new Map();
                const ungroupedSales: Sale[] = [];

                filteredSales.forEach((sale) => {
                  const groupId = (sale as any).sale_group_id;
                  if (groupId) {
                    if (!groupedSales.has(groupId)) {
                      groupedSales.set(groupId, []);
                    }
                    groupedSales.get(groupId)!.push(sale);
                  } else {
                    ungroupedSales.push(sale);
                  }
                });

                const renderSaleRow = (sale: Sale, isGrouped: boolean = false, isFirst: boolean = false, groupTotal?: number, groupPaid?: number, groupSize?: number) => (
                  <TableRow key={sale.id} className={isGrouped ? 'bg-muted/30' : ''}>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.customers?.name || 'Cliente não encontrado'}
                    </TableCell>
                    <TableCell>
                      {(sale as any).kits?.name
                        ? <span>🎁 {(sale as any).kits.name} <span className="text-xs text-muted-foreground">(Kit)</span></span>
                        : (sale.products?.name || 'Produto não encontrado')}
                    </TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>R$ {sale.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">R$ {sale.total_price.toFixed(2)}</TableCell>
                    <TableCell>{sale.seller || '-'}</TableCell>
                    <TableCell>
                      {isGrouped && isFirst && groupTotal !== undefined ? (
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            !sale.payment_received 
                              ? 'bg-yellow-100 text-yellow-800'
                              : (groupPaid || 0) > 0 && (groupPaid || 0) < groupTotal
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {!sale.payment_received 
                              ? `Pendente (Total: R$ ${groupTotal.toFixed(2)})` 
                              : (groupPaid || 0) > 0 && (groupPaid || 0) < groupTotal
                              ? `Parcial - Pago: R$ ${(groupPaid || 0).toFixed(2)} | Pendente: R$ ${(groupTotal - (groupPaid || 0)).toFixed(2)}`
                              : `Recebido (Total: R$ ${groupTotal.toFixed(2)})`}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Venda com {groupSize} itens
                          </div>
                        </div>
                      ) : isGrouped ? (
                        <span className="text-xs text-muted-foreground">↳ mesmo grupo</span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          !sale.payment_received 
                            ? 'bg-yellow-100 text-yellow-800'
                            : sale.partial_payment_amount && sale.partial_payment_amount < sale.total_price
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {!sale.payment_received 
                            ? 'Pendente' 
                            : sale.partial_payment_amount && sale.partial_payment_amount < sale.total_price
                            ? `Parcial (R$ ${sale.partial_payment_amount.toFixed(2)})`
                            : 'Recebido'}
                        </span>
                      )}
                    </TableCell>
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
                );

                const rows: React.ReactNode[] = [];

                // Renderizar vendas agrupadas
                groupedSales.forEach((groupSales) => {
                  const groupTotal = groupSales.reduce((sum, s) => sum + Number(s.total_price), 0);
                  const groupPaid = groupSales.reduce((sum, s) => sum + (Number((s as any).partial_payment_amount) || 0), 0);
                  groupSales.forEach((sale, idx) => {
                    rows.push(renderSaleRow(sale, true, idx === 0, groupTotal, groupPaid, groupSales.length));
                  });
                });

                // Renderizar vendas individuais
                ungroupedSales.forEach((sale) => {
                  rows.push(renderSaleRow(sale));
                });

                return rows;
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPage;
