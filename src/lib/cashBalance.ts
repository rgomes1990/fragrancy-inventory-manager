import { salesApi, salePaymentsApi, expensesApi } from '@/services/apiClient';

const CAIXA_LEGACY_START = '2025-08-29';
const SALE_PAYMENTS_CUTOFF = '2026-06-13';

/**
 * Calcula o saldo atual do "Caixa da Empresa" usando exatamente a mesma
 * logica do Dashboard. Filtra por tenant_id quando informado.
 *
 * Nota: Com a API PHP, o filtro de tenant e aplicado automaticamente
 * pelo apiClient. Os parametros tenantId e isAdmin sao mantidos por
 * compatibilidade de assinatura mas nao sao mais usados diretamente.
 */
export async function calculateCashBalance(tenantId: string | null, isAdmin = false): Promise<number> {
  // Vendas legadas (payment_received true ou parcial)
  const allSales = await salesApi.list();
  const legacySales = (allSales || []).filter((s: any) => new Date(s.sale_date) >= new Date(CAIXA_LEGACY_START));
  const legacyRevenue = legacySales.reduce((sum: number, row: any) => {
    if (row.payment_received) return sum + Number(row.total_price || 0);
    return sum + Number(row.partial_payment_amount || 0);
  }, 0);

  // Pagamentos novos via sale_payments apos o cutoff
  const allPayments = await salePaymentsApi.list();
  const newPayments = (allPayments || []).filter((p: any) => new Date(p.created_at) >= new Date(SALE_PAYMENTS_CUTOFF));

  // Exclui pagamentos cuja venda ja esta marcada como payment_received=true
  const paidGroupIds = new Set<string>();
  (allSales || []).forEach((s: any) => {
    if (s.payment_received) {
      if (s.sale_group_id) paidGroupIds.add(s.sale_group_id);
      if (s.id) paidGroupIds.add(s.id);
    }
  });

  const newPaymentsRevenue = newPayments.reduce((sum: number, p: any) => {
    if (paidGroupIds.has(p.sale_group_id)) return sum;
    return sum + Number(p.amount || 0);
  }, 0);

  // Despesas e entradas
  const expensesData = await expensesApi.list();
  const totalExpenses = (expensesData || []).reduce((s: number, e: any) => e.category !== 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);
  const totalCashIn = (expensesData || []).reduce((s: number, e: any) => e.category === 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);

  return legacyRevenue + newPaymentsRevenue - totalExpenses + totalCashIn;
}

export const CASH_BALANCE_PERIOD_START = CAIXA_LEGACY_START;
