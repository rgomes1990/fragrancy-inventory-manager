## Funcionalidade: Kits de Produtos

### 1. Banco de dados (migração)

**Nova tabela `kits`** (multi-tenant, RLS por tenant_id)
- `name`, `description`, `sale_price`, `image_url`, `active`, `tenant_id`

**Nova tabela `kit_items`**
- `kit_id` (FK kits), `product_id` (FK products), `quantity`

**Alterar tabela `sales`**
- Adicionar coluna `kit_id` (nullable, FK kits) — identifica vendas oriundas de um Kit
- Tornar `product_id` nullable — para permitir uma linha única representando a venda do Kit
- Audit trigger já existente continua funcionando

### 2. Nova tela "Kits" (aba dentro de Produtos)

Em `ProductsPage`, adicionar abas no topo: **Produtos** | **Kits**.

A aba **Kits** renderiza `KitsPage`, no estilo do mockup:
- Cabeçalho "Kits — Produtos compostos com baixa automática" + botão **+ Criar Kit**
- Banner explicativo: "Ao vender um Kit, o sistema dá baixa automática em cada produto individual."
- Grid de cards (1/2/3/4 colunas conforme tela):
  - Nome + preço
  - Descrição
  - Lista "Itens: produto x qtd"
  - Badge **Disponível: N** (calculado: `min(floor(estoque_componente / qtd_componente))`)
  - Botões **Vender** (desabilitado se Disponível = 0) e **Excluir**
- Dialog "Criar/Editar Kit": nome, descrição, preço (com botão "Sugerir soma dos itens"), lista dinâmica de componentes (produto + quantidade), salvar.
- Excluir kit faz soft check (não permite se houver vendas vinculadas) ou apenas marca `active=false`.

### 3. Integração com vendas

`SalesMultiProductForm` ganha um seletor de **tipo de item** por linha: `Produto` ou `Kit`.
- Quando Kit: SearchableSelect mostra apenas kits com `Disponível > 0`; preço unitário sugerido = `sale_price` do kit.
- Quantidade máxima = disponibilidade calculada do kit.
- Pode misturar produtos e kits no mesmo formulário.

`handleMultiProductSubmit` em `SalesPage`:
- Mesmo `sale_group_id` agrupa tudo (já existe).
- Para item tipo Kit: insere **1 linha em `sales`** com `kit_id` preenchido, `product_id = null`, total = preço × qtd, e decrementa o estoque de **cada componente** pela `qtd_componente × qtd_kit`.
- Para item tipo Produto: comportamento atual.
- Validação de estoque considera componentes do kit antes de gravar.

### 4. Exibição de vendas

Em `SalesPage` (lista e agrupamento), quando `kit_id` presente:
- Mostrar nome do kit como rótulo do item (em vez de `products.name`).
- Custo do item (para relatórios de lucro) = soma `kit_items.quantity × products.cost_price` no momento da venda.

`ProfitReportPage` e `SalesCostReport` ajustados para usar custo do kit quando `product_id` for nulo.

### 5. Arquivos afetados

**Criar**
- `src/components/KitsPage.tsx`
- `src/components/KitFormDialog.tsx`

**Editar**
- `src/components/ProductsPage.tsx` — adicionar tabs Produtos/Kits
- `src/components/SalesMultiProductForm.tsx` — seletor tipo Produto/Kit
- `src/components/SalesPage.tsx` — submissão e exibição com kits
- `src/components/ProfitReportPage.tsx`, `src/components/SalesCostReport.tsx` — custo de kits
- `src/types/database.ts` — tipos Kit / KitItem

### Detalhes técnicos
- Multi-tenant via `tenant_id` e `useTenantFilter` (mesmo padrão dos demais módulos).
- Disponibilidade calculada no client a partir de `kit_items` + `products.quantity`.
- `kit_id` em `sales` é nullable para não quebrar vendas existentes; índice em `(kit_id)` e `(sale_group_id)`.
