namespace Horarium.Api.Models;

public record Plan(
    string Title,
    string? Description,
    string Start,
    string End,
    Timeslice Timeslice,
    IReadOnlyList<Lane> Lanes,
    IReadOnlyList<Stage> Stages,
    IReadOnlyList<ParseError> Errors
);

public record Lane(
    string Id,
    string Label,
    string? Color,
    string? Description
);

public record Stage(
    string Id,
    string Title,
    string LaneId,
    string Start,
    string End,
    IReadOnlyList<string> DependsOn,
    IReadOnlyList<string> Enables,
    string? Description
);

public record ParseError(string Field, string Message);

public enum Timeslice { Quarter, Month, Week, Day }
