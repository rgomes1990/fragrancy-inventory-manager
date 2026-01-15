import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para aplicar filtro de tenant_id em todas as queries
 * Admins podem ver dados de todas as empresas, usuários comuns só veem da sua empresa
 */
export const useTenantFilter = () => {
  const { tenantId, isAdmin } = useAuth();

  /**
   * Aplica o filtro de tenant_id em uma query do Supabase
   * @param query - Query do Supabase
   * @returns Query com filtro aplicado (se necessário)
   */
  const applyTenantFilter = <T extends { eq: (column: string, value: string) => T }>(query: T): T => {
    // Admin vê tudo, usuário comum só vê dados da sua empresa
    if (!isAdmin && tenantId) {
      return query.eq('tenant_id', tenantId);
    }
    return query;
  };

  /**
   * Retorna o tenant_id para inserção de novos registros
   * @returns tenant_id do usuário atual ou null para admins
   */
  const getTenantIdForInsert = (): string | null => {
    return tenantId;
  };

  /**
   * Verifica se deve filtrar por tenant
   */
  const shouldFilter = (): boolean => {
    return !isAdmin && !!tenantId;
  };

  return {
    tenantId,
    isAdmin,
    applyTenantFilter,
    getTenantIdForInsert,
    shouldFilter,
  };
};
