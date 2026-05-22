using System.Diagnostics;
using System.Net.Sockets;

namespace Horarium.IntegrationTests.Storybook;

internal static class StorybookServer
{
    private const int Port = 6006;
    private static readonly string UiDir =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../src/horarium-ui"));

    private static Process? _process;
    private static readonly SemaphoreSlim Lock = new(1, 1);

    public static string BaseUrl => $"http://localhost:{Port}";

    public static async Task EnsureStartedAsync()
    {
        await Lock.WaitAsync();
        try
        {
            if (IsReady()) return;

            _process = Process.Start(new ProcessStartInfo
            {
                FileName = "npm",
                Arguments = "run storybook",
                WorkingDirectory = UiDir,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            })!;

            await WaitForPortAsync(Port, TimeSpan.FromSeconds(60));
        }
        finally
        {
            Lock.Release();
        }
    }

    public static void Stop()
    {
        if (_process is { HasExited: false })
        {
            _process.Kill(entireProcessTree: true);
            _process.Dispose();
            _process = null;
        }
    }

    private static bool IsReady()
    {
        try
        {
            using var tcp = new TcpClient();
            tcp.Connect("localhost", Port);
            return true;
        }
        catch { return false; }
    }

    private static async Task WaitForPortAsync(int port, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        while (!cts.Token.IsCancellationRequested)
        {
            if (IsReady()) return;
            await Task.Delay(500, cts.Token);
        }
        throw new TimeoutException($"Storybook did not start on port {port} within {timeout.TotalSeconds}s.");
    }
}
