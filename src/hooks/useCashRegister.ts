import { useState, useEffect, useCallback } from 'react';
import { cashClosingsApi } from '@/services/apiClient';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import type { CashClosing } from '@/types/cashRegister';

export function useCashRegister() {
  const { tenantId } = useTenantFilter();
  const [openRegister, setOpenRegister] = useState<CashClosing | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (tenantId === undefined) return;
    setLoading(true);
    try {
      const data = await cashClosingsApi.getOpenRegister();
      const open = (data || []).find((r: any) => r.status === 'open') || null;
      setOpenRegister(open);
    } catch {
      setOpenRegister(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    openRegister,
    isOpen: !!openRegister,
    loading,
    refresh,
  };
}
