namespace InterviewCopilot.Api;

public sealed record CreateInterviewRequest(string? Role, string? ResumeFileName);

public sealed record InterviewSession(
    string Id,
    string Role,
    string? ResumeFileName,
    DateTimeOffset CreatedAt);

public sealed record InterviewQuestion(string Id, string Prompt, string Category);

public sealed record AnswerSocketRequest(string? Type, string? Prompt);

public sealed record AnswerSocketMessage(string Type, string? Token = null, string? Message = null);
