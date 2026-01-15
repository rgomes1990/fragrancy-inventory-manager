-- 1. Criar empresa principal para os dados existentes
INSERT INTO public.tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Perfumes Principal');

-- 2. Tornar o primeiro usuário admin master
UPDATE public.authorized_users 
SET is_admin = true 
WHERE username = 'rogerio-perfumes';

-- 3. Associar todos os usuários existentes à empresa principal
UPDATE public.authorized_users 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL AND is_admin = false;

-- 4. Associar todos os dados existentes à empresa principal
UPDATE public.products SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.expenses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.order_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.product_order_requests SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.reinvestments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.audit_log SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;