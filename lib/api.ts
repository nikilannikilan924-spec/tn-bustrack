const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return response.json();
}

export async function fetchBuses() {
  return request('/api/buses');
}

export async function fetchRoutes() {
  return request('/api/routes');
}

export async function fetchStops() {
  return request('/api/stops');
}

export async function fetchAlerts() {
  return request('/api/alerts');
}

export async function createFavorite(payload: Record<string, unknown>) {
  return request('/api/favorites', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteFavorite(id: string) {
  return request(`/api/favorites/${id}`, { method: 'DELETE' });
}

export async function createAdminAlert(payload: Record<string, unknown>) {
  return request('/api/admin/alerts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login(payload: Record<string, unknown>) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export async function register(payload: Record<string, unknown>) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createBus(payload: Record<string, unknown>) {
  return request('/api/buses', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateBus(id: string, payload: Record<string, unknown>) {
  return request(`/api/buses/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteBus(id: string) {
  return request(`/api/buses/${id}`, { method: 'DELETE' });
}

export async function createRoute(payload: Record<string, unknown>) {
  return request('/api/routes', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateRoute(id: string, payload: Record<string, unknown>) {
  return request(`/api/routes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteRoute(id: string) {
  return request(`/api/routes/${id}`, { method: 'DELETE' });
}

export async function createStop(payload: Record<string, unknown>) {
  return request('/api/stops', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateStop(id: string, payload: Record<string, unknown>) {
  return request(`/api/stops/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteStop(id: string) {
  return request(`/api/stops/${id}`, { method: 'DELETE' });
}

export async function createAlert(payload: Record<string, unknown>) {
  return request('/api/alerts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAlert(id: string, payload: Record<string, unknown>) {
  return request(`/api/alerts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteAlert(id: string) {
  return request(`/api/alerts/${id}`, { method: 'DELETE' });
}

export async function createUser(payload: Record<string, unknown>) {
  return request('/api/users', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateUser(id: string, payload: Record<string, unknown>) {
  return request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteUser(id: string) {
  return request(`/api/users/${id}`, { method: 'DELETE' });
}
