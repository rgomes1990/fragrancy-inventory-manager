// =====================================================
// Cliente HTTP para a API PHP (substitui o Supabase SDK)
// =====================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

function getTenantId(): string | null {
  const userData = localStorage.getItem('userData');
  if (!userData) return null;
  try {
    const parsed = JSON.parse(userData);
    return parsed.tenant_id || null;
  } catch {
    return null;
  }
}

function isAdmin(): boolean {
  const userData = localStorage.getItem('userData');
  if (!userData) return false;
  try {
    return JSON.parse(userData).is_admin === true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: any;
  params?: Record<string, string | undefined>;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  // Montar query string
  const queryParams = new URLSearchParams();

  // Adicionar tenant_id automaticamente se nao for admin
  const tenantId = getTenantId();
  if (tenantId && !isAdmin()) {
    queryParams.set('tenant_id', tenantId);
  }

  // Adicionar params extras (sem permitir override do tenant_id)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== 'tenant_id') queryParams.set(key, value);
    }
  }

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/${endpoint}${queryString ? '?' + queryString : ''}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Token expirado ou invalido
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userData');
    window.location.reload();
    throw new Error('Sessao expirada');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

// =====================================================
// API de Autenticacao (publica, sem token)
// =====================================================
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro no login');
    return data as { token: string; user: { id: string; username: string; is_admin: boolean; tenant_id: string | null; tenant_name: string | null } };
  },
};

// =====================================================
// APIs CRUD para cada entidade
// =====================================================
function createCrudApi<T = any>(resource: string) {
  return {
    list: (params?: Record<string, string | undefined>) =>
      request<T[]>(resource, { params }),

    getById: (id: string) =>
      request<T>(`${resource}/${id}`),

    create: (data: Partial<T>) =>
      request<T>(resource, { method: 'POST', body: data }),

    update: (id: string, data: Partial<T>) =>
      request<T>(`${resource}/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      request<{ success: boolean }>(`${resource}/${id}`, { method: 'DELETE' }),
  };
}

export const productsApi = createCrudApi<any>('products');
export const categoriesApi = createCrudApi<any>('categories');
export const customersApi = createCrudApi<any>('customers');
export const salesApi = createCrudApi<any>('sales');
export const salePaymentsApi = {
  ...createCrudApi<any>('sale-payments'),
  listByGroup: (saleId: string) =>
    request<any[]>('sale-payments', { params: { sale_id: saleId } }),
};
export const ordersApi = createCrudApi<any>('orders');
export const orderItemsApi = {
  ...createCrudApi<any>('order-items'),
  listByOrder: (orderId: string) =>
    request<any[]>('order-items', { params: { order_id: orderId } }),
};
export const kitsApi = createCrudApi<any>('kits');
export const kitItemsApi = {
  ...createCrudApi<any>('kit-items'),
  listByKit: (kitId: string) =>
    request<any[]>('kit-items', { params: { kit_id: kitId } }),
};
export const sellersApi = createCrudApi<any>('sellers');
export const suppliersApi = createCrudApi<any>('suppliers');
export const supplierOrdersApi = createCrudApi<any>('supplier-orders');
export const supplierOrderItemsApi = {
  ...createCrudApi<any>('supplier-order-items'),
  listByOrder: (orderId: string) =>
    request<any[]>('supplier-order-items', { params: { order_id: orderId } }),
};
export const stockEntriesApi = createCrudApi<any>('stock-entries');
export const expensesApi = createCrudApi<any>('expenses');
export const reinvestmentsApi = createCrudApi<any>('reinvestments');
export const cashClosingsApi = createCrudApi<any>('cash-closings');
export const productOrderRequestsApi = createCrudApi<any>('product-order-requests');

export const usersApi = createCrudApi<any>('users');
export const tenantsApi = createCrudApi<any>('tenants');

export const auditLogApi = {
  list: (params?: Record<string, string | undefined>) =>
    request<any[]>('audit-log', { params }),
  getById: (id: string) =>
    request<any>(`audit-log/${id}`),
};

export const salesBalanceApi = {
  list: (params?: Record<string, string | undefined>) =>
    request<any[]>('sales-balance', { params }),
  getById: (saleGroupId: string) =>
    request<any>(`sales-balance/${saleGroupId}`),
};

export const dashboardApi = {
  get: () => request<any>('dashboard'),
};

// Upload de arquivo
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Erro no upload');
  }

  const data = await response.json();
  return data.url;
}

// Export a generic request for custom queries
export { request as apiRequest };
