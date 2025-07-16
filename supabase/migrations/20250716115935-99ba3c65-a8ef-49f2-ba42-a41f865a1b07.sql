-- Adicionar constraint para limitar os status permitidos
ALTER TABLE public.product_order_requests 
DROP CONSTRAINT IF EXISTS product_order_requests_status_check;

ALTER TABLE public.product_order_requests 
ADD CONSTRAINT product_order_requests_status_check 
CHECK (status IN ('Pendente', 'Concluído'));