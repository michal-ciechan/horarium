# Horarium — Claude Code Configuration

## Launch

```powershell
dotnet run --project src/Horarium.AppHost -- C:\src\horarium\samples
```

> Launch from **PowerShell**, not the Bash tool — Git Bash eats the backslashes in
> `C:\src\horarium\samples`, so the AppHost receives `C:srchorariumsamples` and the API silently
> fails to bind 17002. See Gotchas.

| Port  | Service          | Public HTTPS (desktop)                  |
|-------|------------------|-----------------------------------------|
| 17000 | Aspire dashboard | —                                       |
| 17001 | Vite dev client  | **https://horarium.desktop.codeperf.net** |
| 17002 | ASP.NET Core API | (proxied under the UI at `/api`)        |
| 17004 | Storybook        | —                                       |

Dashboard requires a one-time login token printed to the console on first run.

## Remote access — https://horarium.desktop.codeperf.net

The Vite UI (17001) is fronted over HTTPS by the per-machine Caddy proxy (`proxy` skill) as
`horarium.desktop.codeperf.net`. The `/api` calls are proxied by Vite to the API on 17002, so the
single public host serves both UI and data. Wiring (already in place):

- **Caddy vhost**: registered in `C:\src\links\src\data\machines\desktop-ktlkpif.json` (the
  `Horarium` link, `"proxy": 17001`). Regenerate/reload after edits with
  `C:\src\ClaudeBot\desktop\apply.ps1`.
- **Vite**: `src/horarium-ui/vite.config.ts` sets `host: true` (bind `0.0.0.0` so Caddy's
  `host.docker.internal` can reach it) and `allowedHosts: ['.desktop.codeperf.net']` (else Vite
  returns 403 to the public Host header).

## Gotchas

- **Aspire 13.x on .NET 10**: Use `Aspire.AppHost.Sdk` 13.x as an MSBuild NuGet SDK — not the old workload. `AddNpmApp` was removed; use `AddViteApp("client", "../client")` for Vite frontends.
- **`ASPIRE_ALLOW_UNSECURED_TRANSPORT=true`**: Set in AppHost `launchSettings.json` env block — required for HTTP-only dashboard access.
- **Vite port**: Default is 5173 unless overridden by `server.port` in `vite.config.ts`. Check the config before assuming any port.
- **Playwright specs in Vitest**: `.spec.ts` files in `src/client` are picked up by Vitest unless explicitly excluded. Add `exclude: ['**/*.spec.ts']` (or similar) to `vite.config.ts` test config — otherwise you get `$RefreshReg$ is not defined` errors.
- **Folder argument**: The API and AppHost require an absolute path to the samples folder as the first CLI argument: `-- C:\src\horarium\samples`. Relative paths fail when the working directory doesn't match.
- **Launch from PowerShell, not Bash**: The Bash tool is Git Bash — it strips the backslashes from `C:\src\horarium\samples`, so the AppHost gets `C:srchorariumsamples`, the API can't find the samples folder, and 17002 never comes up (UI loads but `/api/plans` fails). Run the launch command via PowerShell, or escape/quote the path for bash.
- **Public HTTPS host (Vite `allowedHosts`)**: Exposing the UI as `horarium.desktop.codeperf.net` needs `host: true` + `allowedHosts: ['.desktop.codeperf.net']` in `vite.config.ts`; otherwise Caddy reaches Vite but gets a 403 on the public Host header. See the Remote access section.
- **Blank page / `$RefreshSig$ is not defined`**: `@vitejs/plugin-react@6.0.2` on `vite@8.0.x` rewrites components to call `$RefreshSig$`/`$RefreshReg$` but its `transformIndexHtml` hook fails to inject the React Fast Refresh preamble that defines them — so the first component import throws and React never mounts (HTTP 200 but blank). `vite.config.ts` includes a `react-refresh-preamble-fallback` plugin (`apply: 'serve'`) that injects the preamble itself in dev. Don't remove it unless a `@vitejs/plugin-react` bump fixes the upstream bug. The build (`vite build`) is unaffected — it doesn't use Fast Refresh.
