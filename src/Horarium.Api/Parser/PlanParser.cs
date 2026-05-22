using Horarium.Api.Models;
using Markdig;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;

namespace Horarium.Api.Parser;

public static class PlanParser
{
    private static readonly MarkdownPipeline Pipeline =
        new MarkdownPipelineBuilder().UseAdvancedExtensions().Build();

    public static ParseResult Parse(string markdown)
    {
        var errors = new List<ParseError>();
        var doc = Markdown.Parse(markdown, Pipeline);
        var blocks = doc.ToList();

        var h1 = blocks.OfType<HeadingBlock>().FirstOrDefault(h => h.Level == 1);
        if (h1 == null)
            return ParseResult.Unrecognisable(markdown);

        var title = GetInlineText(h1);
        if (string.IsNullOrWhiteSpace(title))
            return ParseResult.Unrecognisable(markdown);

        // bullets immediately after H1 → plan metadata
        var h1Index = blocks.IndexOf(h1);
        string? start = null, end = null;
        Timeslice timeslice = Timeslice.Quarter;
        int metaBulletsEnd = h1Index + 1;

        if (h1Index + 1 < blocks.Count && blocks[h1Index + 1] is ListBlock metaList)
        {
            metaBulletsEnd = h1Index + 2;
            foreach (var item in metaList.OfType<ListItemBlock>())
            {
                var text = GetListItemText(item).Trim();
                if (TryParseKv(text, "start", out var v)) start = v;
                else if (TryParseKv(text, "end", out v)) end = v;
                else if (TryParseKv(text, "timeslice", out v))
                {
                    if (!TryParseTimeslice(v!, out timeslice))
                        errors.Add(new ParseError("timeslice", $"Unknown timeslice value '{v}'. Expected: quarter, month, week, day."));
                }
            }
        }

        if (start == null) errors.Add(new ParseError("start", "Missing 'start' in plan metadata bullets."));
        if (end == null) errors.Add(new ParseError("end", "Missing 'end' in plan metadata bullets."));

        if (start != null && !IsValidSlice(start, timeslice))
            errors.Add(new ParseError("start", $"Invalid {timeslice} value '{start}'."));
        if (end != null && !IsValidSlice(end, timeslice))
            errors.Add(new ParseError("end", $"Invalid {timeslice} value '{end}'."));

        // prose between meta bullets and first H2 → plan description
        var firstH2Index = blocks.FindIndex(b => b is HeadingBlock h && h.Level == 2);
        var descriptionBlocks = blocks
            .Skip(metaBulletsEnd)
            .Take((firstH2Index < 0 ? blocks.Count : firstH2Index) - metaBulletsEnd);
        var description = string.Join("\n\n", descriptionBlocks.Select(GetBlockText)).Trim();

        var lanes = new List<Lane>();
        var stages = new List<Stage>();

        // find ## Lanes and ## Stages sections
        var h2s = blocks
            .Select((b, i) => (block: b, index: i))
            .Where(x => x.block is HeadingBlock h && h.Level == 2)
            .ToList();

        foreach (var (h2Block, h2Idx) in h2s)
        {
            var sectionTitle = GetInlineText((HeadingBlock)h2Block).Trim();
            var nextH2Idx = h2s.SkipWhile(x => x.index <= h2Idx).Select(x => x.index).FirstOrDefault(blocks.Count);
            var sectionBlocks = blocks.Skip(h2Idx + 1).Take(nextH2Idx - h2Idx - 1).ToList();

            if (string.Equals(sectionTitle, "Lanes", StringComparison.OrdinalIgnoreCase))
                ParseLanes(sectionBlocks, lanes, errors);
            else if (string.Equals(sectionTitle, "Stages", StringComparison.OrdinalIgnoreCase))
                ParseStages(sectionBlocks, stages, lanes, errors);
        }

        var plan = new Plan(
            title,
            string.IsNullOrWhiteSpace(description) ? null : description,
            start ?? "",
            end ?? "",
            timeslice,
            lanes,
            stages,
            errors
        );

        return errors.Count == 0
            ? ParseResult.Success(plan)
            : ParseResult.Partial(plan);
    }

    private static void ParseLanes(List<Block> blocks, List<Lane> lanes, List<ParseError> errors)
    {
        var h3s = blocks
            .Select((b, i) => (block: b, index: i))
            .Where(x => x.block is HeadingBlock h && h.Level == 3)
            .ToList();

        foreach (var (h3Block, h3Idx) in h3s)
        {
            var label = GetInlineText((HeadingBlock)h3Block).Trim();
            var nextH3Idx = h3s.SkipWhile(x => x.index <= h3Idx).Select(x => x.index).FirstOrDefault(blocks.Count);
            var laneBlocks = blocks.Skip(h3Idx + 1).Take(nextH3Idx - h3Idx - 1).ToList();

            string? color = null;
            int proseStart = 0;
            if (laneBlocks.Count > 0 && laneBlocks[0] is ListBlock bulletList)
            {
                proseStart = 1;
                foreach (var item in bulletList.OfType<ListItemBlock>())
                {
                    var text = GetListItemText(item).Trim();
                    if (TryParseKv(text, "color", out var v)) color = v;
                }
            }

            var prose = string.Join("\n\n", laneBlocks.Skip(proseStart).Select(GetBlockText)).Trim();
            var id = Slugify(label);
            lanes.Add(new Lane(id, label, color, string.IsNullOrWhiteSpace(prose) ? null : prose));
        }
    }

    private static void ParseStages(List<Block> blocks, List<Stage> stages, List<Lane> lanes, List<ParseError> errors)
    {
        var h3s = blocks
            .Select((b, i) => (block: b, index: i))
            .Where(x => x.block is HeadingBlock h && h.Level == 3)
            .ToList();

        foreach (var (h3Block, h3Idx) in h3s)
        {
            var stageTitle = GetInlineText((HeadingBlock)h3Block).Trim();
            var nextH3Idx = h3s.SkipWhile(x => x.index <= h3Idx).Select(x => x.index).FirstOrDefault(blocks.Count);
            var stageBlocks = blocks.Skip(h3Idx + 1).Take(nextH3Idx - h3Idx - 1).ToList();

            string? id = null, lane = null, stageStart = null, stageEnd = null;
            var dependsOn = new List<string>();
            var enables = new List<string>();
            int proseStart = 0;

            if (stageBlocks.Count > 0 && stageBlocks[0] is ListBlock bulletList)
            {
                proseStart = 1;
                foreach (var item in bulletList.OfType<ListItemBlock>())
                {
                    var text = GetListItemText(item).Trim();
                    if (TryParseKv(text, "id", out var v)) id = v;
                    else if (TryParseKv(text, "lane", out v)) lane = v;
                    else if (TryParseKv(text, "start", out v)) stageStart = v;
                    else if (TryParseKv(text, "end", out v)) stageEnd = v;
                    else if (TryParseKv(text, "depends_on", out v)) dependsOn.AddRange(SplitList(v!));
                    else if (TryParseKv(text, "enables", out v)) enables.AddRange(SplitList(v!));
                }
            }

            id ??= Slugify(stageTitle);

            if (lane == null)
                errors.Add(new ParseError($"stage:{id}", $"Stage '{stageTitle}' is missing 'lane'."));
            else if (!lanes.Any(l => string.Equals(l.Label, lane, StringComparison.OrdinalIgnoreCase) || l.Id == lane))
                errors.Add(new ParseError($"stage:{id}", $"Stage '{stageTitle}' references unknown lane '{lane}'."));

            if (stageStart == null)
                errors.Add(new ParseError($"stage:{id}", $"Stage '{stageTitle}' is missing 'start'."));
            if (stageEnd == null)
                errors.Add(new ParseError($"stage:{id}", $"Stage '{stageTitle}' is missing 'end'."));

            var prose = string.Join("\n\n", stageBlocks.Skip(proseStart).Select(GetBlockText)).Trim();
            var laneId = lanes.FirstOrDefault(l =>
                string.Equals(l.Label, lane, StringComparison.OrdinalIgnoreCase) || l.Id == lane)?.Id ?? Slugify(lane ?? "");

            stages.Add(new Stage(
                id,
                stageTitle,
                laneId,
                stageStart ?? "",
                stageEnd ?? "",
                dependsOn,
                enables,
                string.IsNullOrWhiteSpace(prose) ? null : prose
            ));
        }
    }

    private static string GetInlineText(LeafBlock block)
    {
        if (block.Inline == null) return "";
        return string.Concat(block.Inline.Descendants<LiteralInline>().Select(l => l.Content.ToString()));
    }

    private static string GetListItemText(ListItemBlock item)
    {
        var para = item.OfType<ParagraphBlock>().FirstOrDefault();
        if (para?.Inline == null) return "";
        return string.Concat(para.Inline.Descendants<LiteralInline>().Select(l => l.Content.ToString()));
    }

    private static string GetBlockText(Block block) => block switch
    {
        ParagraphBlock p when p.Inline != null =>
            string.Concat(p.Inline.Descendants<LiteralInline>().Select(l => l.Content.ToString())),
        _ => ""
    };

    private static bool TryParseKv(string text, string key, out string? value)
    {
        value = null;
        var prefix = key + ":";
        if (!text.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        value = text[prefix.Length..].Trim().Trim('"').Trim('\'');
        return true;
    }

    private static bool TryParseTimeslice(string value, out Timeslice result)
    {
        result = Timeslice.Quarter;
        return Enum.TryParse(value, ignoreCase: true, out result);
    }

    private static bool IsValidSlice(string value, Timeslice timeslice) => timeslice switch
    {
        Timeslice.Quarter => System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d{4}-Q[1-4]$"),
        Timeslice.Month => System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d{4}-(0[1-9]|1[0-2])$"),
        Timeslice.Week => System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$"),
        Timeslice.Day => System.DateTime.TryParse(value, out _),
        _ => false
    };

    private static IEnumerable<string> SplitList(string value) =>
        value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).Where(s => s.Length > 0);

    public static string Slugify(string text) =>
        System.Text.RegularExpressions.Regex.Replace(text.ToLowerInvariant().Trim(), @"[^a-z0-9]+", "-").Trim('-');
}
