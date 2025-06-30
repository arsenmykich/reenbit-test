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
  async getMessages(page: number = 1, pageSize: number = 50, roomId?: string): Promise<Message[]> {
    const params: any = { page, pageSize };
    if (roomId) {
      params.roomId = roomId;
    }
    const response: AxiosResponse<Message[]> = await api.get('/api/messages', {
      params,
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

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
  memberCount: number;
}

export interface CreateChatRoomRequest {
  name: string;
  description: string;
  isPrivate: boolean;
}

export interface ChatRoomParticipant {
  userId: string;
  username: string;
  email: string;
  joinedAt: string;
  isAdmin: boolean;
}

export interface AddParticipantRequest {
  userId: string;
  isAdmin: boolean;
}

export const chatRoomService = {
  async getChatRooms(): Promise<ChatRoom[]> {
    const response: AxiosResponse<ChatRoom[]> = await api.get('/api/chatrooms');
    return response.data;
  },

  async getChatRoom(id: string): Promise<ChatRoom> {
    const response: AxiosResponse<ChatRoom> = await api.get(`/api/chatrooms/${id}`);
    return response.data;
  },

  async createChatRoom(request: CreateChatRoomRequest): Promise<ChatRoom> {
    const response: AxiosResponse<ChatRoom> = await api.post('/api/chatrooms', request);
    return response.data;
  },

  async deleteChatRoom(id: string): Promise<void> {
    await api.delete(`/api/chatrooms/${id}`);
  },

  async getParticipants(roomId: string): Promise<ChatRoomParticipant[]> {
    const response: AxiosResponse<ChatRoomParticipant[]> = await api.get(`/api/chatrooms/${roomId}/participants`);
    return response.data;
  },

  async addParticipant(roomId: string, request: AddParticipantRequest): Promise<ChatRoomParticipant> {
    const response: AxiosResponse<ChatRoomParticipant> = await api.post(`/api/chatrooms/${roomId}/participants`, request);
    return response.data;
  },

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await api.delete(`/api/chatrooms/${roomId}/participants/${userId}`);
  },

  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/api/chatrooms/${roomId}/join`);
  },
};

export default api; 