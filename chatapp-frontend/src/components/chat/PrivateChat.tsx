import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ChatArea, 
  ChatHeader, 
  MessagesContainer, 
  MessageInput, 
  InputGroup, 
  Input, 
  Button, 
  MessageBubble 
} from '../styled/StyledComponents';

const PrivateChatContainer = styled(ChatArea)`
  height: 100%;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BackButton = styled(Button)`
  padding: 8px 16px;
  font-size: 14px;
`;

const UserStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
`;

const StatusIndicator = styled.div<{ online?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.online ? '#10b981' : '#ef4444'};
`;

const NoMessagesText = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 40px 20px;
  font-size: 16px;
`;

interface PrivateChatProps {
  recipientId: string;
  onBack: () => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ recipientId, onBack }) => {
  const { privateChats, sendPrivateMessage, loadPrivateMessages } = useChat();
  const { user: currentUser } = useAuth();
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPrivateMessages(recipientId);
    // eslint-disable-next-line
  }, [recipientId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await sendPrivateMessage(message, recipientId);
    setMessage('');
  };

  const messages = privateChats[recipientId]?.messages || [];
  const chatUser = privateChats[recipientId]?.user;

  return (
    <PrivateChatContainer>
      <ChatHeader>
        <HeaderContent>
          <HeaderTitle>
            💬 Private Chat with {chatUser?.username || 'Unknown User'}
          </HeaderTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <UserStatus>
              <StatusIndicator online={true} />
              Online
            </UserStatus>
            <BackButton variant="secondary" onClick={onBack}>
              ← Back to Lobby
            </BackButton>
          </div>
        </HeaderContent>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 ? (
          <NoMessagesText>
            No messages yet. Start the conversation!
          </NoMessagesText>
        ) : (
          messages.map((msg, idx) => {
            // Check ownership by both ID and username for reliability
            const isOwnById = msg.sender.id === currentUser?.id;
            const isOwnByUsername = msg.sender.username === currentUser?.username;
            const isOwn = isOwnById || isOwnByUsername;
            
            return (
              <MessageBubble 
                key={msg.id + idx} 
                isOwn={isOwn}
              >
                <div className="message-content">
                  {msg.content}
                </div>
                <div className="message-meta">
                  <span>{msg.sender.username}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              </MessageBubble>
            );
          })
        )}
      </MessagesContainer>

      <MessageInput>
        <form onSubmit={handleSend} style={{ width: '100%' }}>
          <InputGroup>
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Send a private message to ${chatUser?.username || 'user'}...`}
              autoFocus
            />
            <Button type="submit" disabled={!message.trim()}>
              Send
            </Button>
          </InputGroup>
        </form>
      </MessageInput>
    </PrivateChatContainer>
  );
};

export default PrivateChat; 