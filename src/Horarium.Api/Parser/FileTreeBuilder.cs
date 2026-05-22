using Horarium.Api.Models;

namespace Horarium.Api.Parser;

public static class FileTreeBuilder
{
    public static IReadOnlyList<FileTreeNode> Build(string rootPath)
    {
        return BuildNodes(new DirectoryInfo(rootPath), rootPath);
    }

    private static IReadOnlyList<FileTreeNode> BuildNodes(DirectoryInfo dir, string rootPath)
    {
        var nodes = new List<FileTreeNode>();

        foreach (var file in dir.GetFiles("*.md").OrderBy(f => f.Name))
        {
            var relativePath = Path.GetRelativePath(rootPath, file.FullName);
            var result = PlanParser.Parse(File.ReadAllText(file.FullName));
            var kind = result.Status switch
            {
                ParseStatus.Success => NodeKind.Plan,
                ParseStatus.Partial => NodeKind.PartialPlan,
                _ => NodeKind.Unrecognised
            };
            nodes.Add(new FileTreeNode(Path.GetFileNameWithoutExtension(file.Name), relativePath, kind, []));
        }

        foreach (var subDir in dir.GetDirectories().OrderBy(d => d.Name))
        {
            var children = BuildNodes(subDir, rootPath);
            if (children.Count > 0)
            {
                var relativePath = Path.GetRelativePath(rootPath, subDir.FullName);
                nodes.Add(new FileTreeNode(subDir.Name, relativePath, NodeKind.Directory, children));
            }
        }

        return nodes;
    }
}
