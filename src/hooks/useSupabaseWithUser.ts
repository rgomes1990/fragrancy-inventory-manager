import { supabase } from '@/integrations/supabase/client';

/**
 * Executa uma operação no Supabase garantindo que o usuário atual
 * seja definido no contexto do banco na mesma conexão.
 * Isso é necessário porque cada request HTTP usa uma conexão diferente.
 */
export const executeWithUserContext = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  const currentUser = localStorage.getItem('currentUser');
  
  if (currentUser) {
    // Define o usuário no contexto ANTES da operação
    // Usando is_local: true para garantir que persista apenas nesta sessão
    await supabase.rpc('set_config', {
      setting_name: 'app.current_user',
      setting_value: currentUser,
      is_local: true
    });
  }
  
  return operation();
};

/**
 * Hook para obter funções de banco com contexto de usuário
 */
export const useSupabaseWithUser = () => {
  const currentUser = localStorage.getItem('currentUser');

  const withUserContext = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (currentUser) {
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user',
        setting_value: currentUser,
        is_local: true
      });
    }
    return operation();
  };

  return { withUserContext, currentUser };
};
