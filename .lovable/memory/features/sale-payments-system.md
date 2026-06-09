---
name: Sale Payments System
description: Multi-recebimento por venda via tabela sale_payments + view v_sales_balance + página A Receber
type: feature
---
**Tabela `sale_payments`**: cada linha = 1 recebimento de uma venda. Vincula via `sale_group_id` (= `sales.sale_group_id` quando existir, senão `sales.id`).
Campos: `sale_group_id`, `tenant_id`, `amount`, `payment_type`, `payment_date`, `notes`.

**View `v_sales_balance`**: agrega por `sale_group_id` retornando `total`, `paid`, `remaining`, `status` ('pago' | 'parcial' | 'pendente'). Status é sempre calculado, nunca armazenado.

**Fluxo**:
- Ao criar venda (PDV ou simples), se houver valor recebido, insere automaticamente 1 registro em `sale_payments` com notes='Recebimento no ato da venda'.
- Página `/receivables` (sidebar "A Receber") lista pedidos com status != 'pago'. Botão "Receber" abre `PaymentDialog` para registrar novo recebimento ou excluir lançamentos do histórico.
- Colunas legadas `sales.payment_received` e `sales.partial_payment_amount` permanecem por compatibilidade dos filtros existentes na página de Vendas.
