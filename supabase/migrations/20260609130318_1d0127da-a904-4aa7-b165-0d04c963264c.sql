
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  cnpj TEXT,
  delivery_days INTEGER DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  default_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated, anon;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberto',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_orders TO authenticated, anon;
GRANT ALL ON public.supplier_orders TO service_role;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all supplier_orders" ON public.supplier_orders FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON public.supplier_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.supplier_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_order_items TO authenticated, anon;
GRANT ALL ON public.supplier_order_items TO service_role;
ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all supplier_order_items" ON public.supplier_order_items FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_supplier_orders_supplier ON public.supplier_orders(supplier_id);
CREATE INDEX idx_supplier_order_items_order ON public.supplier_order_items(order_id);
