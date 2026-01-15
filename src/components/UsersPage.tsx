import React, { useState, useEffect } from 'react';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, User, Eye, EyeOff, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Tenant {
  id: string;
  name: string;
}

interface AuthorizedUser {
  id: string;
  username: string;
  created_at: string | null;
  tenant_id: string | null;
  is_admin: boolean;
  tenant_name?: string;
}

const UsersPage: React.FC = () => {
  const { isAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        supabase
          .from('authorized_users')
          .select('id, username, created_at, tenant_id, is_admin')
          .order('username'),
        supabase
          .from('tenants')
          .select('id, name')
          .order('name')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (tenantsRes.error) throw tenantsRes.error;

      // Mapear nomes dos tenants
      const tenantMap: Record<string, string> = {};
      tenantsRes.data?.forEach(t => {
        tenantMap[t.id] = t.name;
      });

      const usersWithTenantNames = usersRes.data?.map(user => ({
        ...user,
        tenant_name: user.tenant_id ? tenantMap[user.tenant_id] : undefined
      })) || [];

      setUsers(usersWithTenantNames);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEditingUser(null);
    setShowPassword(false);
    setSelectedTenantId('');
    setUserIsAdmin(false);
  };

  const handleOpenDialog = (user?: AuthorizedUser) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword('');
      setSelectedTenantId(user.tenant_id || '');
      setUserIsAdmin(user.is_admin);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('O nome de usuário é obrigatório');
      return;
    }

    if (!editingUser && !password.trim()) {
      toast.error('A senha é obrigatória para novos usuários');
      return;
    }

    // Se não for admin, precisa ter empresa associada
    if (!userIsAdmin && !selectedTenantId) {
      toast.error('Usuários não-administradores precisam estar associados a uma empresa');
      return;
    }

    try {
      const client = supabaseWithUser();

      if (editingUser) {
        const updateData: { 
          username: string; 
          password_hash?: string;
          tenant_id: string | null;
          is_admin: boolean;
        } = {
          username: username.trim(),
          tenant_id: selectedTenantId || null,
          is_admin: userIsAdmin
        };

        if (password.trim()) {
          updateData.password_hash = password.trim();
        }

        const { error } = await client
          .from('authorized_users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('Usuário atualizado com sucesso!');
      } else {
        const { error } = await client
          .from('authorized_users')
          .insert({
            username: username.trim(),
            password_hash: password.trim(),
            tenant_id: selectedTenantId || null,
            is_admin: userIsAdmin
          });

        if (error) throw error;
        toast.success('Usuário criado com sucesso!');
      }

      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um usuário com este nome');
      } else {
        toast.error('Erro ao salvar usuário');
      }
    }
  };

  const handleDeleteClick = (user: AuthorizedUser) => {
    // Não permitir deletar o próprio usuário
    if (user.username === currentUser) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const client = supabaseWithUser();
      const { error } = await client
        .from('authorized_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usuários</h1>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite o nome de usuário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Digite a nova senha' : 'Digite a senha'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_admin"
                    checked={userIsAdmin}
                    onCheckedChange={(checked) => setUserIsAdmin(checked === true)}
                  />
                  <Label htmlFor="is_admin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Administrador Master (acesso a todas as empresas)
                  </Label>
                </div>

                {!userIsAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="tenant">Empresa</Label>
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tenants.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma empresa cadastrada. Crie uma empresa primeiro.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome de Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Criado em</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                    {user.username === currentUser && (
                      <Badge variant="outline" className="ml-2">Você</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Usuário</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.tenant_name ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {user.tenant_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_at
                      ? format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : '-'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(user)}
                        disabled={user.username === currentUser}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.username}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
