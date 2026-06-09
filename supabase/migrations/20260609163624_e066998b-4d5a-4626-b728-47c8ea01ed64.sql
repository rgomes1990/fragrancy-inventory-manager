ALTER TABLE public.customers ADD COLUMN birthday text;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;