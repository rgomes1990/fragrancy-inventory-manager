---
name: Cash Closing
description: Fechamento de caixa manual por tenant; tabela cash_closings somente histórico
type: feature
---
- Tabela `cash_closings` (tenant_id, closed_at, period_start, period_end, opening_balance, closing_balance, notes, created_by).
- Página `/cash-closings`: lista + dialog "Novo Fechamento" que grava snapshot do Caixa atual.
- Saldo final calculado por `src/lib/cashBalance.ts` (mesma fórmula do Dashboard: vendas pagas desde 29/08/2025 + sale_payments após 13/06/2026 − despesas + Entrada de Caixa).
- Não altera vendas/despesas. Dashboard segue acumulando desde 29/08/2025. Fechamentos são imutáveis (sem update/delete).
- Saldo inicial pré-preenchido com o `closing_balance` do último fechamento.
