export const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: any; status: number }> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        // Simple token expiration handling for client
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      return { error: data?.message || 'Request failed', status: response.status };
    }

    return { data: data.data || data, status: response.status };
  } catch (error) {
    return { error: 'Network error', status: 0 };
  }
};
