using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ChatApp.Core.Models;
using ChatApp.Core.Models.DTOs;
using ChatApp.Infrastructure.Repositories;

namespace ChatApp.Infrastructure.Services
{
    public class MessageService : IMessageService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ISentimentAnalysisService _sentimentService;

        public MessageService(IUnitOfWork unitOfWork, ISentimentAnalysisService sentimentService)
        {
            _unitOfWork = unitOfWork;
            _sentimentService = sentimentService;
        }

        public async Task<IEnumerable<object>> GetMessagesAsync(int page, int pageSize, string? roomId = null)
        {
            var query = _unitOfWork.Messages.GetAllAsync().Result.AsQueryable();
            
            // Filter by room if specified
            if (!string.IsNullOrEmpty(roomId))
            {
                if (roomId == "general")
                {
                    // For "general" room, get messages without ChatRoomId (legacy messages) or with null ChatRoomId
                    query = query.Where(m => m.ChatRoomId == null && m.RecipientId == null);
                }
                else if (Guid.TryParse(roomId, out var roomGuid))
                {
                    // For specific room
                    query = query.Where(m => m.ChatRoomId == roomGuid);
                }
            }
            else
            {
                // Default: only public messages (no RecipientId and no specific room)
                query = query.Where(m => m.RecipientId == null && m.ChatRoomId == null);
            }

            var messagesWithSender = query
                .OrderByDescending(m => m.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();
                
            var users = (await _unitOfWork.Users.GetAllAsync()).ToDictionary(u => u.Id);
            return messagesWithSender.Select(m => new
            {
                m.Id,
                m.Content,
                m.Timestamp,
                m.SentimentScore,
                m.SentimentLabel,
                m.ChatRoomId,
                Sender = users.TryGetValue(m.SenderId, out var sender) ? new { sender.Id, sender.Username } : null
            });
        }

        public async Task<object> GetMessageAsync(Guid id)
        {
            var message = await _unitOfWork.Messages.GetByIdAsync(id);
            if (message == null) return null;
            var sender = await _unitOfWork.Users.GetByIdAsync(message.SenderId);
            return new
            {
                message.Id,
                message.Content,
                message.Timestamp,
                message.SentimentScore,
                message.SentimentLabel,
                Sender = sender != null ? new { sender.Id, sender.Username } : null
            };
        }

        public async Task<IEnumerable<object>> GetSentimentStatsAsync()
        {
            var allMessages = await _unitOfWork.Messages.GetAllAsync();
            var totalCount = allMessages.Count();
            return allMessages
                .GroupBy(m => m.SentimentLabel)
                .Select(g => new
                {
                    Sentiment = g.Key,
                    Count = g.Count(),
                    Percentage = totalCount > 0 ? (double)g.Count() / totalCount * 100 : 0
                });
        }

        public async Task<object> SendMessageAsync(SendMessageRequest request, Guid userId)
        {
            var sentimentResult = await _sentimentService.AnalyzeSentimentAsync(request.Content);
            var message = new Message
            {
                Id = Guid.NewGuid(),
                SenderId = userId,
                ChatRoomId = request.ChatRoomId,
                Content = request.Content,
                Timestamp = DateTime.UtcNow,
                SentimentScore = sentimentResult.score,
                SentimentLabel = sentimentResult.label
            };
            await _unitOfWork.Messages.AddAsync(message);
            await _unitOfWork.SaveChangesAsync();
            var sender = await _unitOfWork.Users.GetByIdAsync(message.SenderId);
            return new
            {
                message.Id,
                message.Content,
                message.Timestamp,
                message.SentimentScore,
                message.SentimentLabel,
                message.ChatRoomId,
                Sender = sender != null ? new { sender.Id, sender.Username } : null
            };
        }

        public async Task<IEnumerable<object>> GetPrivateMessagesAsync(Guid userId, Guid otherUserId, int page, int pageSize)
        {
            var allMessages = await _unitOfWork.Messages.FindAsync(
                m => (m.SenderId == userId && m.RecipientId == otherUserId) ||
                     (m.SenderId == otherUserId && m.RecipientId == userId)
            );
            var messages = allMessages
                .OrderByDescending(m => m.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var users = (await _unitOfWork.Users.GetAllAsync()).ToDictionary(u => u.Id);
            return messages.Select(m => new
            {
                m.Id,
                m.Content,
                m.Timestamp,
                m.SentimentScore,
                m.SentimentLabel,
                Sender = users.TryGetValue(m.SenderId, out var sender) ? new { sender.Id, sender.Username } : null,
                Recipient = m.RecipientId.HasValue && users.TryGetValue(m.RecipientId.Value, out var recipient) ? new { recipient.Id, recipient.Username } : null
            });
        }

        public async Task<object> SendPrivateMessageAsync(SendMessageRequest request, Guid senderId)
        {
            if (request.RecipientId == null)
                throw new ArgumentException("RecipientId is required for private messages.");

            var sentimentResult = await _sentimentService.AnalyzeSentimentAsync(request.Content);
            var message = new Message
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                RecipientId = request.RecipientId,
                Content = request.Content,
                Timestamp = DateTime.UtcNow,
                SentimentScore = sentimentResult.score,
                SentimentLabel = sentimentResult.label
            };
            await _unitOfWork.Messages.AddAsync(message);
            await _unitOfWork.SaveChangesAsync();

            var users = (await _unitOfWork.Users.GetAllAsync()).ToDictionary(u => u.Id);
            return new
            {
                message.Id,
                message.Content,
                message.Timestamp,
                message.SentimentScore,
                message.SentimentLabel,
                Sender = users.TryGetValue(message.SenderId, out var sender) ? new { sender.Id, sender.Username } : null,
                Recipient = message.RecipientId.HasValue && users.TryGetValue(message.RecipientId.Value, out var recipient) ? new { recipient.Id, recipient.Username } : null
            };
        }
    }
} 