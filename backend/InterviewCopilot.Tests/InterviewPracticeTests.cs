using InterviewCopilot.Api;
using InterviewCopilot.Api.Data;
using InterviewCopilot.Api.Providers;
using Microsoft.Data.Sqlite;
using Xunit;

namespace InterviewCopilot.Tests;

public sealed class InterviewPracticeTests
{
    [Theory]
    [InlineData("Product Designer")]
    [InlineData("Frontend Engineer")]
    [InlineData("Product Manager")]
    [InlineData("Data Analyst")]
    [InlineData("Software Engineer")]
    [InlineData("UX Researcher")]
    public void QuestionBankReturnsFiveQuestionsForSupportedRoles(string role)
    {
        var questions = QuestionBank.ForRole(role);

        Assert.Equal(5, questions.Count);
        Assert.All(questions, question => Assert.False(string.IsNullOrWhiteSpace(question.Prompt)));
    }

    [Fact]
    public async Task MockAnswerProviderStreamsAnswerInMultipleChunks()
    {
        var provider = new MockAnswerProvider();
        var chunks = new List<string>();

        await foreach (var chunk in provider.StreamAnswerAsync("Tell me about yourself.", CancellationToken.None))
        {
            chunks.Add(chunk);
        }

        Assert.True(chunks.Count > 1);
        Assert.Contains("context", string.Concat(chunks), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RepositoryPersistsAndReturnsInterviewMetadata()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"interview-copilot-tests-{Guid.NewGuid():N}");
        var databasePath = Path.Combine(directory, "test.db");
        try
        {
            var repository = new InterviewRepository(databasePath);
            await repository.InitializeAsync();
            var created = await repository.CreateAsync("Product Designer", "resume.pdf");

            var interviews = await repository.GetRecentAsync();

            var stored = Assert.Single(interviews);
            Assert.Equal(created.Id, stored.Id);
            Assert.Equal("Product Designer", stored.Role);
            Assert.Equal("resume.pdf", stored.ResumeFileName);
            Assert.Equal(created.Id, (await repository.GetByIdAsync(created.Id))?.Id);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
    }
}
