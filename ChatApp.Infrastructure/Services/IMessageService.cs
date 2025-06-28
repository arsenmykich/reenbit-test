using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ChatApp.Core.Models.DTOs;

namespace ChatApp.Infrastructure.Services
{
    public interface IMessageService
    {
        Task<IEnumerable<object>> GetMessagesAsync(int page, int pageSize);
        Task<object> GetMessageAsync(Guid id);
        Task<IEnumerable<object>> GetSentimentStatsAsync();
        Task<object> SendMessageAsync(SendMessageRequest request, Guid userId);
        Task<IEnumerable<object>> GetPrivateMessagesAsync(Guid userId, Guid otherUserId, int page, int pageSize);
        Task<object> SendPrivateMessageAsync(SendMessageRequest request, Guid senderId);
    }
} 