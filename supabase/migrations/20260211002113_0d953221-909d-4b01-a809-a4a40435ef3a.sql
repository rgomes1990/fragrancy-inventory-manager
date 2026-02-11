-- Adicionar campo para agrupar itens de uma mesma venda múltipla
ALTER TABLE public.sales ADD COLUMN sale_group_id uuid DEFAULT NULL;