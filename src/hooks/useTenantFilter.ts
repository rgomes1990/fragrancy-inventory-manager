import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para filtro de tenant_id
 * Admins podem ver dados de todas as empresas, usuarios comuns so veem da sua empresa
 *
 * Nota: Com a API PHP, o filtro de tenant e aplicado automaticamente pelo apiClient
 * e pelo backend. Este hook e mantido para compatibilidade e para fornecer
 * o tenantId para insercoes.
 */
export const useTenantFilter = () => {
  const { tenantId, isAdmin } = useAuth();

  /**
   * Retorna o tenant_id para insercao de novos registros
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
    getTenantIdForInsert,
    shouldFilter,
  };
};
