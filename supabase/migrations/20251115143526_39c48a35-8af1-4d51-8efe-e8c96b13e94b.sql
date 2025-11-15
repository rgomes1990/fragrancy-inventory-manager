-- Habilitar RLS em todas as tabelas
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reinvestments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir acesso total a usuários autenticados
-- Sales
CREATE POLICY "Usuários autenticados podem ver todas as vendas"
ON public.sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir vendas"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar vendas"
ON public.sales FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar vendas"
ON public.sales FOR DELETE
TO authenticated
USING (true);

-- Expenses
CREATE POLICY "Usuários autenticados podem ver todas as despesas"
ON public.expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir despesas"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar despesas"
ON public.expenses FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar despesas"
ON public.expenses FOR DELETE
TO authenticated
USING (true);

-- Products
CREATE POLICY "Usuários autenticados podem ver todos os produtos"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir produtos"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar produtos"
ON public.products FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar produtos"
ON public.products FOR DELETE
TO authenticated
USING (true);

-- Customers
CREATE POLICY "Usuários autenticados podem ver todos os clientes"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir clientes"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
ON public.customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar clientes"
ON public.customers FOR DELETE
TO authenticated
USING (true);

-- Categories
CREATE POLICY "Usuários autenticados podem ver todas as categorias"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir categorias"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar categorias"
ON public.categories FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar categorias"
ON public.categories FOR DELETE
TO authenticated
USING (true);

-- Orders
CREATE POLICY "Usuários autenticados podem ver todos os pedidos"
ON public.orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir pedidos"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar pedidos"
ON public.orders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar pedidos"
ON public.orders FOR DELETE
TO authenticated
USING (true);

-- Order Items
CREATE POLICY "Usuários autenticados podem ver todos os itens de pedidos"
ON public.order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir itens de pedidos"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens de pedidos"
ON public.order_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar itens de pedidos"
ON public.order_items FOR DELETE
TO authenticated
USING (true);

-- Product Order Requests
CREATE POLICY "Usuários autenticados podem ver todas as solicitações"
ON public.product_order_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir solicitações"
ON public.product_order_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar solicitações"
ON public.product_order_requests FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar solicitações"
ON public.product_order_requests FOR DELETE
TO authenticated
USING (true);

-- Reinvestments
CREATE POLICY "Usuários autenticados podem ver todos os reinvestimentos"
ON public.reinvestments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir reinvestimentos"
ON public.reinvestments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar reinvestimentos"
ON public.reinvestments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar reinvestimentos"
ON public.reinvestments FOR DELETE
TO authenticated
USING (true);

-- Audit Log
CREATE POLICY "Usuários autenticados podem ver todos os logs de auditoria"
ON public.audit_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir logs de auditoria"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (true);