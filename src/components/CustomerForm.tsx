
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerFormProps {
  editingCustomer: Customer | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const CustomerForm = ({ editingCustomer, onCancel, onSuccess }: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
  });
  const { currentUser } = useAuth();
  const isDanilo = currentUser === 'Danilo';

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name,
        whatsapp: editingCustomer.whatsapp || '',
        email: editingCustomer.email || '',
      });
    }
  }, [editingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const customerData = {
        name: formData.name,
        whatsapp: isDanilo ? null : (formData.whatsapp || null),
        email: formData.email || null,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado com sucesso!",
        });
      }

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente.",
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
  };

  return (
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
          {!isDanilo && (
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
          )}
          <div className={isDanilo ? 'md:col-span-2' : ''}>
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
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
