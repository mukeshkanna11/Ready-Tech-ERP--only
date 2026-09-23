import axios from 'axios';

const TOKEN_KEY = 'erp_token';
const USER_KEY = 'erp_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const setSession = ({ token, user }, remember = false) => {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  if (user) store.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
  });
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
              