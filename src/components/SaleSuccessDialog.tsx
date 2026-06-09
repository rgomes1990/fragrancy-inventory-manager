import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, MessageCircle, Copy, Printer, Plus, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface SaleSuccessItem {
  name: string;
  quantity: number;
  subtotal: number;
  isKit?: boolean;
}

export interface SaleSuccessData {
  customerName: string;
  customerWhatsapp?: string | null;
  items: SaleSuccessItem[];
  discount?: number;
  total: number;
  paymentType?: string | null;
  paymentAmount?: number | null;
  /** valor recebido especificamente neste lançamento (parcial) */
  paidNow?: number | null;
  /** acumulado já pago no pedido (após este recebimento) */
  paidToDate?: number | null;
  /** quanto ainda falta após este recebimento */
  remaining?: number | null;
  /** true = venda 100% quitada; false = ainda parcial/pendente */
  isFullyPaid?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNewSale: () => void;
  data: SaleSuccessData | null;
}

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

const buildMessage = (d: SaleSuccessData) => {
  const lines: string[] = [];
  const isPartial = d.isFullyPaid === false;
  lines.push(isPartial ? `*Recebimento de Pagamento*` : `*Resumo do Pedido*`);
  lines.push(`Cliente: ${d.customerName}`);
  lines.push('');
  for (const it of d.items) {
    lines.push(`${it.isKit ? '🎁 ' : ''}${it.name} x${it.quantity}  -  ${fmt(it.subtotal)}`);
  }
  if (d.discount && d.discount > 0) lines.push(`Desconto: - ${fmt(d.discount)}`);
  lines.push('');
  lines.push(`*Total do pedido: ${fmt(d.total)}*`);
  if (d.paidNow != null) {
    lines.push(`Recebido agora: ${fmt(d.paidNow)}${d.paymentType ? ` (${d.paymentType})` : ''}`);
  } else if (d.paymentType && d.paymentAmount) {
    lines.push(`Pagamento: ${d.paymentType} ${fmt(d.paymentAmount)}`);
  }
  if (d.paidToDate != null) lines.push(`Total pago: ${fmt(d.paidToDate)}`);
  if (d.remaining != null && d.remaining > 0) lines.push(`*Saldo a pagar: ${fmt(d.remaining)}*`);
  if (d.isFullyPaid) lines.push(`✅ Pedido quitado!`);
  return lines.join('\n');
};

const onlyDigits = (s: string) => s.replace(/\D/g, '');

const SaleSuccessDialog: React.FC<Props> = ({ open, onClose, onNewSale, data }) => {
  if (!data) return null;

  const message = buildMessage(data);

  const handleWhats = () => {
    const digits = onlyDigits(data.customerWhatsapp || '');
    const phone = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Copiado!', description: 'Resumo copiado para a área de transferência.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    const html = `
      <html><head><title>Cupom</title>
      <style>
        body{font-family:'Courier New',monospace;padding:16px;max-width:300px;margin:auto;font-size:13px}
        h2{text-align:center;margin:0 0 8px}
        .row{display:flex;justify-content:space-between;margin:4px 0}
        hr{border:none;border-top:1px dashed #000;margin:8px 0}
        .total{font-weight:bold;font-size:15px}
        .center{text-align:center}
      </style></head><body>
      <h2>CUPOM DE VENDA</h2>
      <div class="center">${new Date().toLocaleString('pt-BR')}</div>
      <hr/>
      <div><strong>Cliente:</strong> ${data.customerName}</div>
      <hr/>
      ${data.items.map(it => `<div class="row"><span>${it.isKit ? '[Kit] ' : ''}${it.name} x${it.quantity}</span><span>${fmt(it.subtotal)}</span></div>`).join('')}
      ${data.discount && data.discount > 0 ? `<div class="row"><span>Desconto</span><span>- ${fmt(data.discount)}</span></div>` : ''}
      <hr/>
      <div class="row total"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
      ${data.paymentType && data.paymentAmount ? `<div class="row"><span>${data.paymentType}</span><span>${fmt(data.paymentAmount)}</span></div>` : ''}
      <hr/>
      <div class="center">Obrigado pela preferência!</div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
      </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const isPartial = data.isFullyPaid === false;
  const title = isPartial ? 'Pagamento Recebido!' : 'Venda Finalizada!';
  const headerColor = isPartial ? 'bg-amber-500' : 'bg-green-500';
  const headerText = isPartial ? 'text-amber-600' : 'text-green-600';
  const cardBg = isPartial ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className={`w-14 h-14 rounded-xl ${headerColor} flex items-center justify-center shadow-md`}>
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </div>
          <h2 className={`text-2xl font-bold text-center ${headerText} mb-3`}>{title}</h2>
          <div className="text-center mb-1 text-2xl font-semibold">
            {fmt(data.paidNow != null ? data.paidNow : data.total)}
          </div>
          <div className="text-center text-sm text-muted-foreground mb-5">{data.customerName}</div>

          <div className={`${cardBg} border rounded-lg p-4 mb-5`}>
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <ClipboardList className="w-4 h-4" /> Resumo do Pedido
            </div>
            <div className="space-y-2 text-sm">
              {data.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.isKit ? '🎁 ' : ''}{it.name} x{it.quantity}</span>
                  <span>{fmt(it.subtotal)}</span>
                </div>
              ))}
              {data.discount && data.discount > 0 ? (
                <div className="flex justify-between text-red-500">
                  <span>Desconto</span>
                  <span>- {fmt(data.discount)}</span>
                </div>
              ) : null}
            </div>
            <div className="border-t border-current opacity-20 my-3" />
            <div className="flex justify-between font-semibold">
              <span>Total do pedido</span>
              <span>{fmt(data.total)}</span>
            </div>
            {data.paidNow != null && (
              <div className="flex justify-between text-sm mt-1">
                <span>Recebido agora{data.paymentType ? ` (${data.paymentType})` : ''}</span>
                <span className="font-semibold text-emerald-700">{fmt(data.paidNow)}</span>
              </div>
            )}
            {data.paidToDate != null && (
              <div className="flex justify-between text-sm">
                <span>Total pago</span>
                <span className="text-emerald-700">{fmt(data.paidToDate)}</span>
              </div>
            )}
            {data.remaining != null && data.remaining > 0 && (
              <div className="flex justify-between text-sm font-bold">
                <span>Saldo a pagar</span>
                <span className="text-rose-600">{fmt(data.remaining)}</span>
              </div>
            )}
            {data.isFullyPaid && (
              <div className="mt-2 text-center text-sm font-semibold text-emerald-700">
                ✅ Pedido 100% quitado
              </div>
            )}
            {data.paidNow == null && data.paymentType && data.paymentAmount ? (
              <div className="text-xs text-muted-foreground mt-1">
                · {data.paymentType.toLowerCase()}: {fmt(data.paymentAmount)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={handleWhats} className="bg-green-500 hover:bg-green-600 text-white flex-col h-auto py-3">
              <MessageCircle className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">WhatsApp</span>
            </Button>
            <Button onClick={handleCopy} variant="outline" className="flex-col h-auto py-3">
              <Copy className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Copiar</span>
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-col h-auto py-3">
              <Printer className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Imprimir</span>
            </Button>
            <Button onClick={onNewSale} className="bg-indigo-500 hover:bg-indigo-600 text-white flex-col h-auto py-3">
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Nova Venda</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleSuccessDialog;
