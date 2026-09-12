import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const TOKEN_KEY = 'ac_token';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
};

const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && getStoredToken()) {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent('ac:session-expired'));
    }

    const data = error.response?.data;
    const normalised = new Error(
      data?.message || error.message || 'Something went wrong. Please try again.'
    );
    normalised.status = error.response?.status;
    normalised.fieldErrors = data?.errors || [];
    return Promise.reject(normalised);
  }
);

export default api;
