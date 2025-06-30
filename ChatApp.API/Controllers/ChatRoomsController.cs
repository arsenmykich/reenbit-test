using ChatApp.Core.Models;
using ChatApp.Core.Models.DTOs;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ChatApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatRoomsController : ControllerBase
    {
        private readonly ChatAppDbContext _context;

        public ChatRoomsController(ChatAppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetChatRooms()
        {
            try
            {
                var rooms = await _context.ChatRooms
                    .Include(r => r.CreatedBy)
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.Description,
                        r.IsPrivate,
                        r.CreatedAt,
                        CreatedBy = new { r.CreatedBy.Id, r.CreatedBy.Username },
                        MemberCount = _context.Users.Count() // Simplified - in real app would track actual members
                    })
                    .ToListAsync();

                return Ok(rooms);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve chat rooms", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetChatRoom(Guid id)
        {
            try
            {
                var room = await _context.ChatRooms
                    .Include(r => r.CreatedBy)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (room == null)
                {
                    return NotFound(new { error = "Chat room not found" });
                }

                var roomData = new
                {
                    room.Id,
                    room.Name,
                    room.Description,
                    room.IsPrivate,
                    room.CreatedAt,
                    CreatedBy = new { room.CreatedBy.Id, room.CreatedBy.Username }
                };

                return Ok(roomData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve chat room", details = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateChatRoom([FromBody] CreateChatRoomRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                var chatRoom = new ChatRoom
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    Description = request.Description,
                    IsPrivate = request.IsPrivate,
                    CreatedById = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.ChatRooms.Add(chatRoom);
                await _context.SaveChangesAsync();

                var createdBy = await _context.Users.FindAsync(userId);
                var result = new
                {
                    chatRoom.Id,
                    chatRoom.Name,
                    chatRoom.Description,
                    chatRoom.IsPrivate,
                    chatRoom.CreatedAt,
                    CreatedBy = new { createdBy.Id, createdBy.Username }
                };

                return Created($"/api/chatrooms/{chatRoom.Id}", result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create chat room", details = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChatRoom(Guid id)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                var room = await _context.ChatRooms.FindAsync(id);
                if (room == null)
                {
                    return NotFound(new { error = "Chat room not found" });
                }

                // Check if user is creator or admin of the room
                var isCreator = room.CreatedById == userId;
                var isAdmin = await _context.ChatRoomParticipants
                    .AnyAsync(p => p.ChatRoomId == id && p.UserId == userId && p.IsAdmin);

                if (!isCreator && !isAdmin)
                {
                    return Forbid("You can only delete rooms you created or where you are an admin");
                }

                _context.ChatRooms.Remove(room);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to delete chat room", details = ex.Message });
            }
        }

        [HttpGet("{id}/participants")]
        public async Task<IActionResult> GetChatRoomParticipants(Guid id)
        {
            try
            {
                var participants = await _context.ChatRoomParticipants
                    .Include(p => p.User)
                    .Where(p => p.ChatRoomId == id)
                    .Select(p => new ChatRoomParticipantResponse
                    {
                        UserId = p.UserId,
                        Username = p.User.Username,
                        Email = p.User.Email,
                        JoinedAt = p.JoinedAt,
                        IsAdmin = p.IsAdmin
                    })
                    .ToListAsync();

                return Ok(participants);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve participants", details = ex.Message });
            }
        }

        [HttpPost("{id}/participants")]
        public async Task<IActionResult> AddParticipant(Guid id, [FromBody] AddParticipantRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var currentUserId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                // Check if room exists and if current user is admin or creator
                var room = await _context.ChatRooms
                    .Include(r => r.Participants)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (room == null)
                {
                    return NotFound(new { error = "Chat room not found" });
                }

                // Check if user has permission to add participants
                var isCreator = room.CreatedById == currentUserId;
                var isAdmin = await _context.ChatRoomParticipants
                    .AnyAsync(p => p.ChatRoomId == id && p.UserId == currentUserId && p.IsAdmin);

                if (!isCreator && !isAdmin)
                {
                    return Forbid("Only room creator or admins can add participants");
                }

                // Check if user exists
                var userToAdd = await _context.Users.FindAsync(request.UserId);
                if (userToAdd == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                // Check if user is already a participant
                var existingParticipant = await _context.ChatRoomParticipants
                    .FirstOrDefaultAsync(p => p.ChatRoomId == id && p.UserId == request.UserId);

                if (existingParticipant != null)
                {
                    return BadRequest(new { error = "User is already a participant" });
                }

                // Add participant
                var participant = new ChatRoomParticipant
                {
                    ChatRoomId = id,
                    UserId = request.UserId,
                    JoinedAt = DateTime.UtcNow,
                    IsAdmin = request.IsAdmin
                };

                _context.ChatRoomParticipants.Add(participant);
                await _context.SaveChangesAsync();

                var result = new ChatRoomParticipantResponse
                {
                    UserId = userToAdd.Id,
                    Username = userToAdd.Username,
                    Email = userToAdd.Email,
                    JoinedAt = participant.JoinedAt,
                    IsAdmin = participant.IsAdmin
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to add participant", details = ex.Message });
            }
        }

        [HttpDelete("{id}/participants/{userId}")]
        public async Task<IActionResult> RemoveParticipant(Guid id, Guid userId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var currentUserId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                var room = await _context.ChatRooms.FindAsync(id);
                if (room == null)
                {
                    return NotFound(new { error = "Chat room not found" });
                }

                // Check permissions
                var isCreator = room.CreatedById == currentUserId;
                var isAdmin = await _context.ChatRoomParticipants
                    .AnyAsync(p => p.ChatRoomId == id && p.UserId == currentUserId && p.IsAdmin);
                var isSelf = currentUserId == userId;

                if (!isCreator && !isAdmin && !isSelf)
                {
                    return Forbid("Insufficient permissions to remove participant");
                }

                var participant = await _context.ChatRoomParticipants
                    .FirstOrDefaultAsync(p => p.ChatRoomId == id && p.UserId == userId);

                if (participant == null)
                {
                    return NotFound(new { error = "Participant not found" });
                }

                _context.ChatRoomParticipants.Remove(participant);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to remove participant", details = ex.Message });
            }
        }

        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinRoom(Guid id)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                var room = await _context.ChatRooms.FindAsync(id);
                if (room == null)
                {
                    return NotFound(new { error = "Chat room not found" });
                }

                // If room is private, user cannot join without invitation
                if (room.IsPrivate)
                {
                    return Forbid("Cannot join private room without invitation");
                }

                // Check if already a participant
                var existingParticipant = await _context.ChatRoomParticipants
                    .FirstOrDefaultAsync(p => p.ChatRoomId == id && p.UserId == userId);

                if (existingParticipant != null)
                {
                    return BadRequest(new { error = "Already a participant" });
                }

                // Add as participant
                var participant = new ChatRoomParticipant
                {
                    ChatRoomId = id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow,
                    IsAdmin = false
                };

                _context.ChatRoomParticipants.Add(participant);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Successfully joined room" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to join room", details = ex.Message });
            }
        }
    }

    public class CreateChatRoomRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsPrivate { get; set; } = false;
    }
} 