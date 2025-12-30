-- Atualizar a função de trigger para usar o header x-current-user
-- que será enviado pelo cliente em cada requisição
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_name TEXT;
BEGIN
  -- Tentar obter o usuário do header da requisição (definido pelo cliente)
  BEGIN
    current_user_name := current_setting('request.headers', true)::json->>'x-current-user';
  EXCEPTION WHEN OTHERS THEN
    current_user_name := NULL;
  END;
  
  -- Se não encontrou no header, tentar pelo app.current_user
  IF current_user_name IS NULL OR current_user_name = '' THEN
    BEGIN
      current_user_name := current_setting('app.current_user', true);
    EXCEPTION WHEN OTHERS THEN
      current_user_name := NULL;
    END;
  END IF;
  
  -- Se ainda não tiver usuário, tentar pela sessão do auth
  IF current_user_name IS NULL OR current_user_name = '' THEN
    BEGIN
      current_user_name := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION WHEN OTHERS THEN
      current_user_name := NULL;
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
$$;