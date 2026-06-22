import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ShoppingCart, Trash2, Edit, Calendar, Search, Lock, Wallet } from 'lucide-react';
import { useCashRegister } from '@/hooks/useCashRegister';
import { salesApi, productsApi, customersApi, sellersApi, kitsApi, salesBalanceApi, salePaymentsApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { Sale, Product, Customer, Kit } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';

import SalesMultiProductForm from './SalesMultiProductForm';
import SearchableSelect from './SearchableSelect';
import SaleSuccessDialog, { SaleSuccessData } from './SaleSuccessDialog';

const SalesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantId, isAdmin, getTenantIdForInsert } = useTenantFilter();
  const { isOpen: isCashRegisterOpen, loading: cashRegisterLoading } = useCashRegister();
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



  // Ler parametros da URL na inicializacao
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

  const paymentTypes = ['Debito', 'Credito', 'Pix', 'Link'];

  const [sellers, setSellers] = useState<{id: string, name: string}[]>([]);

  const fetchData = async () => {
    // Usuario nao-admin PRECISA ter tenantId carregado
    if (!isAdmin && !tenantId) {
      setSales([]);
      setProducts([]);
      setCustomers([]);
      setSellers([]);
      setLoading(false);
      return;
    }

    try {
      const [salesData, productsData, customersData, sellersData, kitsData, balanceData] = await Promise.all([
        salesApi.list(),
        productsApi.list(),
        customersApi.list(),
        sellersApi.list(),
        kitsApi.list(),
        salesBalanceApi.list(),
      ]);

      const bmap: Record<string, any> = {};
      (balanceData || []).forEach((b: any) => {
        bmap[b.sale_id || b.sale_group_id] = {
          total: Number(b.total),
          paid: Number(b.paid),
          remaining: Number(b.remaining),
          status: b.status,
        };
      });
      setBalanceMap(bmap);

      setSales(salesData || []);
      setProducts(productsData || []);
      setCustomers(customersData || []);
      setSellers(sellersData || []);
      setKits((kitsData || []) as any);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Nao foi possivel carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // So buscar dados quando tenantId estiver definido (ou for admin)
    if (isAdmin || tenantId) {
      fetchData();
    }
  }, [tenantId, isAdmin]);

  useEffect(() => {
    filterSalesBySearch();
  }, [sales, balanceMap, searchTerm, selectedMonth, selectedSeller, selectedStatus, selectedCustomerId, selectedPaymentType, startDate, endDate]);

  const getSaleBalance = (sale: Sale) => {
    const groupKey = sale.id;
    return balanceMap[groupKey];
  };

  const getDisplayStatus = (sale: Sale): 'pago' | 'parcial' | 'pendente' => {
    const bal = getSaleBalance(sale);
    if (bal) return bal.status as 'pago' | 'parcial' | 'pendente';

    const partialAmount = Number((sale as any).partial_payment_amount) || 0;
    const totalPrice = Number(sale.total_price) || 0;

    if (sale.payment_received === true && (partialAmount === 0 || partialAmount >= totalPrice)) return 'pago';
    if (partialAmount > 0 && partialAmount < totalPrice) return 'parcial';
    return 'pendente';
  };

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
      // Apenas filtrar por mes se nao houver range de datas
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
        const status = getDisplayStatus(sale);
        if (selectedStatus === 'recebido') return status === 'pago';
        if (selectedStatus === 'pendente') return status === 'pendente' || status === 'parcial';
        if (selectedStatus === 'parcial') return status === 'parcial';
        if (selectedStatus === 'a-receber') return status !== 'pago';
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(sale => {
        const searchLower = searchTerm.toLowerCase();
        const items = (sale as any).items || [];
        const itemNames = items.map((i: any) => (i.product_name || i.kit_name || '').toLowerCase()).join(' ');
        return (
          (sale as any).customer_name?.toLowerCase().includes(searchLower) ||
          itemNames.includes(searchLower) ||
          String(sale.total_price).includes(searchLower) ||
          String((sale as any).sale_number || '').includes(searchLower) ||
          new Date(sale.sale_date).toLocaleDateString('pt-BR').includes(searchTerm)
        );
      });
    }

    // Ordenar por data decrescente (mais recentes primeiro)
    filtered.sort((a, b) => {
      const dateA = a.sale_date || '';
      const dateB = b.sale_date || '';
      if (dateB > dateA) return 1;
      if (dateB < dateA) return -1;
      // Desempate por created_at
      const createdA = (a as any).created_at || '';
      const createdB = (b as any).created_at || '';
      if (createdB > createdA) return 1;
      if (createdB < createdA) return -1;
      return 0;
    });

    setFilteredSales(filtered);

    // Total dos resultados filtrados
    let total = 0;
    if (selectedStatus === 'pendente' || selectedStatus === 'parcial' || selectedStatus === 'a-receber') {
      // Para "a receber", soma o que falta receber, deduplicando por grupo
      const seen = new Set<string>();
      filtered.forEach(sale => {
        const groupKey = sale.id;
        if (seen.has(groupKey)) return;
        seen.add(groupKey);
        const bal = balanceMap[groupKey];
        total += bal ? bal.remaining : Number(sale.total_price);
      });
    } else {
      total = filtered.reduce((sum, sale) => sum + Number(sale.total_price), 0);
    }
    setFilteredTotal(total);

    // Manter o calculo mensal para compatibilidade
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
      toast({ title: "Erro", description: "Empresa nao identificada. Por favor, faca login novamente.", variant: "destructive" });
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
          if (!kit || !(kit as any).kit_items) {
            toast({ title: "Erro", description: "Kit nao encontrado.", variant: "destructive" });
            return;
          }
          for (const ki of (kit as any).kit_items) {
            productDecrement[ki.product_id] = (productDecrement[ki.product_id] || 0) + (ki.quantity * item.quantity);
          }
        }
      }

      // Validate stock
      for (const [pid, qty] of Object.entries(productDecrement)) {
        const p = products.find(x => x.id === pid);
        if (!p) {
          toast({ title: "Erro", description: "Produto nao encontrado.", variant: "destructive" });
          return;
        }
        if (qty > p.quantity) {
          toast({ title: "Erro", description: `Quantidade insuficiente em estoque para ${p.name}.`, variant: "destructive" });
          return;
        }
      }

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

      // Criar UMA venda (cabecalho) com todos os itens
      const saleRecord: any = {
        customer_id: saleData.customer_id,
        total_price: totalAllItems,
        sale_date: saleData.sale_date + 'T00:00:00.000Z',
        seller: saleData.seller,
        payment_received: saleData.payment_received,
        partial_payment_amount: saleData.partial_payment_amount,
        payment_type: saleData.payment_type,
        tenant_id: tenantIdToUse,
        items: itemsWithDiscount.map(item => ({
          product_id: item.item_type === 'product' ? item.product_id : null,
          kit_id: item.item_type === 'kit' ? item.kit_id : null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.subtotal,
        })),
      };

      const inserted = await salesApi.create(saleRecord);
      const saleId = (inserted as any)?.id;

      // Registrar cada forma de pagamento em sale_payments
      // Crediario NAO entra em sale_payments (fica como saldo "A Receber")
      const paymentsList = (saleData.payments || []).filter(p => p.type !== 'Crediario' && p.amount > 0);

      if (saleId && paymentsList.length > 0) {
        for (const p of paymentsList) {
          await salePaymentsApi.create({
            sale_id: saleId,
            tenant_id: tenantIdToUse,
            amount: p.amount,
            payment_type: p.type,
            payment_date: saleData.sale_date + 'T12:00:00.000Z',
            notes: 'Recebimento no ato da venda',
          });
        }
      } else if (saleId && !saleData.payments && saleData.payment_received) {
        const initialPaid = saleData.partial_payment_amount && saleData.partial_payment_amount > 0
          ? saleData.partial_payment_amount
          : totalAllItems;
        if (initialPaid > 0) {
          await salePaymentsApi.create({
            sale_id: saleId,
            tenant_id: tenantIdToUse,
            amount: initialPaid,
            payment_type: saleData.payment_type || null,
            payment_date: saleData.sale_date + 'T12:00:00.000Z',
            notes: 'Recebimento no ato da venda',
          });
        }
      }

      // Apply stock decrements
      for (const [pid, qty] of Object.entries(productDecrement)) {
        const p = products.find(x => x.id === pid);
        if (!p) continue;
        await productsApi.update(pid, { quantity: p.quantity - qty });
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
          return { name: (k as any)?.name || 'Kit', quantity: it.quantity, subtotal: it.subtotal, isKit: true };
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
        description: "Nao foi possivel salvar a venda.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const product = products.find(p => p.id === formData.product_id);
      if (!product) {
        toast({
          title: "Erro",
          description: "Produto nao encontrado.",
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

      const saleDataPayload: any = {
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        quantity,
        unit_price,
        total_price,
        sale_date: formData.sale_date + 'T00:00:00.000Z',
        seller: formData.seller,
      };

      // Campos de pagamento apenas na criacao (baixa de pagamento so pelo menu A Receber)
      if (!editingSale) {
        saleDataPayload.payment_received = formData.payment_received;
        saleDataPayload.partial_payment_amount = partialAmount;
        saleDataPayload.payment_type = formData.payment_type || null;
      }

      // Adicionar tenant_id para novos registros - com validacao
      if (!editingSale) {
        const tenantIdForSale = getTenantIdForInsert();
        if (!isAdmin && !tenantIdForSale) {
          toast({
            title: "Erro",
            description: "Empresa nao identificada. Por favor, faca login novamente.",
            variant: "destructive",
          });
          return;
        }
        saleDataPayload.tenant_id = tenantIdForSale;
      }

      if (editingSale) {
        await salesApi.update(editingSale.id, saleDataPayload);

        const newQuantity = product.quantity + editingSale.quantity - quantity;

        console.log(`[EDICAO VENDA] Atualizando estoque do produto ${product.name}:`, {
          estoqueAtual: product.quantity,
          quantidadeAnterior: editingSale.quantity,
          novaQuantidade: quantity,
          novoEstoque: newQuantity,
          productId: formData.product_id
        });

        await productsApi.update(formData.product_id, { quantity: newQuantity });

        console.log(`[EDICAO VENDA] Estoque atualizado com sucesso para ${product.name}`);

        if (unit_price !== product.sale_price) {
          await productsApi.update(formData.product_id, { sale_price: unit_price });
        }

        toast({
          title: "Sucesso",
          description: "Venda atualizada com sucesso!",
        });
      } else {
        const insertedSale = await salesApi.create(saleDataPayload);

        // Registrar pagamento inicial (venda simples)
        const initialPaid = partialAmount && partialAmount > 0
          ? partialAmount
          : (formData.payment_received ? total_price : 0);
        if (initialPaid > 0 && insertedSale) {
          await salePaymentsApi.create({
            sale_id: (insertedSale as any).id,
            tenant_id: saleDataPayload.tenant_id,
            amount: initialPaid,
            payment_type: formData.payment_type || null,
            payment_date: formData.sale_date + 'T12:00:00.000Z',
            notes: 'Recebimento no ato da venda',
          });
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

        await productsApi.update(formData.product_id, updateData);

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
        description: "Nao foi possivel salvar a venda.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setShowMultiForm(false); // fechar form de criacao se aberto
  };

  const handleEditSubmit = async (saleData: any) => {
    if (!editingSale) return;
    try {
      // Devolver estoque dos itens antigos
      const oldItems = (editingSale as any).items || [];
      for (const item of oldItems) {
        if (item.product_id) {
          const p = products.find(x => x.id === item.product_id);
          if (p) await productsApi.update(item.product_id, { quantity: p.quantity + item.quantity });
        } else if (item.kit_id) {
          const kit = kits.find(k => k.id === item.kit_id);
          if (kit && (kit as any).kit_items) {
            for (const ki of (kit as any).kit_items) {
              const p = products.find(x => x.id === ki.product_id);
              if (p) await productsApi.update(ki.product_id, { quantity: p.quantity + (ki.quantity * item.quantity) });
            }
          }
        }
      }

      // Atualizar cabecalho da venda
      const totalPrice = saleData.items.reduce((s: number, i: any) => s + i.subtotal, 0) - (saleData.discount_amount || 0);
      await salesApi.update(editingSale.id, {
        customer_id: saleData.customer_id,
        sale_date: saleData.sale_date + 'T00:00:00.000Z',
        seller: saleData.seller,
        total_price: Math.max(totalPrice, 0),
      });

      // Deletar itens antigos e criar novos
      const db = await salesApi.getById(editingSale.id);
      // Backend deleta sale_items via CASCADE quando recriamos
      // Vamos usar endpoint direto - deletar itens antigos
      for (const oldItem of (db?.items || [])) {
        try {
          await fetch(`/api/sale-items/${oldItem.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
        } catch { /* ignore */ }
      }

      // Criar novos itens
      for (const item of saleData.items) {
        await fetch('/api/sale-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
          body: JSON.stringify({
            sale_id: editingSale.id,
            product_id: item.product_id || null,
            kit_id: item.kit_id || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.subtotal,
          }),
        });
      }

      // Decrementar estoque dos novos itens
      const productDecrement: Record<string, number> = {};
      for (const item of saleData.items) {
        if (item.item_type === 'product' && item.product_id) {
          productDecrement[item.product_id] = (productDecrement[item.product_id] || 0) + item.quantity;
        } else if (item.item_type === 'kit' && item.kit_id) {
          const kit = kits.find(k => k.id === item.kit_id);
          if (kit && (kit as any).kit_items) {
            for (const ki of (kit as any).kit_items) {
              productDecrement[ki.product_id] = (productDecrement[ki.product_id] || 0) + (ki.quantity * item.quantity);
            }
          }
        }
      }
      // Refetch products para ter estoque atualizado apos devolucao
      const freshProducts = await productsApi.list();
      for (const [pid, qty] of Object.entries(productDecrement)) {
        const p = freshProducts.find((x: any) => x.id === pid);
        if (p) await productsApi.update(pid, { quantity: p.quantity - qty });
      }

      toast({ title: "Venda atualizada com sucesso!" });
      setEditingSale(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err.message || "Falha ao atualizar.", variant: "destructive" });
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
      // Devolver estoque de cada item da venda
      const items = (sale as any).items || [];
      for (const item of items) {
        if (item.kit_id) {
          const kit = kits.find(k => k.id === item.kit_id);
          if (kit && (kit as any).kit_items) {
            for (const ki of (kit as any).kit_items) {
              const p = products.find(x => x.id === ki.product_id);
              if (p) {
                await productsApi.update(ki.product_id, { quantity: p.quantity + (ki.quantity * item.quantity) });
              }
            }
          }
        } else if (item.product_id) {
          const p = products.find(x => x.id === item.product_id);
          if (p) {
            await productsApi.update(item.product_id, { quantity: p.quantity + item.quantity });
          }
        }
      }

      await salesApi.delete(sale.id);

      toast({
        title: "Sucesso",
        description: "Venda excluida com sucesso!",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro",
        description: "Nao foi possivel excluir a venda.",
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

  // Filtrar dados validos de forma mais rigorosa
  const validCustomers = customers.filter(c => c?.id && c?.name);
  const validProducts = products.filter(p => p?.id && p?.name);
  // Filtrar produtos com estoque maior que 0 e que NAO sejam produtos de encomenda para os selects
  const availableProducts = validProducts.filter(p => p.quantity > 0 && !p.is_order_product);

  if (loading || cashRegisterLoading) {
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
      {/* Banner de caixa fechado */}
      {!isCashRegisterOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-800">O caixa está fechado</p>
            <p className="text-sm text-amber-700">Abra o caixa para registrar novas vendas.</p>
          </div>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-2"
            onClick={() => navigate('/cash-closings')}
          >
            <Wallet className="w-4 h-4" /> Abrir Caixa
          </Button>
        </div>
      )}

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
          disabled={!isCashRegisterOpen}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar Venda
        </Button>
      </div>

      {/* Modal de nova venda */}
      <Dialog open={showMultiForm} onOpenChange={(open) => { if (!open) { setShowMultiForm(false); setInitialKitId(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Venda</DialogTitle>
          </DialogHeader>
          <SalesMultiProductForm
            customers={validCustomers}
            products={availableProducts}
            kits={kits}
            initialKitId={initialKitId}
            onSubmit={handleMultiProductSubmit}
            onCancel={() => { setShowMultiForm(false); setInitialKitId(null); }}
            sellers={sellers}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de edicao de venda */}
      <Dialog open={!!editingSale} onOpenChange={(open) => { if (!open) setEditingSale(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Venda #{(editingSale as any)?.sale_number || ''}</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <SalesMultiProductForm
              customers={validCustomers}
              products={availableProducts}
              kits={kits}
              sellers={sellers}
              editingSale={{
                id: editingSale.id,
                sale_number: (editingSale as any).sale_number,
                customer_id: editingSale.customer_id,
                sale_date: editingSale.sale_date,
                seller: editingSale.seller || '',
                total_price: Number(editingSale.total_price),
                items: (editingSale as any).items || [],
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingSale(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
                <option value="Debito">Debito</option>
                <option value="Credito">Credito</option>
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
                  placeholder="Data inicio"
                  className="w-full"
                />
                <span className="text-gray-500 shrink-0">ate</span>
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
                <TableHead>N°</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const status = getDisplayStatus(sale);
                const items = (sale as any).items || [];
                const bal = getSaleBalance(sale);

                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {(sale as any).sale_number ? `#${(sale as any).sale_number}` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(sale as any).customer_name || 'Cliente nao encontrado'}
                    </TableCell>
                    <TableCell>
                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              {item.kit_name
                                ? <span>🎁 {item.kit_name} <span className="text-xs text-muted-foreground">(Kit)</span></span>
                                : (item.product_name || 'Produto')}
                              <span className="text-muted-foreground"> x{item.quantity} - R$ {Number(item.total_price).toFixed(2)}</span>
                            </div>
                          ))}
                          {items.length > 1 && (
                            <div className="text-xs text-muted-foreground font-medium">{items.length} itens</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold">R$ {Number(sale.total_price).toFixed(2)}</TableCell>
                    <TableCell>{sale.seller || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        status === 'pendente' || status === 'parcial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {status === 'pendente'
                          ? 'Pendente'
                          : status === 'parcial'
                          ? `Parcial (R$ ${(bal?.paid || 0).toFixed(2)})`
                          : 'Recebido'}
                      </span>
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPage;
