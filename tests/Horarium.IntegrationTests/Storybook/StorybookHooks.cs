namespace Horarium.IntegrationTests.Storybook;

[Category("Storybook")]
public abstract class StorybookTestBase : IAsyncDisposable
{
    protected Microsoft.Playwright.IPlaywright Playwright = null!;
    protected Microsoft.Playwright.IBrowser Browser = null!;
    protected Microsoft.Playwright.IPage Page = null!;

    [Before(Test)]
    public async Task SetUpAsync()
    {
        await StorybookServer.EnsureStartedAsync();
        Playwright = await Microsoft.Playwright.Playwright.CreateAsync();
        Browser = await Playwright.Chromium.LaunchAsync(new() { Headless = true });
        Page = await Browser.NewPageAsync(new() { ViewportSize = new() { Width = 1280, Height = 900 } });
    }

    [After(Test)]
    public async Task TearDownAsync()
    {
        await Page.CloseAsync();
        await Browser.CloseAsync();
        Playwright.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        StorybookServer.Stop();
        await Task.CompletedTask;
    }
}
