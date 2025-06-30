import React, { useState, useEffect } from 'react';
import { User } from '../../types/auth';
import { userService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface UserListProps {
  onPrivateChat: (userId: string, username?: string) => void;
}

const UserList: React.FC<UserListProps> = ({ onPrivateChat }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px' }}>Users</h4>
        <div style={{ color: '#666' }}>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px' }}>Users ({users.length})</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {users.filter(u => u.id !== currentUser?.id).map(u => (
          <li key={u.id} style={{ marginBottom: 8 }}>
            <button 
              onClick={() => onPrivateChat(u.id, u.username)} 
              style={{ 
                background: '#f3f4f6', 
                border: 'none', 
                borderRadius: 6, 
                padding: '6px 12px', 
                cursor: 'pointer', 
                width: '100%', 
                textAlign: 'left',
                fontSize: '14px'
              }}
            >
              🟢 {u.username}
              <div style={{ color: '#888', fontSize: '12px' }}>{u.email}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 