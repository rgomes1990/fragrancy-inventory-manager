
-- Adicionar coluna seller na tabela sales
ALTER TABLE public.sales ADD COLUMN seller text;

-- Adicionar um comentário para documentar a coluna
COMMENT ON COLUMN public.sales.seller IS 'Nome do vendedor responsável pela venda';
