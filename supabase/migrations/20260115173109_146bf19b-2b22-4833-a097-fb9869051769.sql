-- Criar tabela de vendedores
CREATE TABLE public.sellers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Permitir acesso total a vendedores" 
ON public.sellers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();