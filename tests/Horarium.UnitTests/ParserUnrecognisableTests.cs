using Horarium.Api.Parser;
using TUnit.Assertions.Extensions;

namespace Horarium.UnitTests;

public class ParserUnrecognisableTests
{
    [Test]
    public async Task Empty_file_is_unrecognisable()
    {
        var result = PlanParser.Parse("");
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Unrecognisable);
    }

    [Test]
    public async Task File_with_no_h1_is_unrecognisable()
    {
        var result = PlanParser.Parse("## Just a subheading\n\nSome content.");
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Unrecognisable);
    }

    [Test]
    public async Task File_with_only_whitespace_is_unrecognisable()
    {
        var result = PlanParser.Parse("   \n\n\t  ");
        await Assert.That(result.Status).IsEqualTo(ParseStatus.Unrecognisable);
    }

    [Test]
    public async Task Unrecognisable_result_carries_raw_content()
    {
        const string raw = "not a plan at all";
        var result = PlanParser.Parse(raw);
        await Assert.That(result.RawContent).IsEqualTo(raw);
    }

    [Test]
    public async Task Unrecognisable_result_has_null_plan()
    {
        var result = PlanParser.Parse("just prose");
        await Assert.That(result.Plan).IsNull();
    }
}
