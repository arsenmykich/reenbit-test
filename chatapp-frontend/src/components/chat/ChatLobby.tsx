import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { chatRoomService, ChatRoom } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const LobbyContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.h1`
  color: #333;
  text-align: center;
  margin: 0 0 20px 0;
  position: sticky;
  top: 0;
  background: #f5f6fa;
  z-index: 100;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const FixedContent = styled.div`
  flex-shrink: 0;
`;

const RoomsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c0c0c0;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a0a0a0;
  }
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const RoomCard = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
`;

const RoomName = styled.h3`
  color: #2c3e50;
  margin-bottom: 10px;
`;

const RoomDescription = styled.p`
  color: #666;
  margin-bottom: 15px;
  font-size: 14px;
`;

const RoomInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 12px;
  color: #888;
`;

const JoinButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  transition: background 0.2s;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  min-width: auto;

  &:hover {
    background: #c0392b;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const CreateRoomSection = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
`;

const CreateRoomForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
`;

const TextArea = styled.textarea`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
`;

const CreateButton = styled.button`
  background: #27ae60;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;

  &:hover {
    background: #219a52;
  }
`;

const ErrorMessage = styled.div`
  background: #e74c3c;
  color: white;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
`;

interface ChatLobbyProps {
  onJoinRoom: (roomId: string, roomName: string) => void;
  onManageParticipants?: (roomId: string) => void;
}

const ChatLobby: React.FC<ChatLobbyProps> = ({ onJoinRoom, onManageParticipants }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('ChatLobby user:', user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    isPrivate: false
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const rooms = await chatRoomService.getChatRooms();
      setRooms(rooms);
    } catch (err) {
      setError('Failed to load chat rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name.trim()) {
      setError('Room name is required');
      return;
    }

    try {
      const createdRoom = await chatRoomService.createChatRoom(newRoom);
      setRooms(prev => [createdRoom, ...prev]);
      setNewRoom({ name: '', description: '', isPrivate: false });
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setError('Failed to create room');
      console.error('Error creating room:', err);
    }
  };

  const handleJoinRoom = (room: ChatRoom) => {
    onJoinRoom(room.id, room.name);
  };

  const handleJoinGeneral = () => {
    onJoinRoom('general', 'General Chat');
  };

  const handleManageParticipants = (roomId: string) => {
    if (onManageParticipants) {
      onManageParticipants(roomId);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`Ви впевнені, що хочете видалити кімнату "${roomName}"?`)) {
      return;
    }

    try {
      await chatRoomService.deleteChatRoom(roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не вдалося видалити кімнату');
      console.error('Error deleting room:', err);
    }
  };

  if (loading) {
    return (
      <LobbyContainer>
        <FixedContent>
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            Loading Chat Rooms...
          </div>
        </FixedContent>
      </LobbyContainer>
    );
  }

  return (
    <LobbyContainer>
      <FixedContent>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FixedContent>

      <RoomsContainer>
        {/* General Chat Room */}
        <RoomGrid>
        <RoomCard>
          <RoomName>🌍 General Chat</RoomName>
          <RoomDescription>
            Main chat room for general discussions. Everyone is welcome!
          </RoomDescription>
          <RoomInfo>
            <span>Public</span>
            <span>Default Room</span>
          </RoomInfo>
          <JoinButton onClick={handleJoinGeneral}>
            Join General Chat
          </JoinButton>
        </RoomCard>

        {/* Custom Chat Rooms */}
        {rooms.map(room => (
          <RoomCard key={room.id}>
            <RoomName>
              {room.isPrivate ? '🔒' : '🌐'} {room.name}
            </RoomName>
            <RoomDescription>
              {room.description || 'No description provided'}
            </RoomDescription>
            <RoomInfo>
              <span>{room.isPrivate ? 'Private' : 'Public'}</span>
              <span>By {room.createdBy.username}</span>
            </RoomInfo>
            <div style={{ display: 'flex', gap: '5px' }}>
              <JoinButton 
                onClick={() => handleJoinRoom(room)}
                style={{ flex: 1 }}
              >
                Join Room
              </JoinButton>
              {room.isPrivate && (
                <JoinButton 
                  onClick={() => handleManageParticipants(room.id)}
                  style={{ 
                    flex: 0, 
                    background: '#9b59b6',
                    minWidth: 'auto',
                    padding: '10px 15px'
                  }}
                  title="Manage Participants"
                >
                  👥
                </JoinButton>
              )}
              {true && (
                <DeleteButton 
                  onClick={() => handleDeleteRoom(room.id, room.name)}
                  title="Delete Room"
                  style={{
                    opacity: user && room.createdBy.id === user.id ? 1 : 0.5
                  }}
                >
                  🗑️
                </DeleteButton>
              )}
            </div>
          </RoomCard>
        ))}
      </RoomGrid>

      {/* Create Room Section */}
      {!showCreateForm ? (
        <CreateRoomSection>
          <h3>Want to create your own room?</h3>
          <CreateButton onClick={() => setShowCreateForm(true)}>
            Create New Room
          </CreateButton>
        </CreateRoomSection>
      ) : (
        <CreateRoomSection>
          <h3>Create New Chat Room</h3>
          <CreateRoomForm onSubmit={handleCreateRoom}>
            <Input
              type="text"
              placeholder="Room Name"
              value={newRoom.name}
              onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextArea
              placeholder="Room Description (optional)"
              value={newRoom.description}
              onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
            />
            <label>
              <input
                type="checkbox"
                checked={newRoom.isPrivate}
                onChange={(e) => setNewRoom(prev => ({ ...prev, isPrivate: e.target.checked }))}
              />
              {' '}Private Room
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <CreateButton type="submit">Create Room</CreateButton>
              <CreateButton 
                type="button" 
                style={{ background: '#95a5a6' }}
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </CreateButton>
            </div>
          </CreateRoomForm>
        </CreateRoomSection>
      )}
      </RoomsContainer>
    </LobbyContainer>
  );
};

export default ChatLobby; 