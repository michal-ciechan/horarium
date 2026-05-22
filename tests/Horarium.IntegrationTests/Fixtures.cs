namespace Horarium.IntegrationTests;

internal static class Fixtures
{
    public const string ValidPlan = """
        # Test Plan
        - start: 2026-Q1
        - end: 2026-Q4
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

    public const string PartialPlan = """
        # Broken Plan
        - start: 2026-Q9
        - end: 2026-Q4
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

    public const string UnrecognisedDoc = """
        Just some random notes that are not a horarium plan.
        No H1, no lanes, no stages.
        """;
}
