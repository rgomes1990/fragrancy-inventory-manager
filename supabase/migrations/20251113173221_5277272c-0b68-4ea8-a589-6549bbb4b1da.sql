-- Add partial payment amount column to sales table
ALTER TABLE public.sales 
ADD COLUMN partial_payment_amount numeric DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.sales.partial_payment_amount IS 'Amount paid when payment is partial. NULL means full payment or no payment.';