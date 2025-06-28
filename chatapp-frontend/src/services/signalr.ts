import * as signalR from '@microsoft/signalr';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private token: string | null = null;
  private joinedRooms: Set<string> = new Set();

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  public async startConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
    }

    this.token = localStorage.getItem('authToken');
      
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5281/chathub', {
        accessTokenFactory: () => {
          console.log('AccessTokenFactory called, token:', this.token ? 'exists' : 'null');
          return this.token || '';
        },
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    try {
      await this.connection.start();
      console.log('SignalR connected successfully');
      
      // Automatically join the general room
      await this.joinRoom('general');
    } catch (error) {
      console.error('SignalR connection failed:', error);
      throw error;
    }
  }

  public async stopConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.joinedRooms.clear();
      console.log('SignalR disconnected');
    }
  }

  public onReceiveMessage(callback: (message: any) => void): void {
    if (this.connection) {
      console.log('🔧 [SignalR] Setting up ReceiveMessage listener');
      this.connection.on('ReceiveMessage', (message: any) => {
        console.log('🚀 [SignalR] *** RECEIVED MESSAGE EVENT ***');
        console.log('[SignalR] Raw message from hub:', JSON.stringify(message, null, 2));
        console.log('[SignalR] Message type:', typeof message);
        console.log('[SignalR] Message keys:', Object.keys(message || {}));
        
        callback(message);
      });
    } else {
      console.error('❌ [SignalR] Cannot set up ReceiveMessage listener - no connection');
    }
  }

  public onMessageSent(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on('MessageSent', (data: any) => {
        console.log('SignalR onMessageSent triggered with:', data);
        callback(data);
      });
    }
  }

  public onUserConnected(callback: (message: string) => void): void {
    if (this.connection) {
      this.connection.on('UserConnected', callback);
    }
  }

  public onUserDisconnected(callback: (message: string) => void): void {
    if (this.connection) {
      this.connection.on('UserDisconnected', callback);
    }
  }

  public onError(callback: (error: string) => void): void {
    if (this.connection) {
      this.connection.on('Error', callback);
    }
  }

  public async sendMessage(message: string, roomId: string = 'general'): Promise<void> {
    console.log('📤 [SignalR] *** SENDING MESSAGE ***');
    console.log(`[SignalR] Message: "${message}", Room: "${roomId}"`);
    console.log(`[SignalR] Connection state: ${this.connection?.state}`);
    
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      // Ensure we're in the room before sending
      if (!this.joinedRooms.has(roomId)) {
        console.log(`[SignalR] Not in room ${roomId}, joining first...`);
        await this.joinRoom(roomId);
      }
      
      console.log(`[SignalR] Invoking SendMessage on hub...`);
      await this.connection.invoke('SendMessage', message, roomId);
      console.log(`✅ [SignalR] Message sent successfully`);
    } else {
      const error = 'SignalR connection not established';
      console.error(`❌ [SignalR] ${error}`);
      throw new Error(error);
    }
  }

  public async joinRoom(roomId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinRoom', roomId);
        this.joinedRooms.add(roomId);
        console.log(`Joined room: ${roomId}`);
      } catch (error) {
        console.error(`Failed to join room ${roomId}:`, error);
      }
    }
  }

  public async leaveRoom(roomId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveRoom', roomId);
        this.joinedRooms.delete(roomId);
        console.log(`Left room: ${roomId}`);
      } catch (error) {
        console.error(`Failed to leave room ${roomId}:`, error);
      }
    }
  }

  public getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null;
  }

  public updateToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  public onReceivePrivateMessage(callback: (message: any) => void): void {
    if (this.connection) {
      this.connection.on('ReceivePrivateMessage', (message: any) => {
        console.log('🚀 [SignalR] *** RECEIVED PRIVATE MESSAGE EVENT ***');
        callback(message);
      });
    }
  }

  public async sendPrivateMessage(message: string, recipientId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendPrivateMessage', message, recipientId);
    } else {
      throw new Error('SignalR connection not established');
    }
  }

  public onPrivateMessageSent(callback: (data: any) => void): void {
    if (this.connection) {
      this.connection.on('PrivateMessageSent', (data: any) => {
        console.log('SignalR onPrivateMessageSent triggered with:', data);
        callback(data);
      });
    }
  }
}

export const signalRService = new SignalRService(); 