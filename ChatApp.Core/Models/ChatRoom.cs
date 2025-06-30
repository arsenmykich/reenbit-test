using System;
using System.Collections.Generic;

namespace ChatApp.Core.Models
{
    public class ChatRoom
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsPrivate { get; set; } = false;
        public DateTime CreatedAt { get; set; }
        public Guid CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
        public virtual ICollection<User> Participants { get; set; } = new List<User>();
    }
} 