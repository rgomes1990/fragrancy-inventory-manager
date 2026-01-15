-- Adicionar políticas para permitir gerenciamento completo de usuários autorizados
CREATE POLICY "Permitir inserção de usuários autorizados" 
ON public.authorized_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de usuários autorizados" 
ON public.authorized_users 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de usuários autorizados" 
ON public.authorized_users 
FOR DELETE 
USING (true);