using InterviewCopilot.Api;
using Microsoft.Data.Sqlite;

namespace InterviewCopilot.Api.Data;

public sealed class InterviewRepository(string databasePath)
{
    private readonly string _connectionString = new SqliteConnectionStringBuilder
    {
        DataSource = databasePath
    }.ToString();

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var directory = Path.GetDirectoryName(databasePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS interviews (
                id TEXT PRIMARY KEY NOT NULL,
                role TEXT NOT NULL,
                resume_file_name TEXT NULL,
                created_at TEXT NOT NULL
            );
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<InterviewSession> CreateAsync(
        string role,
        string? resumeFileName,
        CancellationToken cancellationToken = default)
    {
        var interview = new InterviewSession(
            Guid.NewGuid().ToString("N"),
            role,
            resumeFileName,
            DateTimeOffset.UtcNow);

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO interviews (id, role, resume_file_name, created_at)
            VALUES ($id, $role, $resumeFileName, $createdAt);
            """;
        command.Parameters.AddWithValue("$id", interview.Id);
        command.Parameters.AddWithValue("$role", interview.Role);
        command.Parameters.AddWithValue("$resumeFileName", (object?)interview.ResumeFileName ?? DBNull.Value);
        command.Parameters.AddWithValue("$createdAt", interview.CreatedAt.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
        return interview;
    }

    public async Task<InterviewSession?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, role, resume_file_name, created_at
            FROM interviews
            WHERE id = $id;
            """;
        command.Parameters.AddWithValue("$id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new InterviewSession(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            DateTimeOffset.Parse(reader.GetString(3)));
    }

    public async Task<IReadOnlyList<InterviewSession>> GetRecentAsync(
        CancellationToken cancellationToken = default)
    {
        var interviews = new List<InterviewSession>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, role, resume_file_name, created_at
            FROM interviews
            ORDER BY created_at DESC
            LIMIT 20;
            """;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            interviews.Add(new InterviewSession(
                reader.GetString(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                DateTimeOffset.Parse(reader.GetString(3))));
        }

        return interviews;
    }
}
