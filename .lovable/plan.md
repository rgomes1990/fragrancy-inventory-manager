# Gestão de Pagamentos Pendentes e Parciais

## Problema
Hoje a venda guarda apenas **um** valor pago (`partial_payment_amount`). Quando o cliente paga em várias parcelas ao longo do tempo, não há como registrar cada recebimento, ver histórico, nem saber automaticamente quanto ainda falta. Precisamos de uma estrutura que suporte **N recebimentos por venda** até quitar.

## Solução proposta

### 1. Nova tabela `sale_payments` (recebimentos)
Cada linha = um pagamento que o cliente fez para uma venda.

Campos principais:
- `sale_group_id` (vincula ao pedido inteiro, não a um item)
- `amount` (valor pago naquele recebimento)
- `payment_type` (Pix, Débito, Crédito, Dinheiro, Link)
- `payment_date` (data em que o cliente pagou)
- `notes` (observação opcional: "1ª parcela", "via PIX da esposa", etc.)
- `tenant_id`, `created_at`

Vantagens: histórico completo, várias formas de pagamento por venda, relatórios fiéis ao caixa real.

### 2. Status calculado automaticamente
A venda deixa de depender só do checkbox "recebido". O status passa a vir da soma dos pagamentos vs. `total_price`:

- **Pago** — soma dos recebimentos ≥ total
- **Parcial** — soma > 0 e < total
- **Pendente** — soma = 0

Sem coluna nova de status — sempre calculado, nunca desatualiza.

### 3. Fluxo no PDV (nova venda)
Ao finalizar a venda continua igual, mas o campo "Valor recebido" cria automaticamente o **primeiro registro** em `sale_payments`. Se o cliente não pagou nada, nenhum recebimento é criado e a venda nasce **Pendente** — o estoque é baixado normalmente.

### 4. Nova página/aba "A Receber"
Menu lateral com badge mostrando quantidade de pedidos em aberto. Lista mostra:

```text
Cliente            Pedido     Total      Pago     Falta    Status
Maria Silva        #1024      R$ 450,00  R$ 200   R$ 250   Parcial
João Souza         #1031      R$ 180,00  R$ 0     R$ 180   Pendente
```

Filtros: cliente, período, status (Pendente/Parcial), vendedor.
Totalizador no topo: **Total a receber: R$ X.XXX**.

### 5. Modal "Registrar Pagamento"
Botão em cada linha da lista "A Receber" (e também dentro do detalhe da venda). Abre um popup com:

- Valor falta (preenchido como sugestão, editável)
- Forma de pagamento
- Data
- Observação
- Histórico dos recebimentos anteriores logo abaixo, com opção de excluir/editar um lançamento errado

Ao salvar, recalcula status; se quitou, marca visualmente como **Pago** e some da lista "A Receber".

### 6. Ajustes em telas existentes
- **Detalhe da venda / SaleSuccessDialog**: mostra "Pago: R$ X / Falta: R$ Y" e lista de recebimentos.
- **Dashboard "Caixa"**: continua somando recebimentos (já é a regra hoje), mas agora a fonte é `sale_payments.amount` — fica mais preciso porque entradas parciais futuras também entram no caixa do dia em que foram pagas, não no dia da venda.
- **Filtros atuais da página de Vendas** ("Recebido/Pendente/Parcial") continuam funcionando, agora baseados na soma calculada.

### 7. Migração dos dados atuais
Para cada venda existente com `partial_payment_amount > 0` ou `payment_received = true`, cria-se 1 linha em `sale_payments` com o valor já registrado, preservando histórico.

---

## Detalhes técnicos

- Tabela `sale_payments` com RLS por `tenant_id` (mesma policy padrão das outras), GRANTs para `authenticated` e `service_role`.
- View `v_sales_balance` (ou função) que retorna por `sale_group_id`: `total`, `paid`, `remaining`, `status` — usada na lista "A Receber" e nos filtros.
- Hook `useSalePayments(saleGroupId)` para buscar/inserir/excluir recebimentos.
- Componente `PaymentDialog` reutilizável (novo recebimento) e `PaymentsHistoryList`.
- Nova rota `/receivables` + item no `AppSidebar` com badge de contagem.
- Manter colunas legadas `payment_received` e `partial_payment_amount` na tabela `sales` por compatibilidade (não removemos agora) — apenas paramos de usá-las como fonte da verdade.

## Decisões em aberto
1. Quer permitir **editar/excluir** recebimentos já lançados, ou só adicionar (mais seguro contra erros do usuário)?
2. A página "A Receber" deve ser **menu próprio** no sidebar ou uma **aba dentro de Vendas**?
3. Quer **alerta/notificação** de pedidos vencidos (ex.: pendente há mais de X dias)?
