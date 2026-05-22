namespace Horarium.IntegrationTests.Storybook;

[NotInParallel("storybook")]
public class ComponentSnapshotTests : StorybookTestBase
{
    // ── FileTree ─────────────────────────────────────────────────────────────

    [Test] public async Task FileTree_Empty()
        => await RunAsync("components-filetree--empty");

    [Test] public async Task FileTree_FlatList()
        => await RunAsync("components-filetree--flat-list");

    [Test] public async Task FileTree_WithSelected()
        => await RunAsync("components-filetree--with-selected");

    [Test] public async Task FileTree_WithErrors()
        => await RunAsync("components-filetree--with-errors");

    [Test] public async Task FileTree_Nested()
        => await RunAsync("components-filetree--nested");

    // ── ErrorBanner ───────────────────────────────────────────────────────────

    [Test] public async Task ErrorBanner_SingleError()
        => await RunAsync("components-errorbanner--single-error");

    [Test] public async Task ErrorBanner_MultipleErrors()
        => await RunAsync("components-errorbanner--multiple-errors");

    [Test] public async Task ErrorBanner_NoErrors()
        => await RunAsync("components-errorbanner--no-errors");

    // ── HoverCard ─────────────────────────────────────────────────────────────

    [Test] public async Task HoverCard_WithDependencies()
        => await RunAsync("components-hovercard--with-dependencies");

    [Test] public async Task HoverCard_WithoutDependencies()
        => await RunAsync("components-hovercard--without-dependencies");

    [Test] public async Task HoverCard_MinimalStage()
        => await RunAsync("components-hovercard--minimal-stage");

    // ── RawContentView ────────────────────────────────────────────────────────

    [Test] public async Task RawContentView_Short()
        => await RunAsync("components-rawcontentview--short");

    [Test] public async Task RawContentView_Long()
        => await RunAsync("components-rawcontentview--long");

    // ── DependencyArrows ──────────────────────────────────────────────────────

    [Test] public async Task DependencyArrows_SameLane()
        => await RunAsync("components-dependencyarrows--same-lane");

    [Test] public async Task DependencyArrows_CrossLane()
        => await RunAsync("components-dependencyarrows--cross-lane");

    [Test] public async Task DependencyArrows_Chain()
        => await RunAsync("components-dependencyarrows--chain");

    // ── helper ────────────────────────────────────────────────────────────────

    private async Task RunAsync(string storyId)
    {
        var snapshotName = storyId.Replace("--", "_").Replace("-", "_");
        await SnapshotHelper.AssertStoryAsync(Page, storyId, snapshotName);
        await SnapshotHelper.AssertNoContrastViolationsAsync(Page);
    }
}
