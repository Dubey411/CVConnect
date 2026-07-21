import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cvconnect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.warn('[API] Session expired or token invalid (401). Clearing stored auth.');
      localStorage.removeItem('cvconnect_token');
      localStorage.removeItem('cvconnect_user');
      // If we are currently signed in, reload page to cleanly return user to sign in
      if (!window.location.pathname.includes('/auth') && localStorage.getItem('cvconnect_user')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const request = async (config) => (await api(config)).data;
export default api;
