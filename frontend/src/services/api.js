import axios from 'axios';

const getBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Ensure the base URL ends with /api
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_URL = getBaseUrl();

console.info(`[API Service] Active Backend Base URL: ${API_URL}`);

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

// Response interceptor to handle retries and error messages
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Auto-retry idempotent GET requests once on network hiccup or cold-start timeout
    if (config && (config.method || 'get').toLowerCase() === 'get' && !config._retry) {
      const isNetworkIssue =
        error.code === 'ECONNABORTED' ||
        error.message === 'Network Error' ||
        error.message?.includes('timeout') ||
        error.response?.status === 503;

      if (isNetworkIssue) {
        config._retry = true;
        // Wait 600ms before retrying once
        await new Promise((resolve) => setTimeout(resolve, 600));
        return api(config);
      }
    }

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
