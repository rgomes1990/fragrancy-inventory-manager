
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Users, Search, ShoppingCart } from 'lucide-react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';

interface CustomerWithSales extends Customer {
  salesCount: number;
}

const CustomersPage = () => {
  const navigate = useNavigate();
  const { tenantId, isAdmin, getTenantIdForInsert } = useTenantFilter();
  const [customers, setCustomers] = useState<CustomerWithSales[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithSales[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
  });

  useEffect(() => {
    if (tenantId !== undefined) {
      fetchCustomers();
    }
  }, [tenantId, isAdmin]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.whatsapp?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
    setFilteredCustomers(filtered);
  };

  const fetchCustomers = async () => {
    try {
      // Construir queries com filtro de tenant
      let customersQuery = supabase
        .from('customers')
        .select('*');
      
      let salesQuery = supabase
        .from('sales')
        .select('customer_id');

      // Aplicar filtro de tenant para usuários não-admin
      if (!isAdmin && tenantId) {
        customersQuery = customersQuery.eq('tenant_id', tenantId);
        salesQuery = salesQuery.eq('tenant_id', tenantId);
      }

      // Buscar clientes e vendas em paralelo
      const [customersRes, salesRes] = await Promise.all([
        customersQuery.order('created_at', { ascending: false }),
        salesQuery
      ]);

      if (customersRes.error) throw customersRes.error;
      if (salesRes.error) throw salesRes.error;

      // Contar vendas por cliente
      const salesCountByCustomer: Record<string, number> = {};
      salesRes.data?.forEach(sale => {
        if (sale.customer_id) {
          salesCountByCustomer[sale.customer_id] = (salesCountByCustomer[sale.customer_id] || 0) + 1;
        }
      });

      // Adicionar contagem de vendas aos clientes
      const customersWithSales: CustomerWithSales[] = (customersRes.data || []).map(customer => ({
        ...customer,
        salesCount: salesCountByCustomer[customer.id] || 0
      }));

      // Ordenar: clientes com vendas primeiro, depois por data de cadastro
      customersWithSales.sort((a, b) => {
        if (a.salesCount > 0 && b.salesCount === 0) return -1;
        if (a.salesCount === 0 && b.salesCount > 0) return 1;
        // Se ambos têm ou não têm vendas, ordenar por quantidade de vendas (maior primeiro)
        if (a.salesCount !== b.salesCount) return b.salesCount - a.salesCount;
        // Se igual, ordenar por data de cadastro
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setCustomers(customersWithSales);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = (customer: CustomerWithSales) => {
    if (customer.salesCount > 0) {
      navigate(`/sales?customer=${encodeURIComponent(customer.id)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const customerData: any = {
        name: formData.name,
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
      };

      // Adicionar tenant_id para novos registros - com validação
      if (!editingCustomer) {
        const tenantIdForCustomer = getTenantIdForInsert();
        if (!isAdmin && !tenantIdForCustomer) {
          toast({
            title: "Erro",
            description: "Empresa não identificada. Por favor, faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        customerData.tenant_id = tenantIdForCustomer;
      }

      if (editingCustomer) {
        const { error } = await supabaseWithUser()
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        const { error } = await supabaseWithUser()
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado com sucesso!",
        });
      }

      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      whatsapp: customer.whatsapp || '',
      email: customer.email || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabaseWithUser()
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      whatsapp: '',
      email: '',
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="md:col-span-2 flex space-x-2">
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600">
                  {editingCustomer ? 'Atualizar' : 'Cadastrar'}
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
              <Users className="w-5 h-5" />
              <span>Lista de Clientes</span>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando clientes...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell 
                        className={`font-medium ${customer.salesCount > 0 ? 'text-primary cursor-pointer hover:underline' : ''}`}
                        onClick={() => handleCustomerClick(customer)}
                      >
                        <div className="flex items-center gap-2">
                          {customer.name}
                          {customer.salesCount > 0 && (
                            <ShoppingCart className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.salesCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {customer.salesCount} {customer.salesCount === 1 ? 'compra' : 'compras'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{customer.whatsapp || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>
                        {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersPage;
