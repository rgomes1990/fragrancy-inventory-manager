
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface ProductOrderRequestDialogProps {
  product: Product;
  onSuccess?: () => void;
}

const ProductOrderRequestDialog: React.FC<ProductOrderRequestDialogProps> = ({ 
  product, 
  onSuccess 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUserContext } = useAuth();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    requested_quantity: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await setUserContext();
      
      const requestData = {
        product_id: product.id,
        customer_name: formData.customer_name,
        requested_quantity: parseInt(formData.requested_quantity),
        notes: formData.notes || null,
        status: 'Pendente',
      };

      const { error } = await supabase
        .from('product_order_requests')
        .insert([requestData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Solicitação de encomenda para ${product.name} criada com sucesso!`,
      });

      // Reset form
      setFormData({
        customer_name: '',
        requested_quantity: '',
        notes: '',
      });
      
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Solicitar Encomenda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Encomenda - {product.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer_name">Nome do Cliente</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="requested_quantity">Quantidade Solicitada</Label>
            <Input
              id="requested_quantity"
              type="number"
              min="1"
              value={formData.requested_quantity}
              onChange={(e) => setFormData({...formData, requested_quantity: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Informações adicionais sobre a encomenda..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Solicitação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductOrderRequestDialog;
