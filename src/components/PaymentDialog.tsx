import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { salePaymentsApi, salesApi, customersApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import SaleSuccessDialog, { SaleSuccessData } from './SaleSuccessDialog';

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
  const navigate = useNavigate();
  const remaining = Math.max(total - paid, 0);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Pix');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [successData, setSuccessData] = useState<SaleSuccessData | null>(null);

  const loadHistory = async () => {
    const data = await salePaymentsApi.listByGroup(saleGroupId);
    setHistory(data || []);
  };

  // Sincroniza sales.payment_received com o saldo atual do grupo.
  // Marca todas as linhas como pagas quando o total já foi quitado, e desmarca caso contrário.
  const syncSalesPaymentStatus = async (paidTotal: number) => {
    try {
      const fullyPaid = paidTotal + 0.01 >= total;
      // Buscar vendas pelo sale_group_id
      const allSales = await salesApi.list({ sale_group_id: saleGroupId });
      // Filtrar apenas vendas que realmente pertencem ao grupo (seguranca)
      const groupSales = (allSales || []).filter(
        (s: any) => s.sale_group_id === saleGroupId
      );
      if (groupSales.length > 0) {
        for (const sale of groupSales) {
          await salesApi.update(sale.id, { payment_received: fullyPaid });
        }
      } else {
        // Venda simples - atualiza pelo id
        await salesApi.update(saleGroupId, { payment_received: fullyPaid });
      }
    } catch (e) {
      console.error('Erro ao sincronizar status da venda:', e);
    }
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

  const buildAndShowSuccess = async (paidNow: number, payType: string, newPaidTotal: number) => {
    try {
      // Busca itens da venda (sale_group_id ou id quando venda simples)
      const salesItems = await salesApi.list({ sale_group_id: saleGroupId });
      let allItems = salesItems || [];
      if (allItems.length === 0) {
        // Venda simples - buscar pelo id
        try {
          const single = await salesApi.getById(saleGroupId);
          if (single) allItems = [single];
        } catch { /* ignore */ }
      }

      const items = allItems.map((s: any) => ({
        name: s.kit_name || s.product_name || 'Item',
        quantity: s.quantity,
        subtotal: Number(s.total_price),
        isKit: !!s.kit_name,
      }));

      const customerId = allItems[0]?.customer_id;
      let whatsapp: string | null = null;
      let cName = customerName || '';
      if (customerId) {
        try {
          const c = await customersApi.getById(customerId);
          if (c) {
            whatsapp = c.whatsapp || null;
            if (!cName) cName = c.name;
          }
        } catch { /* ignore */ }
      }

      const remainingAfter = Math.max(total - newPaidTotal, 0);
      setSuccessData({
        customerName: cName,
        customerWhatsapp: whatsapp,
        items,
        total,
        paymentType: payType,
        paidNow,
        paidToDate: newPaidTotal,
        remaining: remainingAfter,
        isFullyPaid: remainingAfter <= 0.001,
      });
    } catch (e) {
      console.error('Erro ao montar resumo:', e);
    }
  };

  const handleSave = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await salePaymentsApi.create({
        sale_group_id: saleGroupId,
        amount: value,
        payment_type: paymentType || null,
        payment_date: paymentDate + 'T12:00:00.000Z',
        notes: notes || null,
      });
      toast({ title: 'Pagamento registrado!', description: formatBRL(value) });
      const newPaid = currentPaid + value;
      await syncSalesPaymentStatus(newPaid);
      await loadHistory();
      onSaved?.();
      // Sempre mostra o popup de resumo (parcial ou final)
      await buildAndShowSuccess(value, paymentType, newPaid);
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
      await salePaymentsApi.delete(id);
      toast({ title: 'Recebimento excluído' });
      const removed = history.find((h: any) => h.id === id);
      const newPaid = Math.max(currentPaid - Number(removed?.amount || 0), 0);
      await syncSalesPaymentStatus(newPaid);
      await loadHistory();
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const currentPaid = history.reduce((s, h) => s + Number(h.amount), 0);
  const currentRemaining = Math.max(total - currentPaid, 0);

  return (
    <>
      <Dialog open={open && !successData} onOpenChange={(o) => !o && onClose()}>
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
              <div className="max-h-56 overflow-y-auto space-y-1">
                {history.map((h) => (
                  <HistoryRow key={h.id} item={h} onDelete={handleDelete} onUpdated={loadHistory} onSavedExternal={onSaved} />
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

      <SaleSuccessDialog
        open={!!successData}
        data={successData}
        onClose={() => {
          setSuccessData(null);
          if (successData?.isFullyPaid) onClose();
          else {
            // reseta o formulário, mantém modal de pagamento aberto para próximo recebimento
            setAmount('');
            setNotes('');
          }
        }}
        onNewSale={() => {
          setSuccessData(null);
          onClose();
          navigate('/sales');
        }}
      />
    </>
  );
};

export default PaymentDialog;

interface HistoryRowProps {
  item: any;
  onDelete: (id: string) => void;
  onUpdated: () => void;
  onSavedExternal?: () => void;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ item, onDelete, onUpdated, onSavedExternal }) => {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(item.amount));
  const [paymentType, setPaymentType] = useState(item.payment_type || 'Pix');
  const [paymentDate, setPaymentDate] = useState(new Date(item.payment_date).toISOString().split('T')[0]);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      toast({ title: 'Erro', description: 'Valor inválido.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await salePaymentsApi.update(item.id, {
        amount: value,
        payment_type: paymentType || null,
        payment_date: paymentDate + 'T12:00:00.000Z',
        notes: notes || null,
      });
      toast({ title: 'Recebimento atualizado' });
      setEditing(false);
      await onUpdated();
      onSavedExternal?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-muted/40 px-3 py-2 rounded space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" />
          <select className="h-9 px-2 border rounded-md bg-background text-sm"
            value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            {['Dinheiro','Pix','Débito','Crédito','Link'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="obs." />
        </div>
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
          <Button size="sm" onClick={save} disabled={saving}><Check className="w-4 h-4" /></Button>
        </div>
      </div>
    );
  }

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded">
      <div>
        <span className="font-medium">{formatBRL(Number(item.amount))}</span>
        <span className="text-muted-foreground"> • {item.payment_type || '—'} • {new Date(item.payment_date).toLocaleDateString('pt-BR')}</span>
        {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Editar">
          <Pencil className="w-4 h-4 text-sky-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)} title="Excluir">
          <Trash2 className="w-4 h-4 text-rose-500" />
        </Button>
      </div>
    </div>
  );
};
