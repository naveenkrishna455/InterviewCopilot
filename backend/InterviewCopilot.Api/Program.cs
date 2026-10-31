using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using InterviewCopilot.Api;
using InterviewCopilot.Api.Data;
using InterviewCopilot.Api.Providers;

var builder = WebApplication.CreateBuilder(args);
var appDataDirectory = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
var defaultDatabasePath = Path.Combine(appDataDirectory, "InterviewCopilot", "interviews.db");
var databasePath = builder.Configuration.GetConnectionString("InterviewCopilot") ?? defaultDatabasePath;

builder.Services.AddProblemDetails();
builder.Services.AddCors(options => options.AddPolicy("DesktopClient", policy =>
    policy.WithOrigins("http://127.0.0.1:5173", "http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()));
builder.Services.AddSingleton(new InterviewRepository(databasePath));
builder.Services.AddSingleton<IAnswerProvider, MockAnswerProvider>();
var app = builder.Build();

await app.Services.GetRequiredService<InterviewRepository>().InitializeAsync();
app.UseExceptionHandler();
app.UseCors("DesktopClient");
app.UseWebSockets();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/questions", (string? role) =>
{
    if (string.IsNullOrWhiteSpace(role) || !QuestionBank.IsSupportedRole(role))
    {
        return Results.BadRequest(new { error = "Choose a supported interview role." });
    }

    return Results.Ok(QuestionBank.ForRole(role));
});

app.MapPost("/api/interviews", async (
    CreateInterviewRequest request,
    InterviewRepository repository,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Role) || !QuestionBank.IsSupportedRole(request.Role))
    {
        return Results.BadRequest(new { error = "Choose a supported interview role." });
    }

    var fileName = request.ResumeFileName?.Trim();
    if (fileName is { Length: > 180 } ||
        (fileName is not null && (fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 ||
                                  fileName.Contains('/') || fileName.Contains('\\'))))
    {
        return Results.BadRequest(new { error = "Resume filename is invalid." });
    }

    var interview = await repository.CreateAsync(request.Role.Trim(), fileName, cancellationToken);
    return Results.Created($"/api/interviews/{interview.Id}", interview);
});

app.MapGet("/api/interviews/{id}", async (
    string id,
    InterviewRepository repository,
    CancellationToken cancellationToken) =>
{
    var interview = await repository.GetByIdAsync(id, cancellationToken);
    return interview is null ? Results.NotFound() : Results.Ok(interview);
});

app.MapGet("/api/interviews", async (
    InterviewRepository repository,
    CancellationToken cancellationToken) =>
    Results.Ok(await repository.GetRecentAsync(cancellationToken)));

app.Map("/ws/interview", async (HttpContext context, IAnswerProvider answerProvider) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var origin = context.Request.Headers.Origin.ToString();
    if (origin.Length > 0 &&
        origin is not "http://127.0.0.1:5173" and not "http://localhost:5173")
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    try
    {
        var request = await ReadAnswerRequestAsync(socket, context.RequestAborted);
        if (request is null ||
            request.Type != "answer" ||
            string.IsNullOrWhiteSpace(request.Prompt) ||
            request.Prompt.Length > 4000)
        {
            await SendSocketMessageAsync(
                socket,
                new AnswerSocketMessage("error", Message: "Send an answer request with a prompt of up to 4,000 characters."),
                context.RequestAborted);
            await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Invalid request", context.RequestAborted);
            return;
        }

        await foreach (var token in answerProvider.StreamAnswerAsync(request.Prompt, context.RequestAborted))
        {
            await SendSocketMessageAsync(
                socket,
                new AnswerSocketMessage("answer-token", Token: token),
                context.RequestAborted);
        }

        await SendSocketMessageAsync(
            socket,
            new AnswerSocketMessage("answer-complete"),
            context.RequestAborted);
        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Answer complete", context.RequestAborted);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        // The client closed the stream; no response can be delivered.
    }
    catch (WebSocketException exception)
    {
        app.Logger.LogInformation(exception, "Interview answer WebSocket closed unexpectedly.");
    }
    catch (JsonException exception)
    {
        app.Logger.LogWarning(exception, "Interview answer WebSocket received invalid JSON.");
        if (socket.State == WebSocketState.Open)
        {
            await SendSocketMessageAsync(
                socket,
                new AnswerSocketMessage("error", Message: "The request was not valid JSON."),
                context.RequestAborted);
            await socket.CloseAsync(WebSocketCloseStatus.InvalidPayloadData, "Invalid JSON", context.RequestAborted);
        }
    }
});

app.Run("http://127.0.0.1:5187");

static async Task<AnswerSocketRequest?> ReadAnswerRequestAsync(
    WebSocket socket,
    CancellationToken cancellationToken)
{
    using var content = new MemoryStream();
    var buffer = new byte[2048];
    WebSocketReceiveResult result;
    do
    {
        result = await socket.ReceiveAsync(buffer, cancellationToken);
        if (result.MessageType == WebSocketMessageType.Close)
        {
            return null;
        }

        if (result.MessageType != WebSocketMessageType.Text || content.Length + result.Count > 8192)
        {
            throw new JsonException("WebSocket request must be a text message under 8 KB.");
        }

        content.Write(buffer, 0, result.Count);
    } while (!result.EndOfMessage);

    return JsonSerializer.Deserialize<AnswerSocketRequest>(
        Encoding.UTF8.GetString(content.ToArray()),
        JsonSerializerOptions.Web);
}

static async Task SendSocketMessageAsync(
    WebSocket socket,
    AnswerSocketMessage message,
    CancellationToken cancellationToken)
{
    var bytes = JsonSerializer.SerializeToUtf8Bytes(message, JsonSerializerOptions.Web);
    await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
}

public partial class Program { }
