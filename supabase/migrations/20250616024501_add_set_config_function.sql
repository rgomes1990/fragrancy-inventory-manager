
-- Criar função para definir configurações de sessão
CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text, is_local boolean DEFAULT false)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config(setting_name, setting_value, is_local);
$$;
