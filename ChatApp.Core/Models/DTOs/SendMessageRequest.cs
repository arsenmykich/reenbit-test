using System.ComponentModel.DataAnnotations;

namespace ChatApp.Core.Models.DTOs
{
    public class SendMessageRequest
    {
        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;
        
        public Guid? ChatRoomId { get; set; }

        public Guid? RecipientId { get; set; }
    }
} 