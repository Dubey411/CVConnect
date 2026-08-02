import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cvconnect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('cvconnect_refresh_token');

      if (refreshToken && !isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.accessToken;
          const newRefreshToken = res.data?.refreshToken;
          if (newAccessToken) {
            localStorage.setItem('cvconnect_token', newAccessToken);
            if (newRefreshToken) localStorage.setItem('cvconnect_refresh_token', newRefreshToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            }
            isRefreshing = false;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          isRefreshing = false;
        }
      }

      console.warn('[API] Session expired or token invalid (401). Clearing stored auth.');
      const hadUser = Boolean(localStorage.getItem('cvconnect_user') || localStorage.getItem('cvconnect_token'));
      localStorage.removeItem('cvconnect_token');
      localStorage.removeItem('cvconnect_refresh_token');
      localStorage.removeItem('cvconnect_user');

      if (hadUser && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const request = async (config) => (await api(config)).data;
export default api;
