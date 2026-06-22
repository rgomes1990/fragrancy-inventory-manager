export interface CashClosing {
  id: string;
  tenant_id: string;
  status: 'open' | 'closed';
  opened_at: string | null;
  opened_by: string | null;
  closed_at: string | null;
  period_start: string;
  period_end: string | null;
  opening_balance: number;
  closing_balance: number;
  actual_closing_balance: number | null;
  difference: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  sales_by_type: Record<string, number>;
  total_sales: number;
  expenses: number;
  cash_entries: number;
}
