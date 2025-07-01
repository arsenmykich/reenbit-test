(feature/added-frontend is main branch)

# Real-Time Chat Application with Authentication & Sentiment Analysis
![image](https://github.com/user-attachments/assets/8e1475a5-1881-47d4-a7bd-2caac9fe5423)

A modern, feature-rich real-time chat application built with ASP.NET Core, SignalR, React, and JWT authentication. Features automatic sentiment detection, multiple chat rooms, private messaging, user management, and a beautiful modern UI.

## 🚀 Features

### 🔐 Authentication & Security
- **JWT Authentication** - Secure user registration and login
- **Role-based access control** - Admin/User roles with permissions
- **Protected routes** in both API and frontend
- **Automatic logout** on token expiration

### 💬 Chat Features
- **⚡ Real-time messaging** using SignalR with authentication
- **🏠 Multiple chat rooms** - Create, join, and manage chat rooms
- **🔒 Private chat rooms** with participant management
- **💬 Direct messaging** - Private one-on-one conversations
- **👥 Participant management** - Add/remove users, assign admin roles
- **🗑️ Room deletion** - Room creators and admins can delete rooms

### 🎨 Modern UI/UX
- **📱 Responsive design** - Optimized for all devices
- **🎨 Full-screen layouts** - Immersive chat experience
- **💙 Message bubbles** - Distinct styling for own vs others' messages
- **📍 Always visible headers** - Sticky room names and navigation
- **🔄 2-column lobby** - Better organization of chat rooms
- **🟢 Online status** indicators for users

### 🧠 Advanced Features
- **🧠 Sentiment analysis** for each message (Positive, Negative, Neutral)
- **💾 Message persistence** with Entity Framework Core and PostgreSQL
- **🔗 RESTful API** for message retrieval and statistics
- **🌐 CORS support** for cross-origin requests

## 🏗️ Architecture

The application follows Clean Architecture principles with the following structure:

```
ChatApp/
├── ChatApp.API/               # Web API and SignalR Hub with JWT auth
│   ├── Controllers/           # API Controllers (Auth, Messages, ChatRooms)
│   ├── Hubs/                 # SignalR ChatHub
│   └── Program.cs            # Application configuration
├── ChatApp.Core/              # Domain Models and DTOs
│   ├── Models/               # Domain entities (User, Message, ChatRoom)
│   └── DTOs/                 # Data Transfer Objects
├── ChatApp.Infrastructure/    # Data Access, Services & Authentication
│   ├── Data/                 # DbContext and Migrations
│   ├── Services/             # Business logic services
│   └── Repositories/         # Data access layer
├── ChatApp.Tests/             # Unit Tests
└── chatapp-frontend/          # React TypeScript Frontend
    ├── src/
    │   ├── components/        # React Components
    │   │   ├── auth/         # Authentication forms
    │   │   ├── chat/         # Chat components (Room, Lobby, Private)
    │   │   └── styled/       # Styled components
    │   ├── contexts/          # React Context (Auth & Chat)
    │   ├── services/          # API & SignalR Services
    │   ├── types/             # TypeScript Interfaces
    │   └── pages/             # Route Pages
    └── public/
```

### Technology Stack

**Backend:**
- ASP.NET Core 8.0
- SignalR for real-time communication
- Entity Framework Core with PostgreSQL
- JWT Bearer Authentication
- Custom sentiment analysis service

**Frontend:**
- React 18 with TypeScript
- SignalR Client with JWT authentication
- Styled Components for modern styling
- React Router for navigation
- Axios for HTTP requests

## 🛠️ Setup and Installation

### Prerequisites

- .NET 8.0 SDK
- Node.js 18+ and npm
- PostgreSQL database
- Visual Studio 2022 or Visual Studio Code (optional)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reenbit-test
   ```

2. **Database Setup**
   ```bash
   # Update connection string in appsettings.json
   # Run migrations
   cd ChatApp.Infrastructure
   dotnet ef database update
   ```

3. **Backend Setup**
   ```bash
   # Restore .NET packages
   dotnet restore
   
   # Build the solution
   dotnet build
   
   # Start the API server
   cd ChatApp.API
   dotnet run
   ```
   
   The API will be available at: `http://localhost:5281`

4. **Frontend Setup**
   ```bash
   # In a new terminal, navigate to frontend
   cd chatapp-frontend
   
   # Install npm packages
   npm install
   
   # Start React development server
   npm start
   ```
   
   The React app will be available at: `http://localhost:3000`

## 🔐 Authentication

### Default Admin Account

The application automatically creates an admin account on startup:

- **Email:** `admin@chatapp.com`
- **Password:** `Admin123!`

### User Registration

New users can register through the React frontend with:
- Username (3+ characters)
- Email address
- Password (6+ characters)

## 📡 API Endpoints

### Authentication API
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/users` - Get all users (authenticated)

### Messages API (Authenticated)
- `GET /api/messages` - Get paginated messages
- `POST /api/messages` - Send a new message
- `GET /api/messages/private/{userId}` - Get private messages with user
- `POST /api/messages/private` - Send private message

### Chat Rooms API (Authenticated)
- `GET /api/chatrooms` - Get all chat rooms
- `POST /api/chatrooms` - Create new chat room
- `DELETE /api/chatrooms/{id}` - Delete chat room (creator/admin only)
- `GET /api/chatrooms/{id}/participants` - Get room participants
- `POST /api/chatrooms/{id}/participants` - Add participant
- `DELETE /api/chatrooms/{id}/participants/{userId}` - Remove participant
- `POST /api/chatrooms/{id}/join` - Join room

### SignalR Hub (Authenticated)
- **Hub URL**: `/chathub`
- **Authentication**: JWT token required
- **Methods**:
  - `SendMessage(message, roomId)` - Send a message to room
  - `SendPrivateMessage(message, recipientId)` - Send private message
  - `JoinRoom(roomId)` - Join a chat room
  - `LeaveRoom(roomId)` - Leave a chat room

## 🎨 Frontend Features

### Chat Rooms
- **🏠 General Chat** - Default public room for all users
- **🔒 Private Rooms** - Invite-only rooms with participant management
- **📝 Room Creation** - Users can create public/private rooms
- **👥 Participant Management** - Add/remove users, assign admin roles
- **🗑️ Room Deletion** - Delete rooms with proper permissions

### Private Messaging
- **💬 Direct Messages** - One-on-one private conversations
- **👤 User List** - Click any user to start private chat
- **🔄 Real-time delivery** - Instant private message delivery
- **📱 Full-screen interface** - Immersive private chat experience

### Modern UI Elements
- **💙 Message Bubbles** - Blue gradient for own messages, gray for others
- **📍 Sticky Headers** - Room names always visible
- **🟢 Status Indicators** - Online/offline user status
- **📱 Responsive Layout** - Works on all screen sizes
- **🎨 Clean Design** - Removed background clutter, optimized spacing

## 🎮 User Interface

### Chat Lobby
- **2-column layout** for better room organization
- **Room cards** showing name, description, and member count
- **Join buttons** for quick room access
- **Create room form** with privacy options
- **👥 Participants button** for private rooms
- **🗑️ Delete button** for room owners

### Chat Room Interface
- **Sticky room header** with name and description
- **Real-time message area** with auto-scroll
- **Message input** with send button
- **Sentiment analysis** badges on messages
- **User sidebar** with online users list

### Private Chat Interface
- **Full-screen layout** matching room chat design
- **User status indicators** 
- **Back to lobby** navigation
- **Consistent message styling** with room chats

## 🔒 Permission System

### Room Permissions
- **Room Creator**: Full control - manage participants, assign admins, delete room
- **Room Admin**: Can add/remove participants (except creator), delete room
- **Room Participant**: Can send messages and leave room
- **Non-participant**: Cannot access private rooms

### User Roles
- **Admin Users**: Can manage all rooms and users
- **Regular Users**: Can create rooms and manage their own rooms

## 🧪 Testing

Run the backend tests:
```bash
dotnet test
```

Run the frontend tests:
```bash
cd chatapp-frontend
npm test
```

## 📊 Recent Updates (Past 2 Weeks)

### 🎯 Major Features Added
- ✅ **Multiple Chat Rooms** - Create and join different chat rooms
- ✅ **Private Chat Rooms** - Invite-only rooms with participant management
- ✅ **Direct Messaging** - Private one-on-one conversations
- ✅ **Participant Management** - Add/remove users, assign admin roles
- ✅ **Room Deletion** - Delete rooms with proper permissions
- ✅ **Full-screen Layouts** - Immersive chat experience

### 🎨 UI/UX Improvements
- ✅ **2-column lobby** for better room organization
- ✅ **Always visible headers** - Sticky room names and navigation
- ✅ **Optimized chat sizing** - Perfect fit without scrolling
- ✅ **Removed background clutter** - Clean, professional design
- ✅ **Blue message bubbles** - Proper styling for own messages
- ✅ **Status indicators** - Online/offline user status

### 🔧 Technical Improvements
- ✅ **PostgreSQL migration** - Moved from SQL Server to PostgreSQL
- ✅ **Enhanced SignalR** - Private messaging and room management
- ✅ **Improved API** - Chat rooms and participants endpoints
- ✅ **Better state management** - Enhanced React contexts
- ✅ **Permission system** - Role-based access control

### 🐛 Bug Fixes
- ✅ **Join room button** - Now properly joins rooms
- ✅ **Username display** - Fixed "Unknown User" issues
- ✅ **Message ownership** - Proper identification of own messages
- ✅ **Layout issues** - Fixed spacing and alignment problems
- ✅ **Header visibility** - Always show room names and navigation

## 🚀 Development

### Running in Development

1. **Start API server:**
   ```bash
   cd ChatApp.API
   dotnet run
   ```

2. **Start React dev server:**
   ```bash
   cd chatapp-frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:5281`
   - Swagger: `http://localhost:5281/swagger`

## 🔮 Future Enhancements

### ✅ Completed Features
- [x] User authentication and authorization
- [x] Multiple chat rooms with creation/management
- [x] Private messaging between users
- [x] Role-based access control (Admin/User roles)
- [x] Participant management for private rooms
- [x] Room deletion with permissions
- [x] Modern responsive UI design

### 🎯 Planned Features
- [ ] File sharing capabilities
- [ ] Push notifications
- [ ] Message reactions and emojis
- [ ] Advanced sentiment analytics dashboard
- [ ] User profiles with avatars
- [ ] Message encryption
- [ ] Mobile app (React Native)
- [ ] Voice and video calling
- [ ] Message search functionality
- [ ] Chat themes and customization

## 📈 Project Status

This project is actively maintained and regularly updated with new features. The application is production-ready with comprehensive authentication, real-time communication, and modern UI/UX design.

**Last Updated**: December 2024
**Version**: 2.0 - Major UI/UX overhaul with multiple chat rooms and private messaging

## 🖼️ Screenshots

### 1. Головний екран / Лобі
![image](https://github.com/user-attachments/assets/8e1475a5-1881-47d4-a7bd-2caac9fe5423)

### 2. Сторінка групового чату
![image](https://github.com/user-attachments/assets/6c585a95-8a7c-4e0a-8bf9-137ba6e067f2)


### 3. Приватний чат (Direct Message)
![image](https://github.com/user-attachments/assets/3b1205ca-bf62-4739-aec3-fba1f6957902)


### 4. Менеджер учасників кімнати
![image](https://github.com/user-attachments/assets/1022f1e9-fb2f-4bdb-aa1e-87f0984c864c)


### 5. Мобільна версія
![image](https://github.com/user-attachments/assets/375a0be9-922d-4aac-9909-2fef8a7d0e66)


### 6. Сторінка логіну/реєстрації
![image](https://github.com/user-attachments/assets/15a84f2c-392b-420e-beaf-b95b5c5ce591)
![image](https://github.com/user-attachments/assets/5397af0e-3037-408c-a311-401d443c2d85)



