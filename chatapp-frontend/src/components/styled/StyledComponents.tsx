import styled from 'styled-components';

export const Container = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
`;

export const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
`;

export const AuthCard = styled(Card)`
  max-width: 400px;
  margin: 100px auto;
`;

export const ChatContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const ChatArea = styled(Card)`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 42px);
  flex: 1;
  padding: 0;
  margin: 0;
  overflow: hidden;
  border-radius: 0;
  box-shadow: none;
`;

export const ChatHeader = styled.div`
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const MessagesContainer = styled.div`
  flex: 1;
  padding: 15px 20px;
  overflow-y: auto;
  background: white;
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
`;

export const MessageInput = styled.div`
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
`;

export const InputGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

export const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'secondary':
        return `
          background: #f3f4f6;
          color: #374151;
          &:hover {
            background: #e5e7eb;
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 20px;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
`;

export const MessageBubble = styled.div<{ isOwn?: boolean; sentiment?: string }>`
  max-width: 75%;
  margin-bottom: 12px;
  margin-left: ${props => props.isOwn ? 'auto' : '0'};
  margin-right: ${props => props.isOwn ? '0' : 'auto'};
  
  .message-content {
    padding: 10px 14px;
    border-radius: 16px;
    background: ${props => props.isOwn 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : '#f3f4f6'};
    color: ${props => props.isOwn ? 'white' : '#374151'};
    word-wrap: break-word;
    font-size: 14px;
  }
  
  .message-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 11px;
    color: #6b7280;
    justify-content: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  }
`;

export const SentimentBadge = styled.span<{ sentiment: string }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    switch (props.sentiment.toLowerCase()) {
      case 'positive':
        return 'background: #dcfce7; color: #166534;';
      case 'negative':
        return 'background: #fef2f2; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

export const ConnectionStatus = styled.div<{ status: 'connected' | 'disconnected' | 'connecting' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      switch (props.status) {
        case 'connected': return '#10b981';
        case 'connecting': return '#f59e0b';
        default: return '#ef4444';
      }
    }};
    ${props => props.status === 'connecting' && 'animation: pulse 2s infinite;'}
  }
  
  background: ${props => {
    switch (props.status) {
      case 'connected': return '#ecfdf5';
      case 'connecting': return '#fffbeb';
      default: return '#fef2f2';
    }
  }};
  
  color: ${props => {
    switch (props.status) {
      case 'connected': return '#065f46';
      case 'connecting': return '#92400e';
      default: return '#991b1b';
    }
  }};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export const Sidebar = styled(Card)`
  height: fit-content;
  
  @media (max-width: 768px) {
    margin-bottom: 0;
  }
`;

export const UserInfo = styled.div`
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
  
  h3 {
    margin: 0 0 8px 0;
    color: #374151;
  }
  
  p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }
`;

export const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

export const SuccessMessage = styled.div`
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

export const Title = styled.h1`
  text-align: center;
  margin-bottom: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 2.5rem;
  font-weight: 700;
`;

export const LinkButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    color: #764ba2;
  }
`; 