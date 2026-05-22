using Horarium.Api.Models;
using Horarium.Api.Parser;
using TUnit.Assertions.Extensions;

namespace Horarium.UnitTests;

public class ParserPartialErrorTests
{
    [Test]
    public async Task Invalid_timeslice_value_captured_as_error_rest_parses()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q1
            - timeslice: fortnight
            ## Lanes
            ### Alpha
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field == "timeslice")).IsTrue();
        await Assert.That(result.Plan.Title).IsEqualTo("Plan");
    }

    [Test]
    public async Task Invalid_quarter_format_captured_as_error()
    {
        const string md = """
            # Plan
            - start: 2026-Q9
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field == "start")).IsTrue();
    }

    [Test]
    public async Task Missing_start_on_stage_captured_as_error_stage_still_included()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q2
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            ### My Stage
            - id: s1
            - lane: Alpha
            - end: 2026-Q1
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Stages.Count).IsEqualTo(1);
        await Assert.That(result.Plan.Errors.Any(e => e.Field.Contains("s1"))).IsTrue();
    }

    [Test]
    public async Task Missing_lane_on_stage_captured_as_error()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            ### My Stage
            - id: s1
            - start: 2026-Q1
            - end: 2026-Q1
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field.Contains("s1") && e.Message.Contains("lane"))).IsTrue();
    }

    [Test]
    public async Task Unknown_lane_reference_on_stage_captured_as_error()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            ### My Stage
            - id: s1
            - lane: NonExistent
            - start: 2026-Q1
            - end: 2026-Q1
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Partial);
        await Assert.That(result.Plan!.Errors.Any(e => e.Message.Contains("NonExistent"))).IsTrue();
    }

    [Test]
    public async Task Missing_plan_start_captured_as_error()
    {
        const string md = """
            # Plan
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Errors.Any(e => e.Field == "start")).IsTrue();
    }

    [Test]
    public async Task Multiple_errors_all_collected_not_just_first()
    {
        const string md = """
            # Plan
            - start: 2026-Q9
            - end: 2026-Q0
            - timeslice: fortnight
            ## Lanes
            ### Alpha
            ## Stages
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Errors.Count).IsGreaterThan(1);
    }
}
