import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useLoadingStore } from '../store/loading.store';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  useLoadingStore.getState().increment();

  const activeOrg = useAuthStore.getState().activeOrg;
  const storedOrgId = localStorage.getItem('cms_active_org_id');
  const orgId = activeOrg?.id || storedOrgId;

  if (orgId && !config.headers['X-Org-Id']) {
    config.headers['X-Org-Id'] = orgId;
  }

  return config;
});

// ── Response interceptors ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    useLoadingStore.getState().decrement();
    return response;
  },
  (error) => {
    useLoadingStore.getState().decrement();
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
