import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Message, ChatContextType } from '../types/chat';
import { useAuth } from './AuthContext';
import { SignalRService } from '../services/signalr';
import { messageService } from '../services/api';
import { User } from '../types/auth';

const signalRService = new SignalRService();

const ChatContext = createContext<ExtendedChatContextType | undefined>(undefined);

export const useChat = (): ExtendedChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

interface PrivateChat {
  user: User;
  messages: Message[];
}

export interface ExtendedChatContextType {
  messages: Message[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  sendMessage: (content: string) => Promise<void>;
  privateChats: Record<string, PrivateChat>;
  sendPrivateMessage: (content: string, recipientId: string) => Promise<void>;
  loadPrivateMessages: (otherUserId: string) => Promise<void>;
  currentRoom: { id: string; name: string } | null;
  joinRoom: (roomId: string, roomName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const { isAuthenticated, token, user } = useAuth();
  const [privateChats, setPrivateChats] = useState<Record<string, PrivateChat>>({});
  const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('[ChatContext] User authenticated, connecting to chat...');
      connectToChat();
      loadMessages(); // Load general chat messages by default
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
      console.log('[ChatContext] Connecting to chat...');
      setConnectionStatus('connecting');
      
      await signalRService.startConnection();

      // Set up message handlers
      signalRService.onReceiveMessage((messageData: any) => {
        try {
          console.log('🚀 [ChatContext] *** RECEIVED MESSAGE EVENT ***');
          console.log('📦 [ChatContext] Raw message data:', messageData);
          
          // Handle different message data formats
          const newMessage: Message = {
            id: messageData.messageId || messageData.MessageId || `temp-${Date.now()}`,
            content: messageData.message || messageData.Message || messageData.content || messageData.Content || '',
            timestamp: messageData.timestamp || messageData.Timestamp || new Date().toISOString(),
            sentimentScore: Number(messageData.sentimentScore || messageData.SentimentScore || 0.5),
            sentimentLabel: messageData.sentimentLabel || messageData.SentimentLabel || 'neutral',
            sender: {
              id: messageData.senderId || messageData.SenderId || '',
              username: messageData.user || messageData.User || messageData.username || 'Unknown',
            },
          };

          console.log('✨ [ChatContext] Parsed message:', newMessage);

          setMessages((prev: Message[]) => {
            console.log(`📊 [ChatContext] Current messages count: ${prev.length}`);
            
            // Check for duplicates
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

      // Set up private message handler
      signalRService.onReceivePrivateMessage((messageData: any) => {
        console.log('🚀 [ChatContext] *** RECEIVED PRIVATE MESSAGE EVENT ***');
        console.log('📦 [ChatContext] Raw private message data:', messageData);
        
        try {
          const newMessage: Message = {
            id: messageData.messageId || messageData.MessageId || `temp-${Date.now()}`,
            content: messageData.message || messageData.Message || messageData.content || messageData.Content || '',
            timestamp: messageData.timestamp || messageData.Timestamp || new Date().toISOString(),
            sentimentScore: Number(messageData.sentimentScore || messageData.SentimentScore || 0.5),
            sentimentLabel: messageData.sentimentLabel || messageData.SentimentLabel || 'neutral',
            sender: {
              id: messageData.senderId || messageData.SenderId || '',
              username: messageData.user || messageData.User || messageData.username || 'Unknown',
            },
            recipient: messageData.recipientId ? {
              id: messageData.recipientId,
              username: messageData.recipientUsername || '',
            } : undefined,
          };

          console.log('✨ [ChatContext] Parsed private message:', newMessage);

          // Determine the other user (either sender or recipient, depending on current user)
          const otherUserId = newMessage.sender.id === user?.id ? newMessage.recipient?.id : newMessage.sender.id;
          const otherUsername = newMessage.sender.id === user?.id ? newMessage.recipient?.username : newMessage.sender.username;
          
          if (!otherUserId) {
            console.error('[ChatContext] Could not determine other user for private message');
            return;
          }

          console.log(`[ChatContext] Adding private message to chat with user ${otherUserId} (${otherUsername})`);

          setPrivateChats((prev: Record<string, PrivateChat>) => {
            const existingChat = prev[otherUserId];
            const chat: PrivateChat = existingChat || { 
              user: { id: otherUserId, username: otherUsername || 'Unknown', email: '' }, 
              messages: [] 
            };
            
            // Check for duplicates in private messages too
            const messageExists = chat.messages.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('[ChatContext] Private message already exists, skipping duplicate');
              return prev;
            }

            // If this is from the current user, replace any temporary message with the same content
            let updatedMessages = chat.messages;
            if (newMessage.sender.id === user?.id) {
              updatedMessages = chat.messages.filter(msg => 
                !(msg.id.startsWith('temp-') && msg.content === newMessage.content)
              );
            }

            return {
              ...prev,
              [otherUserId]: {
                ...chat,
                messages: [...updatedMessages, newMessage],
              },
            };
          });
        } catch (error) {
          console.error('❌ [ChatContext] Error processing received private message:', error);
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

      // Set up PrivateMessageSent confirmation handler
      signalRService.onPrivateMessageSent && signalRService.onPrivateMessageSent((data: any) => {
        console.log('[ChatContext] Private message sent confirmation:', data);
      });

      // Join default room
      console.log('[ChatContext] Joining general room...');
      await signalRService.joinRoom('general');
      setCurrentRoom({ id: 'general', name: 'General Chat' });
      
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

  const loadMessages = async (roomId?: string): Promise<void> => {
    try {
      console.log(`[ChatContext] Loading messages from API for room: ${roomId || 'general'}...`);
      const loadedMessages = await messageService.getMessages(1, 50, roomId);
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
      const roomId = currentRoom?.id || 'general';
      await signalRService.sendMessage(content, roomId);
      console.log('[ChatContext] Message sent successfully via SignalR');
      
    } catch (error) {
      console.error('[ChatContext] Failed to send message:', error);
      
      // If SignalR fails, try to fallback to direct API call
      try {
        console.log('[ChatContext] Attempting fallback to API...');
        await messageService.sendMessage({ content });
        console.log('[ChatContext] Message sent via API fallback');
        
        // Reload messages to show the new one
        setTimeout(() => loadMessages(currentRoom?.id), 1000);
      } catch (apiError) {
        console.error('[ChatContext] API fallback also failed:', apiError);
        throw error; // Throw the original SignalR error
      }
    }
  };

  const joinRoom = async (roomId: string, roomName: string): Promise<void> => {
    try {
      await signalRService.joinRoom(roomId);
      setCurrentRoom({ id: roomId, name: roomName });
      // Load messages for the new room
      await loadMessages(roomId === 'general' ? undefined : roomId);
      console.log(`[ChatContext] Joined room: ${roomName} (${roomId})`);
    } catch (error) {
      console.error('[ChatContext] Failed to join room:', error);
      throw error;
    }
  };

  const leaveRoom = async (): Promise<void> => {
    try {
      if (currentRoom) {
        await signalRService.leaveRoom(currentRoom.id);
        setCurrentRoom(null);
      }
    } catch (error) {
      console.error('[ChatContext] Failed to leave room:', error);
      throw error;
    }
  };

  const sendPrivateMessage = async (content: string, recipientId: string): Promise<void> => {
    if (connectionStatus !== 'connected') throw new Error('Not connected to chat');
    
    // Create a temporary message object to show immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      timestamp: new Date().toISOString(),
      sentimentScore: 0.5,
      sentimentLabel: 'neutral',
      sender: {
        id: user?.id || '',
        username: user?.username || 'You',
      },
      recipient: {
        id: recipientId,
        username: '', // Will be filled when we get the real message back
      },
    };

    // Immediately add to local state so sender sees the message
    setPrivateChats((prev: Record<string, PrivateChat>) => {
      const existingChat = prev[recipientId];
      const chat: PrivateChat = existingChat || { 
        user: { id: recipientId, username: 'Unknown', email: '' }, 
        messages: [] 
      };

      return {
        ...prev,
        [recipientId]: {
          ...chat,
          messages: [...chat.messages, tempMessage],
        },
      };
    });

    try {
      await signalRService.sendPrivateMessage(content, recipientId);
    } catch (error) {
      // Remove the temp message if sending failed
      setPrivateChats((prev: Record<string, PrivateChat>) => {
        const existingChat = prev[recipientId];
        if (existingChat) {
          return {
            ...prev,
            [recipientId]: {
              ...existingChat,
              messages: existingChat.messages.filter(msg => msg.id !== tempMessage.id),
            },
          };
        }
        return prev;
      });

      // fallback to API
      try {
        await messageService.sendPrivateMessage({ content, recipientId });
        setTimeout(() => loadPrivateMessages(recipientId), 1000);
      } catch (apiError) {
        console.error('[ChatContext] Both SignalR and API failed:', apiError);
        throw error;
      }
    }
  };

  const loadPrivateMessages = async (otherUserId: string): Promise<void> => {
    try {
      const loadedMessages = await messageService.getPrivateMessages(otherUserId, 1, 50);
      
      // Try to get username from loaded messages or fetch user info
      let username = 'Unknown User';
      if (loadedMessages.length > 0) {
        // Find a message from the other user to get their username
        const messageFromOtherUser = loadedMessages.find(msg => msg.sender.id === otherUserId);
        if (messageFromOtherUser) {
          username = messageFromOtherUser.sender.username;
        }
      }
      
      // If still unknown, try to get from all users
      if (username === 'Unknown User') {
        try {
          const { userService } = await import('../services/api');
          const allUsers = await userService.getAllUsers();
          const userInfo = allUsers.find(u => u.id === otherUserId);
          if (userInfo) {
            username = userInfo.username;
          }
        } catch (error) {
          console.error('[ChatContext] Failed to fetch user info:', error);
        }
      }
      
      setPrivateChats(prev => ({
        ...prev,
        [otherUserId]: {
          user: { id: otherUserId, username, email: '' },
          messages: loadedMessages,
        },
      }));
    } catch (error) {
      console.error('[ChatContext] Failed to load private messages:', error);
    }
  };

  const value: ExtendedChatContextType = {
    ...{
      messages,
      connectionStatus,
      sendMessage,
      joinRoom,
      leaveRoom,
    },
    privateChats,
    sendPrivateMessage,
    loadPrivateMessages,
    currentRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 