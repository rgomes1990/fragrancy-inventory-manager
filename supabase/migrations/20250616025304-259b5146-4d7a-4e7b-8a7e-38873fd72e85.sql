
-- Atualizar a função de auditoria sem removê-la (apenas recriar com OR REPLACE)
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_name TEXT;
BEGIN
  -- Tentar obter o usuário de diferentes formas
  BEGIN
    current_user_name := current_setting('app.current_user', true);
  EXCEPTION WHEN OTHERS THEN
    current_user_name := NULL;
  END;
  
  -- Se não conseguir obter o usuário, tentar pela sessão do auth
  IF current_user_name IS NULL OR current_user_name = '' THEN
    BEGIN
      current_user_name := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION WHEN OTHERS THEN
      current_user_name := 'sistema';
    END;
  END IF;
  
  -- Se ainda não tiver usuário, usar 'sistema'
  IF current_user_name IS NULL OR current_user_name = '' THEN
    current_user_name := 'sistema';
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, old_values, new_values, user_name)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), NULL, current_user_name);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, old_values, new_values, user_name)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), current_user_name);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, old_values, new_values, user_name)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, NULL, to_jsonb(NEW), current_user_name);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar função para definir configurações de sessão
CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text, is_local boolean DEFAULT false)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config(setting_name, setting_value, is_local);
$$;
