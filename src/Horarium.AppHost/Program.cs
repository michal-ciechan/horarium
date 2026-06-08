var builder = DistributedApplication.CreateBuilder(args);

var watchFolder = args.FirstOrDefault(a => !a.StartsWith('-')) ?? @"C:\src\horarium\samples";

builder.AddExecutable("api", "dotnet", "../Horarium.Api",
        "run", "--no-launch-profile", "--", watchFolder)
    .WithEnvironment("ASPNETCORE_URLS", "http://localhost:17002")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Development")
    .WithEndpoint(targetPort: 17002, scheme: "http");

builder.AddViteApp("frontend", "../horarium-ui", "dev")
    .WithNpm()
    .WithEndpoint(targetPort: 17001, scheme: "http");

builder.AddJavaScriptApp("storybook", "../horarium-ui", "storybook")
    .WithNpm()
    .WithRunScript("storybook")
    .WithEndpoint(targetPort: 17004, scheme: "http");

builder.Build().Run();
