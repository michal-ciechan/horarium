using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Horarium.Api.Parser;
using Microsoft.AspNetCore.Mvc.Testing;
using TUnit.Assertions.Extensions;

namespace Horarium.IntegrationTests;

public class ApiPlanTests : IAsyncDisposable
{
    private readonly string _tempDir;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    public ApiPlanTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"horarium-test-{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempDir);

        File.WriteAllText(Path.Combine(_tempDir, "valid.md"), Fixtures.ValidPlan);
        File.WriteAllText(Path.Combine(_tempDir, "partial.md"), Fixtures.PartialPlan);
        File.WriteAllText(Path.Combine(_tempDir, "unknown.md"), Fixtures.UnrecognisedDoc);

        var subDir = Path.Combine(_tempDir, "sub");
        Directory.CreateDirectory(subDir);
        File.WriteAllText(Path.Combine(subDir, "nested.md"), Fixtures.ValidPlan);

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(b => b.UseSetting("WatchFolder", _tempDir));
        _client = _factory.CreateClient();
    }

    [Test]
    public async Task Get_plans_returns_tree_with_all_files()
    {
        var response = await _client.GetAsync("/api/plans");
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        await Assert.That(json).Contains("valid");
        await Assert.That(json).Contains("partial");
        await Assert.That(json).Contains("unknown");
    }

    [Test]
    public async Task Get_plans_reflects_subfolder_structure()
    {
        var json = await _client.GetStringAsync("/api/plans");
        await Assert.That(json).Contains("sub");
        await Assert.That(json).Contains("nested");
    }

    [Test]
    public async Task Get_valid_plan_returns_success_status()
    {
        var result = await _client.GetFromJsonAsync<ParseResult>("/api/plans/valid.md", JsonOpts);
        await Assert.That(result!.Status).IsEqualTo(ParseStatus.Success);
        await Assert.That(result.Plan).IsNotNull();
    }

    [Test]
    public async Task Get_partial_plan_returns_partial_status_with_errors()
    {
        var result = await _client.GetFromJsonAsync<ParseResult>("/api/plans/partial.md", JsonOpts);
        await Assert.That(result!.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Errors).IsNotEmpty();
    }

    [Test]
    public async Task Get_unrecognised_doc_returns_unrecognisable_status_with_raw_content()
    {
        var result = await _client.GetFromJsonAsync<ParseResult>("/api/plans/unknown.md", JsonOpts);
        await Assert.That(result!.Status).IsEqualTo(ParseStatus.Unrecognisable);
        await Assert.That(result.RawContent).IsNotNull();
        await Assert.That(result.Plan).IsNull();
    }

    [Test]
    public async Task Get_nonexistent_file_returns_404()
    {
        var response = await _client.GetAsync("/api/plans/does-not-exist.md");
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
    }

    [Test]
    public async Task Homepage_returns_spa_fallback_for_unknown_routes()
    {
        // Any unknown route should fall back to index.html (SPA routing)
        var response = await _client.GetAsync("/some/unknown/ui/route");
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        await Assert.That(content).Contains("<div id=\"root\">");
    }

    // ── Enum serialisation regression tests (must fail before the fix) ──────

    [Test]
    public async Task Plan_timeslice_is_serialised_as_string_not_integer()
    {
        var json = await _client.GetStringAsync("/api/plans/valid.md");
        using var doc = JsonDocument.Parse(json);

        var timeslice = doc.RootElement.GetProperty("plan").GetProperty("timeslice");
        await Assert.That(timeslice.ValueKind).IsEqualTo(JsonValueKind.String);
        await Assert.That(timeslice.GetString()).IsEqualTo("Quarter");
    }

    [Test]
    public async Task Plan_status_is_serialised_as_string_not_integer()
    {
        var json = await _client.GetStringAsync("/api/plans/valid.md");
        using var doc = JsonDocument.Parse(json);

        var status = doc.RootElement.GetProperty("status");
        await Assert.That(status.ValueKind).IsEqualTo(JsonValueKind.String);
        await Assert.That(status.GetString()).IsEqualTo("Success");
    }

    [Test]
    public async Task Tree_node_kind_is_serialised_as_string_not_integer()
    {
        var json = await _client.GetStringAsync("/api/plans");
        using var doc = JsonDocument.Parse(json);

        var kind = doc.RootElement[0].GetProperty("kind");
        await Assert.That(kind.ValueKind).IsEqualTo(JsonValueKind.String);
    }

    [Test]
    public async Task Non_md_files_not_included_in_tree()
    {
        File.WriteAllText(Path.Combine(_tempDir, "notes.txt"), "not markdown");
        var json = await _client.GetStringAsync("/api/plans");
        await Assert.That(json).DoesNotContain("notes.txt");
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }
}
