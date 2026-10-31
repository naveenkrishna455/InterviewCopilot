using System.Runtime.CompilerServices;

namespace InterviewCopilot.Api.Providers;

public sealed class MockAnswerProvider : IAnswerProvider
{
    public async IAsyncEnumerable<string> StreamAnswerAsync(
        string question,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        _ = question;
        const string answer = "A strong way to approach this is to start with the context and the goal. " +
                              "I would explain the options I considered, the decision I made, and why it fit the situation. " +
                              "Then I would share the impact and what I learned, including anything I would do differently next time.";
        const int chunkLength = 12;

        for (var index = 0; index < answer.Length; index += chunkLength)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(TimeSpan.FromMilliseconds(35), cancellationToken);
            yield return answer.Substring(index, Math.Min(chunkLength, answer.Length - index));
        }
    }
}
