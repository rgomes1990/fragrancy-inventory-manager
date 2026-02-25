
-- Tabela de entradas de estoque (compras)
CREATE TABLE public.stock_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  notes TEXT,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso total a entradas de estoque"
ON public.stock_entries
FOR ALL
USING (true)
WITH CHECK (true);

-- Índices
CREATE INDEX idx_stock_entries_product_id ON public.stock_entries(product_id);
CREATE INDEX idx_stock_entries_tenant_id ON public.stock_entries(tenant_id);

-- Função que recalcula custo médio ponderado e atualiza quantidade
CREATE OR REPLACE FUNCTION public.update_product_weighted_average()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_qty INTEGER;
  current_cost NUMERIC;
  new_avg_cost NUMERIC;
  new_total_qty INTEGER;
BEGIN
  SELECT quantity, cost_price INTO current_qty, current_cost
  FROM products WHERE id = NEW.product_id;

  new_total_qty := current_qty + NEW.quantity;

  IF new_total_qty > 0 THEN
    new_avg_cost := ROUND(((current_qty * current_cost) + (NEW.quantity * NEW.unit_cost)) / new_total_qty, 2);
  ELSE
    new_avg_cost := NEW.unit_cost;
  END IF;

  UPDATE products
  SET cost_price = new_avg_cost, quantity = new_total_qty, updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

-- Trigger: ao inserir entrada de estoque, recalcula automaticamente
CREATE TRIGGER trigger_update_weighted_average
AFTER INSERT ON public.stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_product_weighted_average();
