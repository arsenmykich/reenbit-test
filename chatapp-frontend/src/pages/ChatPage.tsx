import React, { useState } from 'react';
import styled from 'styled-components';
import { ChatRoom } from '../components/chat/ChatRoom';
import ChatLobby from '../components/chat/ChatLobby';
import PrivateChat from '../components/chat/PrivateChat';
import UserList from '../components/chat/UserList';
import ParticipantsManager from '../components/chat/ParticipantsManager';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { chatRoomService, ChatRoom as APIChatRoom } from '../services/api';

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  background: #f5f6fa;
  width: 100%;
  max-width: none;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const HeaderBar = styled.div`
  background: #2c3e50;
  color: white;
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #34495e;
  flex-shrink: 0;
  height: 42px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: bold;
`;

const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const BackButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: #2980b9;
  }
`;

const LogoutButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: #c0392b;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
`;

const Sidebar = styled.div`
  width: 250px;
  background: white;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  flex-shrink: 0;
`;

const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentRoom, leaveRoom, joinRoom } = useChat();
  const [activeView, setActiveView] = useState<'lobby' | 'room' | 'private' | 'participants'>('lobby');
  const [privateChatUser, setPrivateChatUser] = useState<{id: string, username: string} | null>(null);
  const [managingRoomId, setManagingRoomId] = useState<string | null>(null);
  const [currentRoomData, setCurrentRoomData] = useState<APIChatRoom | null>(null);

  const handleJoinRoom = async (roomId: string, roomName: string) => {
    try {
      await joinRoom(roomId, roomName);
      setActiveView('room');
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleBackToLobby = async () => {
    await leaveRoom();
    setActiveView('lobby');
    setPrivateChatUser(null);
  };

  const handlePrivateChat = (userId: string, username?: string) => {
    setPrivateChatUser({id: userId, username: username || 'Unknown User'});
    setActiveView('private');
  };

  const handleManageParticipants = (roomId: string) => {
    setManagingRoomId(roomId);
    setActiveView('participants');
  };

  const handleLogout = () => {
    logout();
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'lobby':
        return <ChatLobby onJoinRoom={handleJoinRoom} onManageParticipants={handleManageParticipants} />;
      case 'room':
        return currentRoom ? <ChatRoom /> : <ChatLobby onJoinRoom={handleJoinRoom} onManageParticipants={handleManageParticipants} />;
      case 'private':
        return privateChatUser ? (
          <PrivateChat 
            recipientId={privateChatUser.id} 
            onBack={() => {
              setActiveView('lobby');
              setPrivateChatUser(null);
            }} 
          />
        ) : <ChatLobby onJoinRoom={handleJoinRoom} onManageParticipants={handleManageParticipants} />;
      case 'participants':
        return managingRoomId && user ? (
          <ParticipantsManager 
            roomId={managingRoomId}
            isCreator={true} // Temporary for testing - should be determined based on room data
            currentUserId={user.id}
          />
        ) : <ChatLobby onJoinRoom={handleJoinRoom} onManageParticipants={handleManageParticipants} />;
      default:
        return <ChatLobby onJoinRoom={handleJoinRoom} onManageParticipants={handleManageParticipants} />;
    }
  };

  return (
    <PageContainer>
      <MainContent>
        <HeaderBar>
          <Title>
            {activeView === 'lobby' ? (
              'Chat Lobby'
            ) : activeView === 'room' ? (
              currentRoom?.name || 'General Chat'
            ) : activeView === 'private' ? (
              'Private Chat'
            ) : activeView === 'participants' ? (
              'Manage Participants'
            ) : (
              'Chat App'
            )}
          </Title>
          <RoomInfo>
            {activeView !== 'lobby' && (
              <BackButton onClick={handleBackToLobby}>
                ← Back to Lobby
              </BackButton>
            )}
            <span>Welcome, {user?.username}!</span>
            <LogoutButton onClick={handleLogout}>
              Logout
            </LogoutButton>
          </RoomInfo>
        </HeaderBar>
        <ContentArea>
          {renderMainContent()}
        </ContentArea>
      </MainContent>
      
      <Sidebar>
        <UserList onPrivateChat={handlePrivateChat} />
      </Sidebar>
    </PageContainer>
  );
};

export default ChatPage;