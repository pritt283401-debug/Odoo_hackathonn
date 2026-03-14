// Centralized API client for CoreInventory frontend
// All requests go through Next.js proxy → backend on port 4000

const API_BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ci_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error: any = new Error(data.message || 'Request failed');
    error.status = res.status;
    error.errors = data.errors;
    throw error;
  }
  return data;
}

const get  = <T>(url: string) => request<T>(url);
const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'POST', body: JSON.stringify(body) });
const put  = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'PUT',  body: JSON.stringify(body) });
const del  = <T>(url: string) => request<T>(url, { method: 'DELETE' });

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  signup:        (d: any) => post('/auth/signup', d),
  login:         (d: any) => post('/auth/login', d),
  forgotPassword:(d: any) => post('/auth/forgot-password', d),
  resetPassword: (d: any) => post('/auth/reset-password', d),
  me:            ()       => get('/auth/me'),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => get('/dashboard'),
};

// ─── Products ──────────────────────────────────────────────────────────────
export const productsApi = {
  list:   (params = '') => get(`/products${params}`),
  get:    (id: string)  => get(`/products/${id}`),
  create: (d: any)      => post('/products', d),
  update: (id: string, d: any) => put(`/products/${id}`, d),
  delete: (id: string)  => del(`/products/${id}`),
  stock:  (id: string)  => get(`/products/${id}/stock`),
};

// ─── Categories ────────────────────────────────────────────────────────────
export const categoriesApi = {
  list:   ()               => get('/categories'),
  create: (d: any)         => post('/categories', d),
  update: (id: string, d: any) => put(`/categories/${id}`, d),
  delete: (id: string)     => del(`/categories/${id}`),
};

// ─── Warehouses ────────────────────────────────────────────────────────────
export const warehousesApi = {
  list:           ()               => get('/warehouses'),
  get:            (id: string)     => get(`/warehouses/${id}`),
  create:         (d: any)         => post('/warehouses', d),
  update:         (id: string, d: any) => put(`/warehouses/${id}`, d),
  delete:         (id: string)     => del(`/warehouses/${id}`),
  allLocations:   ()               => get('/warehouses/locations/all'),
  addLocation:    (whId: string, d: any) => post(`/warehouses/${whId}/locations`, d),
  deleteLocation: (lid: string)    => del(`/warehouses/locations/${lid}`),
};

// ─── Operations ────────────────────────────────────────────────────────────
export const operationsApi = {
  list:     (params = '') => get(`/operations${params}`),
  get:      (id: string)  => get(`/operations/${id}`),
  create:   (d: any)      => post('/operations', d),
  update:   (id: string, d: any) => put(`/operations/${id}`, d),
  validate: (id: string, d?: any) => post(`/operations/${id}/validate`, d || {}),
  cancel:   (id: string)  => post(`/operations/${id}/cancel`, {}),
};

// ─── Ledger ────────────────────────────────────────────────────────────────
export const ledgerApi = {
  list: (params = '') => get(`/ledger${params}`),
};
