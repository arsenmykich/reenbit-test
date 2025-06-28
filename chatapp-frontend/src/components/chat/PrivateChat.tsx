import React, { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { User } from '../../types/auth';

interface PrivateChatProps {
  user: User;
  onClose: () => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ user, onClose }) => {
  const { privateChats, sendPrivateMessage, loadPrivateMessages } = useChat();
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPrivateMessages(user.id);
    // eslint-disable-next-line
  }, [user.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await sendPrivateMessage(message, user.id);
    setMessage('');
  };

  const messages = privateChats[user.id]?.messages || [];

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px #0001', width: 400, maxWidth: '100%', position: 'fixed', right: 32, bottom: 32, zIndex: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Chat with {user.username}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', margin: '16px 0', background: '#f9f9f9', borderRadius: 6, padding: 8 }}>
        {messages.length === 0 && <div style={{ color: '#888' }}>No messages yet</div>}
        {messages.map((msg, idx) => (
          <div key={msg.id + idx} style={{ marginBottom: 8, textAlign: msg.sender.id === user.id ? 'left' : 'right' }}>
            <div style={{ display: 'inline-block', background: msg.sender.id === user.id ? '#e0e7ff' : '#c7f9cc', borderRadius: 8, padding: '6px 12px', maxWidth: 250 }}>
              <b>{msg.sender.username}:</b> {msg.content}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a private message..."
          style={{ flex: 1, borderRadius: 6, border: '1px solid #ccc', padding: 8 }}
        />
        <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0 16px', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  );
};

export default PrivateChat; 