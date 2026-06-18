# Fechamento de Caixa

Funcionalidade para o usuário do tenant registrar manualmente, a qualquer momento, um "fechamento de caixa" que congela o saldo apurado naquele instante. Os fechamentos ficam como histórico imutável (somente leitura). O cálculo do "Caixa da Empresa" no Dashboard continua igual (não zera).

## 1. Banco de dados

Nova tabela `cash_closings` (migração):

- `id` uuid PK
- `tenant_id` uuid (NOT NULL) — isolamento multi-tenant
- `closed_at` timestamptz default now() — momento do fechamento
- `opening_balance` numeric — saldo inicial informado pelo usuário (saldo do fechamento anterior, pré-preenchido)
- `closing_balance` numeric — saldo final calculado (snapshot do "Caixa da Empresa")
- `period_start` timestamptz — data/hora do fechamento anterior (ou 29/08/2025 se for o primeiro)
- `period_end` timestamptz — igual a closed_at
- `notes` text nullable — observações opcionais
- `created_by` text — username
- `created_at` / `updated_at`

GRANTs para `authenticated` + `service_role`. RLS: SELECT/INSERT permitidos quando `tenant_id` bate com o tenant do usuário; UPDATE/DELETE bloqueados (somente leitura após criar). Trigger de auditoria padrão.

## 2. Frontend

### 2.1 Nova página `/cash-closings` (componente `CashClosingsPage.tsx`)

- Botão **"Novo Fechamento"** abre dialog:
  - Mostra "Saldo inicial" (= closing_balance do último fechamento do tenant, ou 0)
  - Mostra "Saldo final apurado" (= cálculo atual do Caixa da Empresa, mesmo formula do Dashboard)
  - Campo opcional "Observações"
  - Botão **Confirmar fechamento** → insere em `cash_closings`
- Lista de fechamentos (tabela): Data/hora, Saldo inicial, Saldo final, Período, Usuário, Observações. Sem editar/excluir (somente leitura). Paginação simples.

### 2.2 Navegação

- Adicionar item "Fechamento de Caixa" no `AppSidebar.tsx` (visível para usuário do tenant; Admin Master também vê).
- Adicionar rota em `App.tsx`.

### 2.3 Cálculo do saldo final

Reaproveitar a mesma lógica usada hoje no `Dashboard.tsx` (vendas pagas desde 29/08/2025 + pagamentos parciais − despesas + entradas de caixa), filtrada por `tenant_id`. Extrair para um helper `src/lib/cashBalance.ts` para garantir consistência entre Dashboard e Fechamento.

## 3. Comportamento

- Não altera nada nas tabelas existentes (vendas, despesas, sale_payments).
- O Dashboard continua mostrando o "Caixa da Empresa" sempre acumulado desde 29/08/2025.
- O fechamento serve apenas como **fotografia auditável** do saldo num momento específico — útil para conferência mensal/diária quando o usuário quiser.

## 4. Detalhes técnicos

- Componentes shadcn já existentes: Dialog, Table, Button, Input, Textarea.
- Usar `useTenantFilter` para listar/inserir.
- Formato de moeda igual ao restante do app (Intl pt-BR).
- Memória do projeto: atualizar índice com referência a `mem://features/cash-closing`.
