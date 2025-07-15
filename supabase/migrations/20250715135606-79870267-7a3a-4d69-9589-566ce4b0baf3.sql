
-- Criar tabela para solicitações de encomenda de produtos existentes
CREATE TABLE public.product_order_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Produção', 'Concluída', 'Cancelada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar comentários para documentar
COMMENT ON TABLE public.product_order_requests IS 'Solicitações de encomenda para produtos já cadastrados';
COMMENT ON COLUMN public.product_order_requests.product_id IS 'Referência ao produto solicitado';
COMMENT ON COLUMN public.product_order_requests.customer_name IS 'Nome do cliente que fez a solicitação';
COMMENT ON COLUMN public.product_order_requests.requested_quantity IS 'Quantidade solicitada para encomenda';
COMMENT ON COLUMN public.product_order_requests.status IS 'Status da solicitação de encomenda';

-- Criar índices para melhor performance
CREATE INDEX idx_product_order_requests_product_id ON public.product_order_requests(product_id);
CREATE INDEX idx_product_order_requests_status ON public.product_order_requests(status);
CREATE INDEX idx_product_order_requests_created_at ON public.product_order_requests(created_at);

-- Criar trigger de auditoria
CREATE TRIGGER audit_product_order_requests_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_order_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
