-- Adicionar coluna para rastrear se o pagamento foi recebido
ALTER TABLE public.sales 
ADD COLUMN payment_received boolean NOT NULL DEFAULT true;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.sales.payment_received IS 'Indica se o pagamento desta venda foi recebido ou apenas teve baixa no estoque';