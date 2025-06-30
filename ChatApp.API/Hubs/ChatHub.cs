using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ChatApp.Infrastructure.Data;
using ChatApp.Core.Models;
using ChatApp.Core.Models.DTOs;
using ChatApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace ChatApp.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ChatAppDbContext _context;
        private readonly ISentimentAnalysisService _sentimentAnalysisService;
        private readonly IMessageService _messageService;

        public ChatHub(ChatAppDbContext context, ISentimentAnalysisService sentimentAnalysisService, IMessageService messageService)
        {
            _context = context;
            _sentimentAnalysisService = sentimentAnalysisService;
            _messageService = messageService;
        }

        public async Task SendMessage(string message, string? roomId = null)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                await Clients.Caller.SendAsync("Error", "Authentication required");
                return;
            }

            try
            {
                var request = new SendMessageRequest 
                { 
                    Content = message, 
                    ChatRoomId = string.IsNullOrEmpty(roomId) || roomId == "general" ? null : Guid.Parse(roomId)
                };
                
                var result = await _messageService.SendMessageAsync(request, userId);
                
                // Determine which group to send to
                var groupName = string.IsNullOrEmpty(roomId) || roomId == "general" ? "General" : $"Room_{roomId}";
                
                await Clients.Group(groupName).SendAsync("ReceiveMessage", result);
            }
            catch (Exception ex)
            {
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
                await Clients.Group($"User_{userId}").SendAsync("ReceivePrivateMessage", messageData);
                await Clients.Group($"User_{recipientGuid}").SendAsync("ReceivePrivateMessage", messageData);
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
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    await Clients.Caller.SendAsync("Error", "Authentication required");
                    return;
                }

                // For general room, no permission check needed
                if (roomId != "general")
                {
                    if (!Guid.TryParse(roomId, out var roomGuid))
                    {
                        await Clients.Caller.SendAsync("Error", "Invalid room ID");
                        return;
                    }

                    // Check if room exists and if it's private
                    var room = await _context.ChatRooms.FindAsync(roomGuid);
                    if (room == null)
                    {
                        await Clients.Caller.SendAsync("Error", "Room not found");
                        return;
                    }

                    // If room is private, check if user is a participant
                    if (room.IsPrivate)
                    {
                        var isParticipant = await _context.ChatRoomParticipants
                            .AnyAsync(p => p.ChatRoomId == roomGuid && p.UserId == userId);
                        
                        var isCreator = room.CreatedById == userId;

                        if (!isParticipant && !isCreator)
                        {
                            await Clients.Caller.SendAsync("Error", "Access denied: You are not a member of this private room");
                            return;
                        }
                    }
                }

                var groupName = roomId == "general" ? "General" : $"Room_{roomId}";
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                
                var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                await Clients.Group(groupName).SendAsync("UserJoinedRoom", username, roomId);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Failed to join room: {ex.Message}");
            }
        }

        public async Task LeaveRoom(string roomId)
        {
            try
            {
                var groupName = roomId == "general" ? "General" : $"Room_{roomId}";
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
                
                var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                await Clients.Group(groupName).SendAsync("UserLeftRoom", username, roomId);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Failed to leave room: {ex.Message}");
            }
        }

        public override async Task OnConnectedAsync()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            {
                // Add user to their personal group for private messages
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
                
                // Add user to General room by default
                await Groups.AddToGroupAsync(Context.ConnectionId, "General");
                
                var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                await Clients.Others.SendAsync("UserConnected", username);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            {
                var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                await Clients.Others.SendAsync("UserDisconnected", username);
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
} 