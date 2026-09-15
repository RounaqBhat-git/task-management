import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: `${BASE}/api/v1` });

// Attach JWT from localStorage on every request (client-side only)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: import('./types').AuthUser }>('/auth/login', { email, password }),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get<{ data: import('./types').DashboardData }>('/dashboard'),
};

// Engagements
export const engagementsApi = {
  list: () => api.get<{ data: import('./types').Engagement[] }>('/engagements'),
  get: (id: number) => api.get<{ data: import('./types').Engagement }>(`/engagements/${id}`),
  create: (body: {
    clientId: number; serviceTypeId: number; title: string;
    periodDate: string; dueDate?: string; notes?: string;
  }) => api.post<{ data: import('./types').Engagement }>('/engagements', body),
  update: (id: number, body: Partial<{ title: string; status: string; dueDate: string; notes: string }>) =>
    api.patch<{ data: import('./types').Engagement }>(`/engagements/${id}`, body),
  rollover: (id: number) =>
    api.post<{ data: import('./types').Engagement }>(`/engagements/${id}/rollover`),
};

// Tasks
export const tasksApi = {
  list: (params?: { engagementId?: number; status?: string }) =>
    api.get<{ data: import('./types').Task[] }>('/tasks', { params }),
  get: (id: number) => api.get<{ data: import('./types').Task }>(`/tasks/${id}`),
  updateStatus: (id: number, status: string, comment?: string) =>
    api.patch<{ data: import('./types').Task }>(`/tasks/${id}/status`, { status, comment }),
  assign: (id: number, assignedToUserId: number | null) =>
    api.patch<{ data: import('./types').Task }>(`/tasks/${id}/assign`, { assignedToUserId }),
  updateDetails: (id: number, body: { dueDate?: string | null; notes?: string | null }) =>
    api.patch<{ data: import('./types').Task }>(`/tasks/${id}`, body),
};

// Clients
export const clientsApi = {
  list: () => api.get<{ data: import('./types').Client[] }>('/clients'),
};

// Service Types
export const serviceTypesApi = {
  list: () => api.get<{ data: import('./types').ServiceType[] }>('/service-types'),
};

// Users
export const usersApi = {
  list: () => api.get<{ data: import('./types').AuthUser[] }>('/users'),
  teamMembers: () => api.get<{ data: import('./types').AuthUser[] }>('/users/team-members'),
};
