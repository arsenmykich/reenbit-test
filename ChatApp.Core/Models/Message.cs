using System;

namespace ChatApp.Core.Models
{
    public class Message
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public double? SentimentScore { get; set; }
        public string SentimentLabel { get; set; } = string.Empty;
        public virtual User Sender { get; set; } = null!;
        public Guid? RecipientId { get; set; }
        public virtual User? Recipient { get; set; }
        public Guid? ChatRoomId { get; set; }
        public virtual ChatRoom? ChatRoom { get; set; }
    }
} 