using System;
using System.Threading.Tasks;
using ChatApp.Core.Models;

namespace ChatApp.Infrastructure.Repositories
{
    public interface IUnitOfWork : IDisposable
    {
        IRepository<Message> Messages { get; }
        IRepository<User> Users { get; }
        IRepository<ChatRoom> ChatRooms { get; }
        Task<int> SaveChangesAsync();
    }
} 