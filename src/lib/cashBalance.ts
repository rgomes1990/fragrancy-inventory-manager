import { supabase } from '@/integrations/supabase/client';

const CAIXA_LEGACY_START = '2025-08-29';
const SALE_PAYMENTS_CUTOFF = '2026-06-13';

/**
 * Calcula o saldo atual do "Caixa da Empresa" usando exatamente a mesma
 * lógica do Dashboard. Filtra por tenant_id quando informado.
 */
export async function calculateCashBalance(tenantId: string | null, isAdmin = false): Promise<number> {
  const applyTenant = (q: any) => (!isAdmin && tenantId ? q.eq('tenant_id', tenantId) : q);

  // Vendas legadas (payment_received true ou parcial)
  let legacyQ = supabase
    .from('sales')
    .select('total_price, payment_received, partial_payment_amount, sale_date')
    .gte('sale_date', CAIXA_LEGACY_START);
  legacyQ = applyTenant(legacyQ);
  const { data: legacySales } = await legacyQ;
  const legacyRevenue = (legacySales || []).reduce((sum: number, row: any) => {
    if (row.payment_received) return sum + Number(row.total_price || 0);
    return sum + Number(row.partial_payment_amount || 0);
  }, 0);

  // Pagamentos novos via sale_payments após o cutoff
  let newPayQ: any = (supabase as any)
    .from('sale_payments')
    .select('amount, tenant_id, created_at, sale_group_id')
    .gte('created_at', SALE_PAYMENTS_CUTOFF);
  if (!isAdmin && tenantId) newPayQ = newPayQ.eq('tenant_id', tenantId);
  const { data: newPayments } = await newPayQ;

  const groupIds = Array.from(new Set((newPayments || []).map((p: any) => p.sale_group_id).filter(Boolean)));
  const paidGroupIds = new Set<string>();
  if (groupIds.length > 0) {
    const { data: paidSales } = await supabase
      .from('sales')
      .select('id, sale_group_id, payment_received')
      .or(`sale_group_id.in.(${groupIds.join(',')}),id.in.(${groupIds.join(',')})`)
      .eq('payment_received', true);
    (paidSales || []).forEach((s: any) => {
      if (s.sale_group_id) paidGroupIds.add(s.sale_group_id);
      if (s.id) paidGroupIds.add(s.id);
    });
  }
  const newPaymentsRevenue = (newPayments || []).reduce((sum: number, p: any) => {
    if (paidGroupIds.has(p.sale_group_id)) return sum;
    return sum + Number(p.amount || 0);
  }, 0);

  // Despesas e entradas
  let expQ = supabase.from('expenses').select('amount, category');
  expQ = applyTenant(expQ);
  const { data: expensesData } = await expQ;
  const totalExpenses = (expensesData || []).reduce((s, e: any) => e.category !== 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);
  const totalCashIn = (expensesData || []).reduce((s, e: any) => e.category === 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);

  return legacyRevenue + newPaymentsRevenue - totalExpenses + totalCashIn;
}

export const CASH_BALANCE_PERIOD_START = CAIXA_LEGACY_START;
