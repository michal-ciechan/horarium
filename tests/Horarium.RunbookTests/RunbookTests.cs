using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using TUnit.Assertions.Extensions;

namespace Horarium.RunbookTests;

/// <summary>
/// End-to-end runbook tests. Run manually or in a dedicated CI step.
/// Requires dotnet pack to have been run first (nupkg/ must exist).
/// </summary>
[Category("Runbook")]
public class RunbookTests : IAsyncDisposable
{
    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));

    private static readonly string NupkgDir = Path.Combine(RepoRoot, "nupkg");

    private string? _watchDir;
    private Process? _serverProcess;
    private int _serverPort;

    [Before(Test)]
    public async Task SetupAsync()
    {
        _watchDir = Path.Combine(Path.GetTempPath(), $"horarium-runbook-{Guid.NewGuid()}");
        Directory.CreateDirectory(_watchDir);
        File.WriteAllText(Path.Combine(_watchDir, "sample.md"), SamplePlan);
        await Task.CompletedTask;
    }

    [Test]
    [NotInParallel]
    public async Task Pack_and_install_tool_then_run_and_verify_api()
    {
        // 1. Pack
        await RunDotnet($"pack src/Horarium.Api/Horarium.Api.csproj -c Release", RepoRoot);

        // 2. Uninstall any previous version
        await RunDotnet("tool uninstall -g horarium", RepoRoot, expectSuccess: false);

        // 3. Install from local nupkg
        await RunDotnet($"tool install -g horarium --add-source \"{NupkgDir}\" --version 0.1.0", RepoRoot);

        try
        {
            // 4. Start tool
            (_serverProcess, _serverPort) = await StartHorarium(_watchDir!);

            // 5. Verify /api/plans returns the sample file
            using var client = new HttpClient { BaseAddress = new Uri($"http://localhost:{_serverPort}") };
            var response = await client.GetAsync("/api/plans");
            await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
            var json = await response.Content.ReadAsStringAsync();
            await Assert.That(json).Contains("sample");

            // 6. Verify plan parses successfully
            var plan = await client.GetFromJsonAsync<ParseResultDto>("/api/plans/sample.md");
            await Assert.That(plan!.Status).IsEqualTo(0); // ParseStatus.Success
        }
        finally
        {
            await RunDotnet("tool uninstall -g horarium", RepoRoot, expectSuccess: false);
        }
    }

    [Test]
    [NotInParallel]
    public async Task Live_reload_new_file_appears_in_tree_without_restart()
    {
        (_serverProcess, _serverPort) = await StartHorarium(_watchDir!);

        using var client = new HttpClient { BaseAddress = new Uri($"http://localhost:{_serverPort}") };

        // Confirm initial state
        var before = await client.GetStringAsync("/api/plans");
        await Assert.That(before).Contains("sample");
        await Assert.That(before).DoesNotContain("newplan");

        // Drop a new file
        File.WriteAllText(Path.Combine(_watchDir!, "newplan.md"), SamplePlan.Replace("Sample Plan", "New Plan"));
        await Task.Delay(500); // allow FS event to propagate

        var after = await client.GetStringAsync("/api/plans");
        await Assert.That(after).Contains("newplan");
    }

    [Test]
    [NotInParallel]
    public async Task Folder_arg_watches_specified_folder()
    {
        var altDir = Path.Combine(Path.GetTempPath(), $"horarium-alt-{Guid.NewGuid()}");
        Directory.CreateDirectory(altDir);
        File.WriteAllText(Path.Combine(altDir, "alt.md"), SamplePlan);

        try
        {
            (_serverProcess, _serverPort) = await StartHorarium(altDir);
            using var client = new HttpClient { BaseAddress = new Uri($"http://localhost:{_serverPort}") };
            var json = await client.GetStringAsync("/api/plans");
            await Assert.That(json).Contains("alt");
        }
        finally
        {
            if (Directory.Exists(altDir)) Directory.Delete(altDir, recursive: true);
        }
    }

    [Test]
    [NotInParallel]
    public async Task Parse_error_surfaced_in_api_response()
    {
        File.WriteAllText(Path.Combine(_watchDir!, "broken.md"), BrokenPlan);

        (_serverProcess, _serverPort) = await StartHorarium(_watchDir!);
        using var client = new HttpClient { BaseAddress = new Uri($"http://localhost:{_serverPort}") };

        var plan = await client.GetFromJsonAsync<ParseResultDto>("/api/plans/broken.md");
        await Assert.That(plan!.Status).IsEqualTo(1); // ParseStatus.Partial
        await Assert.That(plan.Plan?.Errors?.Length ?? 0).IsGreaterThan(0);
    }

    [Test]
    [NotInParallel]
    public async Task Unrecognised_file_returned_with_raw_content()
    {
        File.WriteAllText(Path.Combine(_watchDir!, "noise.md"), "just notes, no plan");

        (_serverProcess, _serverPort) = await StartHorarium(_watchDir!);
        using var client = new HttpClient { BaseAddress = new Uri($"http://localhost:{_serverPort}") };

        var result = await client.GetFromJsonAsync<ParseResultDto>("/api/plans/noise.md");
        await Assert.That(result!.Status).IsEqualTo(2); // ParseStatus.Unrecognisable
        await Assert.That(result.RawContent).IsNotNull();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static async Task<(Process process, int port)> StartHorarium(string watchDir)
    {
        var port = FindFreePort();
        var exe = OperatingSystem.IsWindows() ? "horarium.exe" : "horarium";
        var toolPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".dotnet", "tools", exe);

        var psi = new ProcessStartInfo(toolPath, $"\"{watchDir}\"")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            Environment = { ["ASPNETCORE_URLS"] = $"http://localhost:{port}" }
        };

        var proc = Process.Start(psi)!;

        // Wait until the server is accepting connections
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        using var client = new HttpClient();
        while (!cts.Token.IsCancellationRequested)
        {
            try
            {
                var r = await client.GetAsync($"http://localhost:{port}/api/plans", cts.Token);
                if (r.IsSuccessStatusCode) break;
            }
            catch { await Task.Delay(200, cts.Token); }
        }

        return (proc, port);
    }

    private static async Task RunDotnet(string args, string workDir, bool expectSuccess = true)
    {
        var psi = new ProcessStartInfo("dotnet", args)
        {
            WorkingDirectory = workDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };
        var proc = Process.Start(psi)!;
        await proc.WaitForExitAsync();
        if (expectSuccess)
            await Assert.That(proc.ExitCode).IsEqualTo(0);
    }

    private static int FindFreePort()
    {
        using var l = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
        l.Start();
        var port = ((System.Net.IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return port;
    }

    public async ValueTask DisposeAsync()
    {
        if (_serverProcess is { HasExited: false })
        {
            _serverProcess.Kill(entireProcessTree: true);
            await _serverProcess.WaitForExitAsync();
        }
        _serverProcess?.Dispose();
        if (_watchDir != null && Directory.Exists(_watchDir))
            Directory.Delete(_watchDir, recursive: true);
    }

    private const string SamplePlan = """
        # Sample Plan
        - start: 2026-Q1
        - end: 2026-Q2
        - timeslice: quarter

        ## Lanes

        ### Alpha
        - color: "#e8eefc"

        ## Stages

        ### Stage One
        - id: s1
        - lane: Alpha
        - start: 2026-Q1
        - end: 2026-Q2
        """;

    private const string BrokenPlan = """
        # Broken Plan
        - start: 2026-Q9
        - end: 2026-Q2
        - timeslice: quarter

        ## Lanes

        ### Alpha

        ## Stages

        ### Stage
        - id: s1
        - lane: Alpha
        - start: 2026-Q1
        - end: 2026-Q2
        """;

    private record ParseResultDto(int Status, PlanDto? Plan, string? RawContent);
    private record PlanDto(ErrorDto[]? Errors);
    private record ErrorDto(string Field, string Message);
}
