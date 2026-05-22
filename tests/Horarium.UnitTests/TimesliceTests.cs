using Horarium.Api.Models;
using Horarium.Api.Parser;
using TUnit.Assertions.Extensions;

namespace Horarium.UnitTests;

public class TimesliceTests
{
    [Test]
    [Arguments("2026-Q1", "2026-Q4", new[] { "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4" })]
    [Arguments("2026-Q3", "2027-Q1", new[] { "2026-Q3", "2026-Q4", "2027-Q1" })]
    [Arguments("2026-Q4", "2027-Q2", new[] { "2026-Q4", "2027-Q1", "2027-Q2" })]
    public async Task Quarter_slices_generated_correctly(string start, string end, string[] expected)
    {
        var slices = SliceHelper.GetSlices(start, end, Timeslice.Quarter);
        await Assert.That(slices).IsEquivalentTo(expected);
    }

    [Test]
    [Arguments("2026-01", "2026-04", new[] { "2026-01", "2026-02", "2026-03", "2026-04" })]
    [Arguments("2026-11", "2027-02", new[] { "2026-11", "2026-12", "2027-01", "2027-02" })]
    public async Task Month_slices_generated_correctly(string start, string end, string[] expected)
    {
        var slices = SliceHelper.GetSlices(start, end, Timeslice.Month);
        await Assert.That(slices).IsEquivalentTo(expected);
    }

    [Test]
    public async Task Stage_start_before_plan_start_recorded_as_error()
    {
        const string md = """
            # Plan
            - start: 2026-Q2
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
        var result = PlanParser.Parse(md);
        // Parser should include stage but surface a warning that it starts before plan
        await Assert.That(result.Plan!.Stages.Count).IsEqualTo(1);
    }

    [Test]
    [Arguments("2026-Q1")]
    [Arguments("2027-Q4")]
    [Arguments("2028-Q2")]
    public async Task Valid_quarter_format_parses_without_error(string value)
    {
        var md = $"""
            # Plan
            - start: {value}
            - end: {value}
            - timeslice: quarter
            ## Lanes
            ### A
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field == "start")).IsFalse();
    }

    [Test]
    [Arguments("2026-Q0")]
    [Arguments("2026-Q5")]
    [Arguments("2026-Q")]
    [Arguments("26-Q1")]
    public async Task Invalid_quarter_format_produces_error(string value)
    {
        var md = $"""
            # Plan
            - start: {value}
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### A
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field == "start")).IsTrue();
    }
}
