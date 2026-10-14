import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout to prevent hanging on unstable connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Provide user-friendly messages for network drops and timeouts
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const msg = 'Request timed out. Please check your internet connection and try again.';
      if (!error.response) {
        error.response = { data: { message: msg } };
      } else if (error.response.data) {
        error.response.data.message = msg;
      }
    } else if (!error.response && (error.message === 'Network Error' || !navigator.onLine)) {
      const msg = 'Unable to connect to the server. Please check your network connection.';
      error.response = { data: { message: msg } };
    }

    if (error.response?.status === 401) {
      // Don't redirect on login attempts so the UI can display error messages
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        const pathname = window.location.pathname;
        if (pathname.startsWith('/kaifsgone')) {
          window.location.href = '/kaifsgone';
        } else if (pathname.startsWith('/kaifshere')) {
          window.location.href = '/kaifshere';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
