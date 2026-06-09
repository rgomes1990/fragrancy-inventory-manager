
-- Kits table
CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sale_price numeric NOT NULL DEFAULT 0,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO anon, authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total a kits" ON public.kits FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_kits_updated_at BEFORE UPDATE ON public.kits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Kit items
CREATE TABLE public.kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO anon, authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total a kit_items" ON public.kit_items FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_kit_items_kit_id ON public.kit_items(kit_id);
CREATE INDEX idx_kit_items_product_id ON public.kit_items(product_id);

-- Add kit_id to sales
ALTER TABLE public.sales ADD COLUMN kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL;
CREATE INDEX idx_sales_kit_id ON public.sales(kit_id);

-- Audit triggers (match existing pattern)
CREATE TRIGGER kits_audit AFTER INSERT OR UPDATE OR DELETE ON public.kits
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER kit_items_audit AFTER INSERT OR UPDATE OR DELETE ON public.kit_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
