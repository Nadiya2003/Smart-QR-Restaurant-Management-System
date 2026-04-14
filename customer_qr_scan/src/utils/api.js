const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.2:5000/api';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!options.cache) {
    // Avoid caching GET requests specifically for real-time app
    options.cache = 'no-store';
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API REQUEST] Fetching: ${url}`); // Debug log required by user

  // Add a 10 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Provide a fallback error message for specific network failures
    if (error.name === 'AbortError') {
      console.error(`[API ERROR] Timeout connecting to ${url}`);
      throw new Error('Connection timed out. Please check your network and backend server.');
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error(`[API ERROR] Network failure connecting to ${url}. Is the backend running?`);
      throw new Error(`Network Error: Cannot connect to the server at ${API_BASE_URL}. Ensure backend is running.`);
    }
    
    throw error;
  }
};

export const api = {
  get: (endpoint) => fetchWithAuth(endpoint, { method: 'GET' }),
  post: (endpoint, data) => fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
