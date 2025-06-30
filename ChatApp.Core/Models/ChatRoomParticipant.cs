using System;

namespace ChatApp.Core.Models
{
    public class ChatRoomParticipant
    {
        public Guid ChatRoomId { get; set; }
        public virtual ChatRoom ChatRoom { get; set; } = null!;
        
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;
        
        public DateTime JoinedAt { get; set; }
        public bool IsAdmin { get; set; } = false;
    }
} 