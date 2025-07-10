
-- Adicionar campo is_order_product na tabela products
ALTER TABLE public.products 
ADD COLUMN is_order_product BOOLEAN NOT NULL DEFAULT FALSE;

-- Comentário na coluna para documentar
COMMENT ON COLUMN public.products.is_order_product IS 'Indica se o produto é um produto de encomenda';
