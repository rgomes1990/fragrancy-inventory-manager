
-- Remover a função antiga
DROP FUNCTION IF EXISTS public.audit_trigger_function();

-- Criar uma função melhorada que tenta várias formas de obter o usuário
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
