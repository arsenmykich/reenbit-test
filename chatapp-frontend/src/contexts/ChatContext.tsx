import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatContextType, Message } from '../types/chat';
import { messageService } from '../services/api';
import { signalRService } from '../services/signalr';
import { useAuth } from './AuthContext';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const { isAuthenticated, token, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('[ChatContext] User authenticated, connecting to chat...');
      connectToChat();
      loadMessages();
    } else {
      console.log('[ChatContext] User not authenticated, disconnecting...');
      disconnectFromChat();
    }

    return () => {
      disconnectFromChat();
    };
  }, [isAuthenticated, token]);

  const connectToChat = async (): Promise<void> => {
    try {
      console.log('[ChatContext] Starting SignalR connection...');
      setConnectionStatus('connecting');
      
      await signalRService.startConnection();
      
      // Set up event listeners
      signalRService.onReceiveMessage((messageData: any) => {
        console.log('🔥 [ChatContext] *** RECEIVED SIGNALR MESSAGE ***');
        console.log('[ChatContext] Raw messageData:', JSON.stringify(messageData, null, 2));
        
        try {
          const newMessage: Message = {
            id: messageData.messageId || messageData.MessageId || `temp-${Date.now()}`,
            content: messageData.message || messageData.Message || messageData.content || messageData.Content || '',
            timestamp: messageData.timestamp || messageData.Timestamp || new Date().toISOString(),
            sentimentScore: Number(messageData.sentimentScore || messageData.SentimentScore || 0.5),
            sentimentLabel: messageData.sentimentLabel || messageData.SentimentLabel || 'neutral',
            sender: {
              id: messageData.senderId || messageData.SenderId || '',
              username: messageData.user || messageData.User || messageData.username || 'Unknown'
            }
          };
          
          console.log('📝 [ChatContext] Processed message:', JSON.stringify(newMessage, null, 2));
          console.log(`📊 [ChatContext] Current messages count BEFORE adding: ${messages.length}`);
          
          setMessages(prev => {
            console.log(`📊 [ChatContext] Current messages in setter: ${prev.length}`);
            
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => {
              const sameId = msg.id === newMessage.id;
              const sameContent = msg.content === newMessage.content && 
                                 msg.sender.username === newMessage.sender.username;
              const timeClose = Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000;
              
              console.log(`🔍 [ChatContext] Checking duplicate - ID: ${sameId}, Content: ${sameContent}, Time: ${timeClose}`);
              
              return sameId || (sameContent && timeClose);
            });
            
            if (exists) {
              console.log('❌ [ChatContext] Message already exists, skipping duplicate');
              return prev;
            }
            
            console.log('✅ [ChatContext] Adding new message to state');
            const newMessages = [...prev, newMessage];
            console.log(`📊 [ChatContext] New messages count: ${newMessages.length}`);
            return newMessages;
          });
        } catch (error) {
          console.error('❌ [ChatContext] Error processing received message:', error);
        }
      });

      signalRService.onError((error: string) => {
        console.error('[ChatContext] Chat error:', error);
        setConnectionStatus('disconnected');
      });

      signalRService.onUserConnected((message: string) => {
        console.log('[ChatContext] User connected:', message);
      });

      signalRService.onUserDisconnected((message: string) => {
        console.log('[ChatContext] User disconnected:', message);
      });

      // Set up MessageSent confirmation handler
      signalRService.onMessageSent((data: any) => {
        console.log('[ChatContext] Message sent confirmation:', data);
      });

      // Join default room
      console.log('[ChatContext] Joining general room...');
      await signalRService.joinRoom('general');
      
      setConnectionStatus('connected');
      console.log('[ChatContext] Successfully connected to chat');
    } catch (error) {
      console.error('[ChatContext] Failed to connect to chat:', error);
      setConnectionStatus('disconnected');
    }
  };

  const disconnectFromChat = async (): Promise<void> => {
    console.log('[ChatContext] Disconnecting from chat...');
    await signalRService.stopConnection();
    setConnectionStatus('disconnected');
    setMessages([]);
  };

  const loadMessages = async (): Promise<void> => {
    try {
      console.log('[ChatContext] Loading messages from API...');
      const loadedMessages = await messageService.getMessages(1, 50);
      console.log(`[ChatContext] Loaded ${loadedMessages.length} messages from API`);
      
      // Sort messages by timestamp (oldest first)
      const sortedMessages = loadedMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(sortedMessages);
    } catch (error) {
      console.error('[ChatContext] Failed to load messages:', error);
    }
  };

  const sendMessage = async (content: string): Promise<void> => {
    try {
      console.log('[ChatContext] Sending message:', content);
      
      if (connectionStatus !== 'connected') {
        throw new Error('Not connected to chat');
      }

      // Send via SignalR - this will save to DB and broadcast
      await signalRService.sendMessage(content, 'general');
      console.log('[ChatContext] Message sent successfully via SignalR');
      
    } catch (error) {
      console.error('[ChatContext] Failed to send message:', error);
      
      // If SignalR fails, try to fallback to direct API call
      try {
        console.log('[ChatContext] Attempting fallback to API...');
        await messageService.sendMessage({ content });
        console.log('[ChatContext] Message sent via API fallback');
        
        // Reload messages to show the new one
        setTimeout(() => loadMessages(), 1000);
      } catch (apiError) {
        console.error('[ChatContext] API fallback also failed:', apiError);
        throw error; // Throw the original SignalR error
      }
    }
  };

  const joinRoom = async (roomId: string): Promise<void> => {
    try {
      await signalRService.joinRoom(roomId);
    } catch (error) {
      console.error('[ChatContext] Failed to join room:', error);
      throw error;
    }
  };

  const leaveRoom = async (roomId: string): Promise<void> => {
    try {
      await signalRService.leaveRoom(roomId);
    } catch (error) {
      console.error('[ChatContext] Failed to leave room:', error);
      throw error;
    }
  };

  const value: ChatContextType = {
    messages,
    connectionStatus,
    sendMessage,
    joinRoom,
    leaveRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 