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

        public async Task SendPrivateMessage(string message, string recipientId)
        {
            Console.WriteLine($"[ChatHub] *** SENDPRIVATEMESSAGE METHOD CALLED ***");
            Console.WriteLine($"[ChatHub] Parameters: message='{message}', recipientId='{recipientId}'");
            
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

                if (!Guid.TryParse(recipientId, out var recipientGuid))
                {
                    Console.WriteLine("[ChatHub] Invalid recipient ID");
                    await Clients.Caller.SendAsync("Error", "Invalid recipient ID");
                    return;
                }

                Console.WriteLine($"[ChatHub] Authenticated user: {usernameClaim} (ID: {userId})");
                
                // Get sender and recipient from database
                var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == recipientGuid);
                
                if (sender == null)
                {
                    Console.WriteLine("[ChatHub] Sender not found in database");
                    await Clients.Caller.SendAsync("Error", "Sender not found");
                    return;
                }

                if (recipient == null)
                {
                    Console.WriteLine("[ChatHub] Recipient not found in database");
                    await Clients.Caller.SendAsync("Error", "Recipient not found");
                    return;
                }

                Console.WriteLine($"[ChatHub] Found sender: {sender.Username}, recipient: {recipient.Username}");

                // Analyze sentiment
                Console.WriteLine($"[ChatHub] Analyzing sentiment for private message: {message}");
                var (sentimentScore, sentimentLabel) = await _sentimentAnalysisService.AnalyzeSentimentAsync(message);
                Console.WriteLine($"[ChatHub] Sentiment analysis result: {sentimentLabel} ({sentimentScore})");

                // Create private message entity
                var messageEntity = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = sender.Id,
                    RecipientId = recipient.Id,
                    Content = message,
                    Timestamp = DateTime.UtcNow,
                    SentimentScore = sentimentScore,
                    SentimentLabel = sentimentLabel
                };

                // Save message to database
                Console.WriteLine($"[ChatHub] Saving private message to database");
                _context.Messages.Add(messageEntity);
                await _context.SaveChangesAsync();
                Console.WriteLine($"[ChatHub] Private message saved successfully with ID: {messageEntity.Id}");

                // Prepare message data for broadcasting
                var messageData = new
                {
                    messageId = messageEntity.Id.ToString(),
                    message = message,
                    content = message,
                    user = sender.Username,
                    username = sender.Username,
                    senderId = sender.Id.ToString(),
                    recipientId = recipient.Id.ToString(),
                    recipientUsername = recipient.Username,
                    timestamp = messageEntity.Timestamp.ToString("o"), // ISO format
                    sentimentScore = sentimentScore,
                    sentimentLabel = sentimentLabel
                };
                
                Console.WriteLine($"[ChatHub] Broadcasting private message data: {System.Text.Json.JsonSerializer.Serialize(messageData)}");

                // Send to both sender and recipient using groups
                await Clients.Group(userId.ToString()).SendAsync("ReceivePrivateMessage", messageData);
                await Clients.Group(recipientGuid.ToString()).SendAsync("ReceivePrivateMessage", messageData);
                Console.WriteLine("[ChatHub] ✅ Private message sent to both users");

                // Send confirmation to caller
                await Clients.Caller.SendAsync("PrivateMessageSent", new { success = true, messageId = messageEntity.Id });
                Console.WriteLine("[ChatHub] ✅ Private message confirmation sent to caller");
                
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] ❌ ERROR in SendPrivateMessage: {ex.Message}");
                Console.WriteLine($"[ChatHub] STACK TRACE: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ChatHub] INNER EXCEPTION: {ex.InnerException.Message}");
                }
                
                // Send error to caller
                await Clients.Caller.SendAsync("Error", $"Failed to send private message: {ex.Message}");
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
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                // Add user to their personal group for private messages
                if (!string.IsNullOrEmpty(userIdClaim))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, userIdClaim);
                    Console.WriteLine($"[ChatHub] User {userIdClaim} added to personal group");
                }
                
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
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                // Remove user from their personal group
                if (!string.IsNullOrEmpty(userIdClaim))
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, userIdClaim);
                    Console.WriteLine($"[ChatHub] User {userIdClaim} removed from personal group");
                }
                
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