
CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_group_id uuid NOT NULL,
  tenant_id uuid,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_type text,
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_payments_group ON public.sale_payments(sale_group_id);
CREATE INDEX idx_sale_payments_tenant ON public.sale_payments(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO anon;
GRANT ALL ON public.sale_payments TO service_role;

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso total a sale_payments"
  ON public.sale_payments FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_sale_payments_updated_at
  BEFORE UPDATE ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes
INSERT INTO public.sale_payments (sale_group_id, tenant_id, amount, payment_type, payment_date, notes, created_at)
SELECT
  grp AS sale_group_id,
  (array_agg(tenant_id) FILTER (WHERE tenant_id IS NOT NULL))[1] AS tenant_id,
  SUM(
    CASE
      WHEN partial_payment_amount IS NOT NULL AND partial_payment_amount > 0 THEN partial_payment_amount
      WHEN payment_received = true THEN total_price
      ELSE 0
    END
  ) AS amount,
  (array_agg(payment_type) FILTER (WHERE payment_type IS NOT NULL))[1] AS payment_type,
  MAX(sale_date) AS payment_date,
  'Migrado do sistema anterior',
  MAX(created_at)
FROM (
  SELECT COALESCE(sale_group_id, id) AS grp, tenant_id, payment_type, sale_date, created_at,
         partial_payment_amount, payment_received, total_price
  FROM public.sales
) t
GROUP BY grp
HAVING SUM(
  CASE
    WHEN partial_payment_amount IS NOT NULL AND partial_payment_amount > 0 THEN partial_payment_amount
    WHEN payment_received = true THEN total_price
    ELSE 0
  END
) > 0;

-- View com saldo por pedido
CREATE OR REPLACE VIEW public.v_sales_balance AS
WITH grouped AS (
  SELECT
    COALESCE(s.sale_group_id, s.id) AS sale_group_id,
    (array_agg(s.tenant_id) FILTER (WHERE s.tenant_id IS NOT NULL))[1] AS tenant_id,
    (array_agg(s.customer_id) FILTER (WHERE s.customer_id IS NOT NULL))[1] AS customer_id,
    (array_agg(s.seller) FILTER (WHERE s.seller IS NOT NULL))[1] AS seller,
    MAX(s.sale_date) AS sale_date,
    SUM(s.total_price) AS total
  FROM public.sales s
  GROUP BY COALESCE(s.sale_group_id, s.id)
)
SELECT
  g.sale_group_id,
  g.tenant_id,
  g.customer_id,
  g.seller,
  g.sale_date,
  g.total,
  COALESCE(p.paid, 0) AS paid,
  GREATEST(g.total - COALESCE(p.paid, 0), 0) AS remaining,
  CASE
    WHEN COALESCE(p.paid, 0) >= g.total THEN 'pago'
    WHEN COALESCE(p.paid, 0) > 0 THEN 'parcial'
    ELSE 'pendente'
  END AS status
FROM grouped g
LEFT JOIN (
  SELECT sale_group_id, SUM(amount) AS paid
  FROM public.sale_payments
  GROUP BY sale_group_id
) p ON p.sale_group_id = g.sale_group_id;

GRANT SELECT ON public.v_sales_balance TO authenticated, anon, service_role;
