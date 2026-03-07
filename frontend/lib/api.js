import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const signup = (email, password) =>
  api.post('/api/auth/signup', { email, password });

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const getMe = () => api.get('/api/auth/me');

// Tasks
// Pass { date } for exact-day filter, { upToDate } for overdue+today view
export const getTasks = (params = {}) =>
  api.get('/api/tasks', { params });

export const createTask = (title, dueDate) =>
  api.post('/api/tasks', { title, dueDate });

export const completeTask = (taskId) =>
  api.patch(`/api/tasks/${taskId}/complete`);

export const deleteTask = (taskId) => api.delete(`/api/tasks/${taskId}`);

// Debt
export const getDebt = () => api.get('/api/debt');
export const getDebtSummary = () => api.get('/api/debt/summary');
export const recalculateDebt = () => api.post('/api/debt/calculate');

// Pushup sessions
export const logPushups = (pushupsCompleted) =>
  api.post('/api/sessions', { pushupsCompleted });

export const getSessions = () => api.get('/api/sessions');

// Streak
export const getStreak = () => api.get('/api/streak');

// Leaderboard
export const getLeaderboard = () => api.get('/api/leaderboard');

export default api;
