-- Atualizar função verify_login para comparar a senha corretamente
CREATE OR REPLACE FUNCTION public.verify_login(username_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário existe e a senha confere
  RETURN EXISTS (
    SELECT 1 
    FROM public.authorized_users 
    WHERE username = username_input 
    AND password_hash = password_input
  );
END;
$$;