-- Adicionar coluna para tipo de pagamento na tabela sales
ALTER TABLE public.sales 
ADD COLUMN payment_type text;

-- Comentário para documentação
COMMENT ON COLUMN public.sales.payment_type IS 'Tipo de pagamento: Debito, Crédito, Pix, Link';