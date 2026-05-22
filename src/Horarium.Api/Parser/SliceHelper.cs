using Horarium.Api.Models;

namespace Horarium.Api.Parser;

public static class SliceHelper
{
    public static IReadOnlyList<string> GetSlices(string start, string end, Timeslice timeslice) =>
        timeslice switch
        {
            Timeslice.Quarter => GetQuarterSlices(start, end),
            Timeslice.Month => GetMonthSlices(start, end),
            _ => [start, end]
        };

    private static IReadOnlyList<string> GetQuarterSlices(string start, string end)
    {
        if (!TryParseQuarter(start, out var sy, out var sq) || !TryParseQuarter(end, out var ey, out var eq))
            return [];

        var result = new List<string>();
        int y = sy, q = sq;
        while (y < ey || (y == ey && q <= eq))
        {
            result.Add($"{y}-Q{q}");
            if (++q > 4) { q = 1; y++; }
        }
        return result;
    }

    private static IReadOnlyList<string> GetMonthSlices(string start, string end)
    {
        if (!TryParseMonth(start, out var sy, out var sm) || !TryParseMonth(end, out var ey, out var em))
            return [];

        var result = new List<string>();
        int y = sy, m = sm;
        while (y < ey || (y == ey && m <= em))
        {
            result.Add($"{y}-{m:D2}");
            if (++m > 12) { m = 1; y++; }
        }
        return result;
    }

    private static bool TryParseQuarter(string s, out int year, out int quarter)
    {
        year = quarter = 0;
        var m = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{4})-Q([1-4])$");
        if (!m.Success) return false;
        year = int.Parse(m.Groups[1].Value);
        quarter = int.Parse(m.Groups[2].Value);
        return true;
    }

    private static bool TryParseMonth(string s, out int year, out int month)
    {
        year = month = 0;
        var m = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{4})-(0[1-9]|1[0-2])$");
        if (!m.Success) return false;
        year = int.Parse(m.Groups[1].Value);
        month = int.Parse(m.Groups[2].Value);
        return true;
    }
}
