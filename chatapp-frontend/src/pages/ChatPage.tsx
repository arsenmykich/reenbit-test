import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { messageService, userService } from '../services/api';
import UserList from '../components/chat/UserList';
import PrivateChat from '../components/chat/PrivateChat';
import { User } from '../types/auth';
import { ChatRoom } from '../components/chat/ChatRoom';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [privateChatUser, setPrivateChatUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
      <div style={{ width: 220, minWidth: 180, marginRight: 16 }}>
        {user && <UserList users={users} currentUserId={user.id} onSelect={setPrivateChatUser} />}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <ChatRoom />
        {privateChatUser && (
          <PrivateChat user={privateChatUser} onClose={() => setPrivateChatUser(null)} />
        )}
      </div>
    </div>
  );
};

export default ChatPage;