import axios, { AxiosResponse } from 'axios';
import { AuthRequest, RegisterRequest, AuthResponse } from '../types/auth';
import { Message, SendMessageRequest } from '../types/chat';
import { User } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5281';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(request: AuthRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/api/auth/login', request);
    return response.data;
  },

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/api/auth/register', request);
    return response.data;
  },
};

export const messageService = {
  async getMessages(page: number = 1, pageSize: number = 50): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await api.get('/api/messages', {
      params: { page, pageSize },
    });
    return response.data;
  },

  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const response: AxiosResponse<Message> = await api.post('/api/messages', request);
    return response.data;
  },

  async getSentimentStats(): Promise<any[]> {
    const response: AxiosResponse<any[]> = await api.get('/api/messages/sentiment-stats');
    return response.data;
  },

  async getPrivateMessages(otherUserId: string, page: number = 1, pageSize: number = 50): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await api.get(`/api/messages/private/${otherUserId}`, {
      params: { page, pageSize },
    });
    return response.data;
  },

  async sendPrivateMessage(request: SendMessageRequest): Promise<Message> {
    const response: AxiosResponse<Message> = await api.post('/api/messages/private', request);
    return response.data;
  },
};

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await api.get('/api/auth/users');
    return response.data;
  },
};

export default api; 