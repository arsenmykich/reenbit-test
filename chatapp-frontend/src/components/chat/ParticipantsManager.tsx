import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { chatRoomService, userService, ChatRoomParticipant, AddParticipantRequest } from '../../services/api';
import { User } from '../../types/auth';

const Container = styled.div`
  background: white;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  overflow: hidden;
`;

const Header = styled.h3`
  color: #2c3e50;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const ScrollableContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const DeleteRoomButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;

  &:hover {
    background: #c0392b;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ParticipantsList = styled.div`
  margin-bottom: 20px;
`;

const ParticipantItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  margin-bottom: 5px;
`;

const ParticipantInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ParticipantName = styled.span`
  font-weight: bold;
  color: #2c3e50;
`;

const ParticipantRole = styled.span`
  font-size: 12px;
  color: #7f8c8d;
`;

const AddSection = styled.div`
  border-top: 1px solid #e0e0e0;
  padding-top: 20px;
`;

const Select = styled.select`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-right: 10px;
  min-width: 200px;
`;

const Button = styled.button<{ variant?: 'danger' | 'success' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  margin-left: 5px;

  ${props => props.variant === 'danger' ? `
    background: #e74c3c;
    color: white;
    &:hover { background: #c0392b; }
  ` : props.variant === 'success' ? `
    background: #27ae60;
    color: white;
    &:hover { background: #219a52; }
  ` : `
    background: #3498db;
    color: white;
    &:hover { background: #2980b9; }
  `}

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

interface ParticipantsManagerProps {
  roomId: string;
  isCreator: boolean;
  currentUserId: string;
}

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({ 
  roomId, 
  isCreator, 
  currentUserId 
}) => {
  const [participants, setParticipants] = useState<ChatRoomParticipant[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<{ name: string; description: string } | null>(null);

  useEffect(() => {
    loadParticipants();
    loadAllUsers();
    loadRoomInfo();
  }, [roomId]);

  const loadParticipants = async () => {
    try {
      const data = await chatRoomService.getParticipants(roomId);
      setParticipants(data);
    } catch (err) {
      setError('Не вдалося завантажити учасників');
      console.error('Error loading participants:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await userService.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadRoomInfo = async () => {
    try {
      const room = await chatRoomService.getChatRoom(roomId);
      setRoomInfo({ name: room.name, description: room.description });
    } catch (err) {
      console.error('Error loading room info:', err);
      // Set fallback for General chat
      if (roomId === 'general') {
        setRoomInfo({ name: 'General Chat', description: 'Main chat room' });
      }
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const request: AddParticipantRequest = {
        userId: selectedUserId,
        isAdmin: isAdmin
      };

      const newParticipant = await chatRoomService.addParticipant(roomId, request);
      setParticipants(prev => [...prev, newParticipant]);
      setSelectedUserId('');
      setIsAdmin(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не вдалося додати учасника');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цього учасника?')) {
      return;
    }

    try {
      await chatRoomService.removeParticipant(roomId, userId);
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не вдалося видалити учасника');
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю кімнату? Це видалить всі повідомлення та учасників.')) {
      return;
    }

    try {
      await chatRoomService.deleteChatRoom(roomId);
      // Redirect back to lobby or notify parent component
      window.location.reload(); // Simple solution for now
    } catch (error) {
      console.error('Error deleting room:', error);
      setError('Не вдалося видалити кімнату');
    }
  };

  const availableUsers = allUsers.filter(user => 
    !participants.find(p => p.userId === user.id) && user.id !== currentUserId
  );

  const currentUserParticipant = participants.find(p => p.userId === currentUserId);
  const canManageParticipants = isCreator || currentUserParticipant?.isAdmin;

  // Debug logging
  console.log('ParticipantsManager Debug:', {
    roomId,
    isCreator,
    currentUserId,
    participants: participants.length,
    availableUsers: availableUsers.length,
    canManageParticipants,
    currentUserParticipant
  });

  return (
    <Container>
      <Header>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {roomInfo?.name || 'Кімната'}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '2px' }}>
            Учасники ({participants.length})
          </div>
        </div>
        {(isCreator || currentUserParticipant?.isAdmin) && (
          <DeleteRoomButton onClick={handleDeleteRoom}>
            🗑️ Видалити кімнату
          </DeleteRoomButton>
        )}
      </Header>

      <ScrollableContent>
        {error && (
          <div style={{ 
            background: '#e74c3c', 
            color: 'white', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '15px' 
          }}>
            {error}
          </div>
        )}

        <ParticipantsList>
        {participants.map(participant => (
          <ParticipantItem key={participant.userId}>
            <ParticipantInfo>
              <ParticipantName>{participant.username}</ParticipantName>
              <ParticipantRole>
                {participant.isAdmin ? 'Адміністратор' : 'Учасник'}
                {' • '}
                Приєднався: {new Date(participant.joinedAt).toLocaleDateString()}
              </ParticipantRole>
            </ParticipantInfo>
            {canManageParticipants && participant.userId !== currentUserId && (
              <Button 
                variant="danger" 
                onClick={() => handleRemoveParticipant(participant.userId)}
              >
                Видалити
              </Button>
            )}
          </ParticipantItem>
        ))}
      </ParticipantsList>

      {(canManageParticipants || true) && (
        <AddSection>
          <h4>Додати учасника (доступно: {availableUsers.length})</h4>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Оберіть користувача</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </Select>
            
            <label style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
              <Checkbox
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              Адміністратор
            </label>

            <Button
              variant="success"
              onClick={handleAddParticipant}
              disabled={!selectedUserId || loading}
            >
              {loading ? 'Додавання...' : 'Додати'}
            </Button>
          </div>
        </AddSection>
      )}

      {!canManageParticipants && false && (
        <div style={{ 
          textAlign: 'center', 
          color: '#7f8c8d', 
          fontStyle: 'italic' 
        }}>
          Тільки створювач або адміністратори можуть управляти учасниками
        </div>
      )}
      </ScrollableContent>
    </Container>
  );
};

export default ParticipantsManager; 