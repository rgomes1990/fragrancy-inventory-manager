import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, UserCheck } from 'lucide-react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Seller {
  id: string;
  name: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

const SellersPage = () => {
  const { tenantId, isAdmin, getTenantIdForInsert } = useTenantFilter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const fetchSellers = async () => {
    try {
      let query = supabase.from('sellers').select('*').order('name');
      
      // Aplicar filtro de tenant para usuários não-admin
      if (!isAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os vendedores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId !== undefined) {
      fetchSellers();
    }
  }, [tenantId, isAdmin]);

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingSeller(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const supabaseClient = supabaseWithUser();
      
      if (editingSeller) {
        const { error } = await supabaseClient
          .from('sellers')
          .update({ name: formData.name })
          .eq('id', editingSeller.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Vendedor atualizado com sucesso!",
        });
      } else {
        const { error } = await supabaseClient
          .from('sellers')
          .insert([{ 
            name: formData.name, 
            tenant_id: getTenantIdForInsert() 
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Vendedor cadastrado com sucesso!",
        });
      }

      resetForm();
      fetchSellers();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o vendedor.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({ name: seller.name });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!sellerToDelete) return;

    try {
      const supabaseClient = supabaseWithUser();
      const { error } = await supabaseClient
        .from('sellers')
        .delete()
        .eq('id', sellerToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vendedor excluído com sucesso!",
      });

      setSellerToDelete(null);
      fetchSellers();
    } catch (error) {
      console.error('Erro ao excluir vendedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o vendedor.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
        <Dialog open={showForm} onOpenChange={(open) => {
          if (!open) resetForm();
          setShowForm(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Vendedor</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome do vendedor"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSeller ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Lista de Vendedores ({sellers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>
                      {new Date(seller.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(seller)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSellerToDelete(seller)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum vendedor cadastrado. Clique em "Novo Vendedor" para adicionar.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!sellerToDelete} onOpenChange={() => setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o vendedor "{sellerToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellersPage;
