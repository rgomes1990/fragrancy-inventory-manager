import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseWithUser } from '@/integrations/supabase/client';

/**
 * Hook para facilitar queries com filtro de tenant
 * Retorna funções para buscar dados filtrados pelo tenant do usuário logado
 */
export const useTenantQuery = () => {
  const { tenantId, isAdmin } = useAuth();

  /**
   * Adiciona filtro de tenant a uma query
   * Se for admin sem tenant, retorna todos os dados
   * Se tiver tenant, filtra pelo tenant
   */
  const withTenantFilter = <T>(query: any) => {
    if (tenantId) {
      return query.eq('tenant_id', tenantId);
    }
    // Admin sem tenant vê todos os dados (para gerenciamento)
    return query;
  };

  /**
   * Retorna o client do Supabase para operações de leitura
   */
  const getReadClient = () => supabase;

  /**
   * Retorna o client do Supabase para operações de escrita (com header do usuário)
   */
  const getWriteClient = () => supabaseWithUser();

  /**
   * Adiciona tenant_id aos dados de inserção
   */
  const withTenantId = <T extends Record<string, any>>(data: T): T & { tenant_id?: string } => {
    if (tenantId) {
      return { ...data, tenant_id: tenantId };
    }
    return data;
  };

  return {
    tenantId,
    isAdmin,
    withTenantFilter,
    withTenantId,
    getReadClient,
    getWriteClient
  };
};

export default useTenantQuery;
