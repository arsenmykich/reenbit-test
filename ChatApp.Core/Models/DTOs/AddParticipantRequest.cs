using System;

namespace ChatApp.Core.Models.DTOs
{
    public class AddParticipantRequest
    {
        public Guid UserId { get; set; }
        public bool IsAdmin { get; set; } = false;
    }

    public class RemoveParticipantRequest
    {
        public Guid UserId { get; set; }
    }

    public class ChatRoomParticipantResponse
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
        public bool IsAdmin { get; set; }
    }
} 