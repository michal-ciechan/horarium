namespace Horarium.IntegrationTests.Storybook;

[NotInParallel("storybook")]
public class PageSnapshotTests : StorybookTestBase
{
    // ── PlanView ──────────────────────────────────────────────────────────────

    [Test] public async Task PlanView_ValidPlan()
        => await RunAsync("pages-planview--valid-plan");

    [Test] public async Task PlanView_WithErrors()
        => await RunAsync("pages-planview--with-errors");

    [Test] public async Task PlanView_Unrecognisable()
        => await RunAsync("pages-planview--unrecognisable");

    // ── HomePage ──────────────────────────────────────────────────────────────

    [Test] public async Task HomePage_Empty()
        => await RunAsync("pages-homepage--empty");

    [Test] public async Task HomePage_Populated()
        => await RunAsync("pages-homepage--populated");

    [Test] public async Task HomePage_WithPlanSelected()
        => await RunAsync("pages-homepage--with-plan-selected");

    // ── helper ────────────────────────────────────────────────────────────────

    private async Task RunAsync(string storyId)
    {
        var snapshotName = storyId.Replace("--", "_").Replace("-", "_");
        await SnapshotHelper.AssertStoryAsync(Page, storyId, snapshotName);
        await SnapshotHelper.AssertNoContrastViolationsAsync(Page);
    }
}
