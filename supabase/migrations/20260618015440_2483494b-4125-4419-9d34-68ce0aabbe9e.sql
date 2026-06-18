
CREATE TABLE public.cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  closing_balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cash_closings TO anon, authenticated;
GRANT ALL ON public.cash_closings TO service_role;

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura e inserção de fechamentos" ON public.cash_closings
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserir fechamentos" ON public.cash_closings
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_cash_closings_tenant_closed ON public.cash_closings(tenant_id, closed_at DESC);

CREATE TRIGGER update_cash_closings_updated_at
  BEFORE UPDATE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_cash_closings
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
