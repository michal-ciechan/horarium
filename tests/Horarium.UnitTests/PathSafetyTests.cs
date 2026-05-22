using TUnit.Assertions.Extensions;

namespace Horarium.UnitTests;

public class PathSafetyTests
{
    private static bool IsPathSafe(string watchFolder, string requestedPath)
    {
        var full = Path.GetFullPath(Path.Combine(watchFolder, requestedPath));
        return full.StartsWith(watchFolder, StringComparison.OrdinalIgnoreCase);
    }

    [Test]
    [Arguments("file.md")]
    [Arguments("sub/file.md")]
    [Arguments("sub/nested/plan.md")]
    public async Task Paths_within_watch_folder_are_safe(string path)
    {
        await Assert.That(IsPathSafe(@"C:\watch", path)).IsTrue();
    }

    [Test]
    [Arguments(@"../../etc/passwd")]
    [Arguments(@"../other-folder/secret.md")]
    [Arguments(@"..\windows\system32\config")]
    public async Task Paths_escaping_watch_folder_are_not_safe(string path)
    {
        await Assert.That(IsPathSafe(@"C:\watch\plans", path)).IsFalse();
    }
}
