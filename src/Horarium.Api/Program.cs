using Horarium.Api.Parser;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

// CLI positional arg (first non-flag arg) overrides WatchFolder config
var positional = args.FirstOrDefault(a => !a.StartsWith('-'));
if (positional != null)
    builder.Configuration["WatchFolder"] = Path.GetFullPath(positional);

var app = builder.Build();

var watchFolder = app.Configuration["WatchFolder"]
    ?? Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

if (!Directory.Exists(watchFolder))
{
    Console.Error.WriteLine($"Folder not found: {watchFolder}");
    return 1;
}

var wf = new WatchedFolder(watchFolder);

app.UseWebSockets();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/plans", () =>
    Results.Ok(FileTreeBuilder.Build(wf.Path)));

app.MapGet("/api/plans/{**path}", (string path) =>
{
    var fullPath = Path.GetFullPath(Path.Combine(wf.Path, path));
    if (!fullPath.StartsWith(wf.Path, StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest("Invalid path.");
    if (!File.Exists(fullPath))
        return Results.NotFound();
    return Results.Ok(PlanParser.Parse(File.ReadAllText(fullPath)));
});

app.MapGet("/ws", async (HttpContext ctx) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest) { ctx.Response.StatusCode = 400; return; }

    using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
    using var watcher = new FileSystemWatcher(wf.Path, "*.md")
    {
        IncludeSubdirectories = true,
        NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName,
        EnableRaisingEvents = true
    };

    async void OnChanged(object _, FileSystemEventArgs __)
    {
        if (ws.State != System.Net.WebSockets.WebSocketState.Open) return;
        try { await ws.SendAsync("reload"u8.ToArray(), System.Net.WebSockets.WebSocketMessageType.Text, true, CancellationToken.None); }
        catch { }
    }

    watcher.Changed += OnChanged;
    watcher.Created += OnChanged;
    watcher.Deleted += OnChanged;
    watcher.Renamed += OnChanged;

    var buf = new byte[128];
    try
    {
        var r = await ws.ReceiveAsync(buf, CancellationToken.None);
        while (!r.CloseStatus.HasValue)
            r = await ws.ReceiveAsync(buf, CancellationToken.None);
        await ws.CloseAsync(r.CloseStatus.Value, r.CloseStatusDescription, CancellationToken.None);
    }
    catch { }
});

app.MapFallbackToFile("index.html");

var address = app.Urls.FirstOrDefault() ?? $"http://localhost:5000";
Console.WriteLine($"Watching: {watchFolder}");
Console.WriteLine($"Open:     {address}");

await app.RunAsync();
return 0;

static int FindFreePort()
{
    using var l = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
    l.Start();
    var port = ((System.Net.IPEndPoint)l.LocalEndpoint).Port;
    l.Stop();
    return port;
}

public partial class Program { }
public record WatchedFolder(string Path);
