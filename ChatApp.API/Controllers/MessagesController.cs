using ChatApp.Core.Models;
using ChatApp.Core.Models.DTOs;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using ChatApp.Infrastructure.Repositories;

namespace ChatApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly IMessageService _messageService;

        public MessagesController(IMessageService messageService)
        {
            _messageService = messageService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(int page = 1, int pageSize = 50)
        {
            try
            {
                var messages = await _messageService.GetMessagesAsync(page, pageSize);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve messages", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMessage(Guid id)
        {
            try
            {
                var message = await _messageService.GetMessageAsync(id);
                if (message == null)
                {
                    return NotFound(new { error = "Message not found" });
                }
                return Ok(message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve message", details = ex.Message });
            }
        }

        [HttpGet("sentiment-stats")]
        public async Task<IActionResult> GetSentimentStats()
        {
            try
            {
                var stats = await _messageService.GetSentimentStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve sentiment statistics", details = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Get current user ID from JWT token
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { error = "Invalid user token" });
                }

                var createdMessage = await _messageService.SendMessageAsync(request, userId);
                return Created($"/api/messages", createdMessage);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to send message", details = ex.Message });
            }
        }
    }
} 