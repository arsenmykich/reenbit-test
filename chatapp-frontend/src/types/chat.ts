export interface Message {
  id: string;
  content: string;
  timestamp: string;
  sentimentScore?: number;
  sentimentLabel: string;
  sender: {
    id: string;
    username: string;
  };
  recipient?: {
    id: string;
    username: string;
  };
}

export interface SendMessageRequest {
  content: string;
  chatRoomId?: string;
  recipientId?: string;
}

export interface ChatContextType {
  messages: Message[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  sendMessage: (content: string) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
} 