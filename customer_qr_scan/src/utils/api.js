const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong');
  }

  return response.json();
};

export const api = {
  get: (endpoint) => fetchWithAuth(endpoint, { method: 'GET' }),
  post: (endpoint, data) => fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
