namespace Horarium.Api.Models;

public record FileTreeNode(
    string Name,
    string Path,
    NodeKind Kind,
    IReadOnlyList<FileTreeNode> Children
);

public enum NodeKind { Plan, PartialPlan, Unrecognised, Directory }
