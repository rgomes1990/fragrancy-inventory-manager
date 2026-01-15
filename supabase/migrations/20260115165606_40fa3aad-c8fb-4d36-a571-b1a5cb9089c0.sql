-- 1. Criar tabela de empresas (tenants)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Política de acesso total para tenants (gerenciado pelo admin)
CREATE POLICY "Permitir acesso total a tenants" 
ON public.tenants 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 2. Adicionar coluna tenant_id na tabela authorized_users
ALTER TABLE public.authorized_users 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- 3. Adicionar coluna tenant_id em todas as tabelas de dados
ALTER TABLE public.products 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.categories 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.customers 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.sales 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.order_items 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.product_order_requests 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.reinvestments 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.audit_log 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. Criar índices para melhor performance
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_order_items_tenant ON public.order_items(tenant_id);
CREATE INDEX idx_product_order_requests_tenant ON public.product_order_requests(tenant_id);
CREATE INDEX idx_reinvestments_tenant ON public.reinvestments(tenant_id);
CREATE INDEX idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX idx_authorized_users_tenant ON public.authorized_users(tenant_id);

-- 5. Trigger para atualizar updated_at em tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();