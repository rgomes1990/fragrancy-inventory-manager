import { salePaymentsApi, expensesApi, salesApi } from '@/services/apiClient';

const CAIXA_LEGACY_START = '2025-08-29';

/**
 * Calcula o saldo atual do "Caixa da Empresa".
 * Formula: total recebido (sale_payments de vendas desde 29/08/2025) - despesas + entradas de caixa
 */
export async function calculateCashBalance(tenantId: string | null, isAdmin = false): Promise<number> {
  const [allSales, allPayments, expensesData] = await Promise.all([
    salesApi.list(),
    salePaymentsApi.list(),
    expensesApi.list(),
  ]);

  // IDs de vendas no periodo do caixa
  const salesInPeriod = new Set<string>();
  (allSales || []).forEach((s: any) => {
    if (s.sale_date >= CAIXA_LEGACY_START) {
      salesInPeriod.add(s.id);
    }
  });

  // Total recebido = soma de sale_payments de vendas no periodo
  const totalReceived = (allPayments || []).reduce((sum: number, p: any) => {
    const saleId = p.sale_id || p.sale_group_id;
    if (salesInPeriod.has(saleId)) {
      return sum + Number(p.amount || 0);
    }
    return sum;
  }, 0);

  // Despesas e entradas
  const totalExpenses = (expensesData || []).reduce((s: number, e: any) =>
    e.category !== 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);
  const totalCashIn = (expensesData || []).reduce((s: number, e: any) =>
    e.category === 'Entrada de Caixa' ? s + Number(e.amount) : s, 0);

  return totalReceived - totalExpenses + totalCashIn;
}

export const CASH_BALANCE_PERIOD_START = CAIXA_LEGACY_START;
