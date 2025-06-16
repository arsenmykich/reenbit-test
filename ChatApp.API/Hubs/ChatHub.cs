using ChatApp.Core.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ChatApp.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ChatAppDbContext _context;
        private readonly ISentimentAnalysisService _sentimentAnalysisService;

        public ChatHub(ChatAppDbContext context, ISentimentAnalysisService sentimentAnalysisService)
        {
            _context = context;
            _sentimentAnalysisService = sentimentAnalysisService;
        }

        public async Task SendMessage(string message, string roomId = "general")
        {
            Console.WriteLine($"[ChatHub] *** SENDMESSAGE METHOD CALLED ***");
            Console.WriteLine($"[ChatHub] Parameters: message='{message}', roomId='{roomId}'");
            Console.WriteLine($"[ChatHub] Context.ConnectionId: {Context.ConnectionId}");
            
            try
            {
                // Get authenticated user from JWT token
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var usernameClaim = Context.User?.FindFirst(ClaimTypes.Name)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    Console.WriteLine("[ChatHub] User not authenticated");
                    await Clients.Caller.SendAsync("Error", "User not authenticated");
                    return;
                }

                Console.WriteLine($"[ChatHub] Authenticated user: {usernameClaim} (ID: {userId})");
                
                // Get user from database
                var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (sender == null)
                {
                    Console.WriteLine("[ChatHub] User not found in database");
                    await Clients.Caller.SendAsync("Error", "User not found");
                    return;
                }

                Console.WriteLine($"[ChatHub] Found user: {sender.Username}");

                // Analyze sentiment
                Console.WriteLine($"[ChatHub] Analyzing sentiment for message: {message}");
                var (sentimentScore, sentimentLabel) = await _sentimentAnalysisService.AnalyzeSentimentAsync(message);
                Console.WriteLine($"[ChatHub] Sentiment analysis result: {sentimentLabel} ({sentimentScore})");

                // Create message entity
                var messageEntity = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = sender.Id,
                    Content = message,
                    Timestamp = DateTime.UtcNow,
                    SentimentScore = sentimentScore,
                    SentimentLabel = sentimentLabel
                };

                // Save message to database FIRST
                Console.WriteLine($"[ChatHub] Saving message to database");
                _context.Messages.Add(messageEntity);
                await _context.SaveChangesAsync();
                Console.WriteLine($"[ChatHub] Message saved successfully with ID: {messageEntity.Id}");

                // Prepare message data for broadcasting
                var messageData = new
                {
                    messageId = messageEntity.Id.ToString(),
                    message = message,
                    content = message,
                    user = sender.Username,
                    username = sender.Username,
                    senderId = sender.Id.ToString(),
                    timestamp = messageEntity.Timestamp.ToString("o"), // ISO format
                    sentimentScore = sentimentScore,
                    sentimentLabel = sentimentLabel,
                    roomId = roomId
                };
                
                Console.WriteLine($"[ChatHub] Broadcasting message data: {System.Text.Json.JsonSerializer.Serialize(messageData)}");

                // IMMEDIATELY broadcast to ALL clients - no groups, no delays
                await Clients.All.SendAsync("ReceiveMessage", messageData);
                Console.WriteLine("[ChatHub] ✅ Message broadcasted to ALL clients via Clients.All");

                // Send confirmation to caller
                await Clients.Caller.SendAsync("MessageSent", new { success = true, messageId = messageEntity.Id });
                Console.WriteLine("[ChatHub] ✅ Confirmation sent to caller");
                
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] ❌ ERROR in SendMessage: {ex.Message}");
                Console.WriteLine($"[ChatHub] STACK TRACE: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ChatHub] INNER EXCEPTION: {ex.InnerException.Message}");
                }
                
                // Send error to caller
                await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
            }
        }

        public async Task JoinRoom(string roomId)
        {
            try
            {
                Console.WriteLine($"[ChatHub] User {Context.ConnectionId} joining room {roomId}");
                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
                await Clients.All.SendAsync("UserJoined", $"User joined {roomId}");
                Console.WriteLine($"[ChatHub] User successfully joined room {roomId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] Error joining room: {ex.Message}");
            }
        }

        public async Task LeaveRoom(string roomId)
        {
            try
            {
                Console.WriteLine($"[ChatHub] User {Context.ConnectionId} leaving room {roomId}");
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                await Clients.All.SendAsync("UserLeft", $"User left {roomId}");
                Console.WriteLine($"[ChatHub] User successfully left room {roomId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] Error leaving room: {ex.Message}");
            }
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[ChatHub] User connected: {Context.ConnectionId}");
            
            try
            {
                var usernameClaim = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anonymous";
                
                // Send connection notification to all clients
                await Clients.All.SendAsync("UserConnected", $"User {usernameClaim} connected");
                Console.WriteLine($"[ChatHub] UserConnected notification sent");
                
                // Send current connection status to the new user
                await Clients.Caller.SendAsync("Connected", new { connectionId = Context.ConnectionId, username = usernameClaim });
                Console.WriteLine($"[ChatHub] Connection confirmation sent to caller");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] Error in OnConnectedAsync: {ex.Message}");
            }
            
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[ChatHub] User disconnected: {Context.ConnectionId}");
            
            try
            {
                var usernameClaim = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anonymous";
                await Clients.All.SendAsync("UserDisconnected", $"User {usernameClaim} disconnected");
                Console.WriteLine($"[ChatHub] UserDisconnected notification sent");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] Error in OnDisconnectedAsync: {ex.Message}");
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
} 