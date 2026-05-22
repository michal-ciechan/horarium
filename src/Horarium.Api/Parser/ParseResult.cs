using Horarium.Api.Models;

namespace Horarium.Api.Parser;

public record ParseResult(
    ParseStatus Status,
    Plan? Plan,
    string? RawContent
)
{
    public static ParseResult Success(Plan plan) => new(ParseStatus.Success, plan, null);
    public static ParseResult Partial(Plan plan) => new(ParseStatus.Partial, plan, null);
    public static ParseResult Unrecognisable(string raw) => new(ParseStatus.Unrecognisable, null, raw);
}

public enum ParseStatus { Success, Partial, Unrecognisable }
