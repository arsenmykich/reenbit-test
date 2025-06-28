using ChatApp.API.Hubs;
using ChatApp.Core.Models;
using ChatApp.Infrastructure.Data;
using ChatApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Add configuration sources including environment variables for Azure
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Entity Framework with PostgreSQL (Neon DB)
var databaseProvider = builder.Configuration["DatabaseProvider"] ?? "SqlServer";
Console.WriteLine($"Database Provider: {databaseProvider}");
Console.WriteLine($"Connection String: {builder.Configuration.GetConnectionString("DefaultConnection")}");

builder.Services.AddDbContext<ChatAppDbContext>(options =>
{
    switch (databaseProvider.ToLower())
    {
        case "sqlite":
            Console.WriteLine("Using SQLite");
            options.UseSqlite(builder.Configuration.GetConnectionString("SQLiteConnection"));
            break;
        case "postgresql":
            Console.WriteLine("Using PostgreSQL (Neon DB)");
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
            break;
        case "sqlserver":
        default:
            Console.WriteLine("Using SQL Server");
            options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
            break;
    }
});

// Register UnitOfWork
builder.Services.AddScoped<ChatApp.Infrastructure.Repositories.IUnitOfWork, ChatApp.Infrastructure.Repositories.UnitOfWork>();

// Add custom UserIdProvider for SignalR
builder.Services.AddSingleton<IUserIdProvider, ChatApp.API.CustomUserIdProvider>();

// Add SignalR with Azure SignalR Service (fallback to local SignalR if no connection string)
var azureSignalRConnectionString = builder.Configuration["AzureSignalR__ConnectionString"];
Console.WriteLine($"Azure SignalR Connection String: {(!string.IsNullOrEmpty(azureSignalRConnectionString) ? "Found" : "Not Found")}");

if (!string.IsNullOrEmpty(azureSignalRConnectionString))
{
    Console.WriteLine("Using Azure SignalR Service");
    builder.Services.AddSignalR()
        .AddAzureSignalR(azureSignalRConnectionString);
}
else
{
    Console.WriteLine("Using Local SignalR (Azure SignalR connection string not provided)");
    builder.Services.AddSignalR();
}

// Add Sentiment Analysis Service
builder.Services.AddScoped<ISentimentAnalysisService, SentimentAnalysisService>();

// Add Authentication Service
builder.Services.AddScoped<IAuthService, AuthService>();

// Add MessageService
builder.Services.AddScoped<ChatApp.Infrastructure.Services.IMessageService, ChatApp.Infrastructure.Services.MessageService>();

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")))
        };

        // Add support for JWT in SignalR
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chathub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Add CORS for frontend integration
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Serve static files
app.UseStaticFiles();

// Use CORS
app.UseCors();

// Use routing
app.UseRouting();

// Use authentication and authorization (must be after UseRouting)
app.UseAuthentication();
app.UseAuthorization();

// Map controllers
app.MapControllers();

// Map SignalR hub
app.MapHub<ChatHub>("/chathub");

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ChatAppDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    
    context.Database.EnsureCreated();
    
    // Seed admin user if not exists
    var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@chatapp.com");
    if (adminUser == null)
    {
        var adminUserEntity = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            Email = "admin@chatapp.com",
            PasswordHash = authService.HashPassword("Admin123!"),
            CreatedAt = DateTime.UtcNow
        };
        
        context.Users.Add(adminUserEntity);
        await context.SaveChangesAsync();
        
        Console.WriteLine("Admin user created:");
        Console.WriteLine("Email: admin@chatapp.com");
        Console.WriteLine("Password: Admin123!");
    }
}

app.Run();
