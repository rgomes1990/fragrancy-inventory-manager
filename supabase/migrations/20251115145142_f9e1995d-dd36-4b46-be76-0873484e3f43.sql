-- Habilitar RLS na tabela authorized_users
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir apenas leitura (verificação de login)
-- Esta tabela só precisa ser consultada pela função verify_login
CREATE POLICY "Sistema pode ler usuários autorizados"
ON public.authorized_users FOR SELECT
TO authenticated
USING (true);