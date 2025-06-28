import React from 'react';
import { User } from '../../types/auth';

interface UserListProps {
  users: User[];
  currentUserId: string;
  onSelect: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ users, currentUserId, onSelect }) => {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px' }}>Users</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {users.filter(u => u.id !== currentUserId).map(u => (
          <li key={u.id} style={{ marginBottom: 8 }}>
            <button onClick={() => onSelect(u)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              {u.username} <span style={{ color: '#888', fontSize: 12 }}>({u.email})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 