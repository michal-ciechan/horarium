using Deque.AxeCore.Commons;
using Deque.AxeCore.Playwright;
using Microsoft.Playwright;
using SkiaSharp;
using TUnit.Assertions.Extensions;

namespace Horarium.IntegrationTests.Storybook;

internal static class SnapshotHelper
{
    private static readonly string SnapshotsDir =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../tests/Horarium.IntegrationTests/Storybook/__snapshots__"));

    private static readonly bool UpdateSnapshots =
        Environment.GetEnvironmentVariable("UPDATE_SNAPSHOTS") == "1";

    public static async Task AssertStoryAsync(IPage page, string storyId, string snapshotName)
    {
        var url = $"{StorybookServer.BaseUrl}/iframe.html?id={storyId}&viewMode=story";
        await page.GotoAsync(url, new() { WaitUntil = WaitUntilState.NetworkIdle });
        await page.WaitForSelectorAsync("#storybook-root > *", new() { Timeout = 10_000 });
        await page.WaitForTimeoutAsync(300); // settle animations

        var screenshot = await page.ScreenshotAsync(new() { FullPage = true });

        Directory.CreateDirectory(SnapshotsDir);
        var baselinePath = Path.Combine(SnapshotsDir, $"{snapshotName}.png");

        if (!File.Exists(baselinePath) || UpdateSnapshots)
        {
            await File.WriteAllBytesAsync(baselinePath, screenshot);
            return;
        }

        var diffPercent = PixelDiff(await File.ReadAllBytesAsync(baselinePath), screenshot);
        await Assert.That(diffPercent).IsLessThanOrEqualTo(0.5);
    }

    public static async Task AssertNoContrastViolationsAsync(IPage page)
    {
        var options = new AxeRunOptions
        {
            RunOnly = new RunOnlyOptions { Type = "tag", Values = new List<string> { "wcag2aa" } },
            ResultTypes = new HashSet<ResultType> { ResultType.Violations },
        };
        var results = await page.RunAxe(options);

        var contrastViolations = results.Violations
            .Where(v => v.Id == "color-contrast")
            .ToList();

        await Assert.That(contrastViolations).IsEmpty();
    }

    private static double PixelDiff(byte[] baselineBytes, byte[] actualBytes)
    {
        using var baselineBmp = SKBitmap.Decode(baselineBytes);
        using var actualBmp = SKBitmap.Decode(actualBytes);

        if (baselineBmp.Width != actualBmp.Width || baselineBmp.Height != actualBmp.Height)
            return 100.0;

        long diffPixels = 0;
        int total = baselineBmp.Width * baselineBmp.Height;

        for (int y = 0; y < baselineBmp.Height; y++)
        for (int x = 0; x < baselineBmp.Width; x++)
        {
            var a = baselineBmp.GetPixel(x, y);
            var b = actualBmp.GetPixel(x, y);
            if (Math.Abs(a.Red - b.Red) > 8 ||
                Math.Abs(a.Green - b.Green) > 8 ||
                Math.Abs(a.Blue - b.Blue) > 8)
                diffPixels++;
        }

        return (double)diffPixels / total * 100.0;
    }
}
