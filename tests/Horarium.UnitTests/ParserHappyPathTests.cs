using Horarium.Api.Models;
using Horarium.Api.Parser;
using TUnit.Assertions.Extensions;

namespace Horarium.UnitTests;

public class ParserHappyPathTests
{
    private const string FullPlan = """
        # My Plan
        - start: 2026-Q1
        - end: 2026-Q4
        - timeslice: quarter

        Overall description here.

        ## Lanes

        ### Alpha
        - color: "#e8eefc"

        Alpha lane description.

        ### Beta
        - color: "#ece8fc"

        ## Stages

        ### Stage One
        - id: s1
        - lane: Alpha
        - start: 2026-Q1
        - end: 2026-Q2
        - enables: s2

        First stage description.

        ### Stage Two
        - id: s2
        - lane: Beta
        - start: 2026-Q3
        - end: 2026-Q4
        - depends_on: s1

        Second stage description.
        """;

    [Test]
    public async Task Title_is_parsed_from_h1()
    {
        var result = PlanParser.Parse(FullPlan);
        await Assert.That(result.Plan!.Title).IsEqualTo("My Plan");
    }

    [Test]
    public async Task Start_end_timeslice_parsed_from_meta_bullets()
    {
        var result = PlanParser.Parse(FullPlan);
        await Assert.That(result.Plan!.Start).IsEqualTo("2026-Q1");
        await Assert.That(result.Plan.End).IsEqualTo("2026-Q4");
        await Assert.That(result.Plan.Timeslice).IsEqualTo(Timeslice.Quarter);
    }

    [Test]
    public async Task Description_parsed_from_prose_after_meta()
    {
        var result = PlanParser.Parse(FullPlan);
        await Assert.That(result.Plan!.Description).IsEqualTo("Overall description here.");
    }

    [Test]
    public async Task Lanes_parsed_with_id_label_color_description()
    {
        var result = PlanParser.Parse(FullPlan);
        var lanes = result.Plan!.Lanes;
        await Assert.That(lanes.Count).IsEqualTo(2);
        await Assert.That(lanes[0].Id).IsEqualTo("alpha");
        await Assert.That(lanes[0].Label).IsEqualTo("Alpha");
        await Assert.That(lanes[0].Color).IsEqualTo("#e8eefc");
        await Assert.That(lanes[0].Description).IsEqualTo("Alpha lane description.");
        await Assert.That(lanes[1].Color).IsEqualTo("#ece8fc");
        await Assert.That(lanes[1].Description).IsNull();
    }

    [Test]
    public async Task Stages_parsed_with_all_fields()
    {
        var result = PlanParser.Parse(FullPlan);
        var stages = result.Plan!.Stages;
        await Assert.That(stages.Count).IsEqualTo(2);

        var s1 = stages[0];
        await Assert.That(s1.Id).IsEqualTo("s1");
        await Assert.That(s1.Title).IsEqualTo("Stage One");
        await Assert.That(s1.LaneId).IsEqualTo("alpha");
        await Assert.That(s1.Start).IsEqualTo("2026-Q1");
        await Assert.That(s1.End).IsEqualTo("2026-Q2");
        await Assert.That(s1.Enables).Contains("s2");
        await Assert.That(s1.DependsOn).IsEmpty();
        await Assert.That(s1.Description).IsEqualTo("First stage description.");
    }

    [Test]
    public async Task Stage_depends_on_and_enables_parsed_as_lists()
    {
        var result = PlanParser.Parse(FullPlan);
        var s2 = result.Plan!.Stages[1];
        await Assert.That(s2.DependsOn).Contains("s1");
        await Assert.That(s2.Enables).IsEmpty();
    }

    [Test]
    public async Task Status_is_success_when_no_errors()
    {
        var result = PlanParser.Parse(FullPlan);
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Success);
        await Assert.That(result.Plan!.Errors).IsEmpty();
    }

    [Test]
    public async Task Stage_id_slugified_from_title_when_omitted()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            ### My Great Stage
            - lane: Alpha
            - start: 2026-Q1
            - end: 2026-Q1
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Stages[0].Id).IsEqualTo("my-great-stage");
    }

    [Test]
    public async Task Comma_separated_depends_on_parsed_as_multiple_entries()
    {
        const string md = """
            # Plan
            - start: 2026-Q1
            - end: 2026-Q1
            - timeslice: quarter
            ## Lanes
            ### Alpha
            ## Stages
            ### Stage
            - id: s1
            - lane: Alpha
            - start: 2026-Q1
            - end: 2026-Q1
            - depends_on: a1, a2, a3
            """;
        var result = PlanParser.Parse(md);
        await Assert.That(result.Plan!.Stages[0].DependsOn).IsEquivalentTo(["a1", "a2", "a3"]);
    }
}
