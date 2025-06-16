
-- Criar tabela para reenvestimentos da empresa
CREATE TABLE public.reinvestments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar comentário à tabela
COMMENT ON TABLE public.reinvestments IS 'Tabela para armazenar valores reenvestidos na compra de produtos';
COMMENT ON COLUMN public.reinvestments.amount IS 'Valor reenvestido';
COMMENT ON COLUMN public.reinvestments.date IS 'Data do reenvestimento';
COMMENT ON COLUMN public.reinvestments.description IS 'Descrição opcional do reenvestimento';
