import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

export interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  saleGroupId: string;
  tenantId: string | null;
  total: number;
  paid: number;
  customerName?: string;
  onSaved?: () => void;
}

const PAYMENT_TYPES = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Link'];

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open, onClose, saleGroupId, tenantId, total, paid, customerName, onSaved,
}) => {
  const remaining = Math.max(total - paid, 0);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Pix');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const loadHistory = async () => {
    const { data } = await (supabase as any)
      .from('sale_payments')
      .select('*')
      .eq('sale_group_id', saleGroupId)
      .order('payment_date', { ascending: true });
    setHistory(data || []);
  };

  useEffect(() => {
    if (open) {
      setAmount(remaining > 0 ? remaining.toFixed(2) : '');
      setPaymentType('Pix');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saleGroupId]);

  const handleSave = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const client = supabaseWithUser();
      const { error } = await (client as any).from('sale_payments').insert([{
        sale_group_id: saleGroupId,
        tenant_id: tenantId,
        amount: value,
        payment_type: paymentType || null,
        payment_date: paymentDate + 'T12:00:00.000Z',
        notes: notes || null,
      }]);
      if (error) throw error;
      toast({ title: 'Pagamento registrado!', description: formatBRL(value) });
      await loadHistory();
      onSaved?.();
      // se quitou, fecha
      const newPaid = paid + value;
      if (newPaid >= total) {
        onClose();
      } else {
        setAmount('');
        setNotes('');
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este recebimento?')) return;
    try {
      const client = supabaseWithUser();
      const { error } = await (client as any).from('sale_payments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Recebimento excluído' });
      await loadHistory();
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const currentPaid = history.reduce((s, h) => s + Number(h.amount), 0);
  const currentRemaining = Math.max(total - currentPaid, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          {customerName && <p className="text-sm text-muted-foreground">{customerName}</p>}
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center bg-muted/40 rounded-lg p-3 mb-2">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold">{formatBRL(total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pago</div>
            <div className="font-semibold text-emerald-600">{formatBRL(currentPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Falta</div>
            <div className="font-semibold text-rose-600">{formatBRL(currentRemaining)}</div>
          </div>
        </div>

        {currentRemaining > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor recebido *</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <select className="w-full h-10 px-3 border rounded-md bg-background"
                  value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div>
                <Label>Observação</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="opcional" />
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Histórico de recebimentos</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded">
                  <div>
                    <span className="font-medium">{formatBRL(Number(h.amount))}</span>
                    <span className="text-muted-foreground"> • {h.payment_type || '—'} • {new Date(h.payment_date).toLocaleDateString('pt-BR')}</span>
                    {h.notes && <div className="text-xs text-muted-foreground">{h.notes}</div>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)}>
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {currentRemaining > 0 && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar Pagamento'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
