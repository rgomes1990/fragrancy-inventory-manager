-- Adicionar campo customer_name na tabela products
ALTER TABLE public.products 
ADD COLUMN customer_name TEXT;

-- Atualizar vendas que estão sem vendedor para "Ana Paula"
UPDATE public.sales 
SET seller = 'Ana Paula' 
WHERE seller IS NULL OR seller = '';