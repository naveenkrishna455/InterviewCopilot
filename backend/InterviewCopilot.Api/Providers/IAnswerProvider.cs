namespace InterviewCopilot.Api.Providers;

public interface IAnswerProvider
{
    IAsyncEnumerable<string> StreamAnswerAsync(string question, CancellationToken cancellationToken);
}
