using System.Threading.Tasks;
using ChatApp.Core.Models;
using ChatApp.Infrastructure.Data;

namespace ChatApp.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ChatAppDbContext _context;
        private IRepository<Message>? _messages;
        private IRepository<User>? _users;
        private IRepository<ChatRoom>? _chatRooms;

        public UnitOfWork(ChatAppDbContext context)
        {
            _context = context;
        }

        public IRepository<Message> Messages => _messages ??= new Repository<Message>(_context);
        public IRepository<User> Users => _users ??= new Repository<User>(_context);
        public IRepository<ChatRoom> ChatRooms => _chatRooms ??= new Repository<ChatRoom>(_context);

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
} 