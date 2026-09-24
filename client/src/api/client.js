import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const inLogin = window.location.pathname.includes('/login');
      if (!inLogin) {
        localStorage.removeItem('hh_token');
        localStorage.removeItem('hh_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const apiGet = async (url, params) => {
  const { data } = await api.get(url, { params });
  return data?.data ?? data;
};

export const apiPost = async (url, body) => {
  const { data } = await api.post(url, body ?? {});
  return data?.data ?? data;
};

export const apiPut = async (url, body) => {
  const { data } = await api.put(url, body ?? {});
  return data?.data ?? data;
};

export const apiPatch = async (url, body) => {
  const { data } = await api.patch(url, body ?? {});
  return data?.data ?? data;
};

export const apiDelete = async (url) => {
  const { data } = await api.delete(url);
  return data?.data ?? data;
};

export const uploadFile = async (url, formData) => {
  const { data } = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data?.data ?? data;
};

export const fileUrl = (path) => {
  if (!path) return '';
  if (/^https?:/i.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `${baseURL || ''}/${path}`;
};

export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

export default api;