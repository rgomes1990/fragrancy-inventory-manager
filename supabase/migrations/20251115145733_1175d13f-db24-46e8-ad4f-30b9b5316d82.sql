-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as vendas" ON public.sales;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir vendas" ON public.sales;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar vendas" ON public.sales;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar vendas" ON public.sales;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as despesas" ON public.expenses;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir despesas" ON public.expenses;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar despesas" ON public.expenses;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar despesas" ON public.expenses;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os produtos" ON public.products;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir produtos" ON public.products;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar produtos" ON public.products;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar produtos" ON public.products;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar clientes" ON public.customers;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as categorias" ON public.categories;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir categorias" ON public.categories;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar categorias" ON public.categories;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar categorias" ON public.categories;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar pedidos" ON public.orders;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os itens de pedidos" ON public.order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir itens de pedidos" ON public.order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar itens de pedidos" ON public.order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar itens de pedidos" ON public.order_items;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as solicitações" ON public.product_order_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir solicitações" ON public.product_order_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar solicitações" ON public.product_order_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar solicitações" ON public.product_order_requests;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os reinvestimentos" ON public.reinvestments;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir reinvestimentos" ON public.reinvestments;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar reinvestimentos" ON public.reinvestments;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar reinvestimentos" ON public.reinvestments;

DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os logs de auditoria" ON public.audit_log;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs de auditoria" ON public.audit_log;

DROP POLICY IF EXISTS "Sistema pode ler usuários autorizados" ON public.authorized_users;

-- Criar novas políticas para papel anon (sistema usa autenticação customizada)
-- Sales
CREATE POLICY "Permitir acesso total a vendas" ON public.sales FOR ALL USING (true);

-- Expenses
CREATE POLICY "Permitir acesso total a despesas" ON public.expenses FOR ALL USING (true);

-- Products
CREATE POLICY "Permitir acesso total a produtos" ON public.products FOR ALL USING (true);

-- Customers
CREATE POLICY "Permitir acesso total a clientes" ON public.customers FOR ALL USING (true);

-- Categories
CREATE POLICY "Permitir acesso total a categorias" ON public.categories FOR ALL USING (true);

-- Orders
CREATE POLICY "Permitir acesso total a pedidos" ON public.orders FOR ALL USING (true);

-- Order Items
CREATE POLICY "Permitir acesso total a itens de pedidos" ON public.order_items FOR ALL USING (true);

-- Product Order Requests
CREATE POLICY "Permitir acesso total a solicitações" ON public.product_order_requests FOR ALL USING (true);

-- Reinvestments
CREATE POLICY "Permitir acesso total a reinvestimentos" ON public.reinvestments FOR ALL USING (true);

-- Audit Log
CREATE POLICY "Permitir leitura de logs de auditoria" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de logs de auditoria" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Authorized Users (apenas leitura para verificação de login)
CREATE POLICY "Permitir leitura de usuários autorizados" ON public.authorized_users FOR SELECT USING (true);