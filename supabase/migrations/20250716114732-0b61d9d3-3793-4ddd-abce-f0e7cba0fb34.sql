
-- Adicionar colunas de preço na tabela product_order_requests
ALTER TABLE public.product_order_requests 
ADD COLUMN cost_price NUMERIC,
ADD COLUMN sale_price NUMERIC;
