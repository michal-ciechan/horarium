# Horarium — Claude Code Configuration

## Launch

```powershell
dotnet run --project src/Horarium.AppHost -- C:\src\horarium\samples
```

| Port  | Service          |
|-------|------------------|
| 17000 | Aspire dashboard |
| 17001 | Vite dev client  |
| 17002 | ASP.NET Core API |
| 17004 | Storybook        |

Dashboard requires a one-time login token printed to the console on first run.

## Gotchas

- **Aspire 13.x on .NET 10**: Use `Aspire.AppHost.Sdk` 13.x as an MSBuild NuGet SDK — not the old workload. `AddNpmApp` was removed; use `AddViteApp("client", "../client")` for Vite frontends.
- **`ASPIRE_ALLOW_UNSECURED_TRANSPORT=true`**: Set in AppHost `launchSettings.json` env block — required for HTTP-only dashboard access.
- **Vite port**: Default is 5173 unless overridden by `server.port` in `vite.config.ts`. Check the config before assuming any port.
- **Playwright specs in Vitest**: `.spec.ts` files in `src/client` are picked up by Vitest unless explicitly excluded. Add `exclude: ['**/*.spec.ts']` (or similar) to `vite.config.ts` test config — otherwise you get `$RefreshReg$ is not defined` errors.
- **Folder argument**: The API and AppHost require an absolute path to the samples folder as the first CLI argument: `-- C:\src\horarium\samples`. Relative paths fail when the working directory doesn't match.
