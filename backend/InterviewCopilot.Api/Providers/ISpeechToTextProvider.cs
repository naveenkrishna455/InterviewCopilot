namespace InterviewCopilot.Api.Providers;

public interface ISpeechToTextProvider
{
    Task<string> TranscribeAsync(Stream audio, CancellationToken cancellationToken);
}
