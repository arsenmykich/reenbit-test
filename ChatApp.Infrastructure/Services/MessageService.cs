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

        public async Task<IEnumerable<object>> GetMessagesAsync(int page, int pageSize)
        {
            var allMessages = await _unitOfWork.Messages.GetAllAsync();
            var messagesWithSender = allMessages
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
                Sender = sender != null ? new { sender.Id, sender.Username } : null
            };
        }
    }
} 