---
description: Launch the Horarium app via Aspire AppHost (orchestrates API + Vite + Storybook)
---

# Launch Horarium

Use the AppHost to start everything in one command. It launches the Aspire dashboard + API + Vite dev server + Storybook.

## Start everything

```powershell
dotnet run --project src/Horarium.AppHost -- C:\src\horarium\samples
```

> ⚠️ Run this from **PowerShell**, not the Bash tool. Git Bash strips the backslashes from the
> samples path, so the AppHost receives `C:srchorariumsamples`, the API can't find its folder, and
> **17002 never binds** (the UI loads but `/api/plans` fails). If you must use bash, quote it:
> `-- 'C:\src\horarium\samples'`.

## Port assignments

| Port  | Service                           | Public HTTPS (desktop)                    |
|-------|-----------------------------------|-------------------------------------------|
| 17000 | Aspire dashboard (login required) | —                                         |
| 17001 | Frontend — Vite dev server        | **https://horarium.desktop.codeperf.net** |
| 17002 | Backend — ASP.NET Core API        | (served under the UI at `/api`)           |
| 17004 | Storybook                         | —                                         |

## Remote access — https://horarium.desktop.codeperf.net

The Vite UI is fronted over HTTPS by the per-machine Caddy proxy (see the `proxy`/`links` skills),
so it's reachable from any tailnet device (e.g. phone). `/api` is proxied by Vite to the API on
17002, so the one host serves UI + data. Already wired:

- **Caddy vhost** — the `Horarium` link in `C:\src\links\src\data\machines\desktop-ktlkpif.json`
  (`"host": "horarium", "proxy": 17001`). After editing, run `C:\src\ClaudeBot\desktop\apply.ps1`
  to regenerate the vhost and reload Caddy. First hit issues the LE cert (DNS-01, ~1–3 min).
- **Vite** — `src/horarium-ui/vite.config.ts` has `host: true` (bind `0.0.0.0` so Caddy's
  `host.docker.internal` reaches it) and `allowedHosts: ['.desktop.codeperf.net']` (else Vite
  returns **403** to the public Host header).
- **Verify from the box** (MagicDNS can't resolve `*.codeperf.net`, so pin to Caddy):
  `curl.exe --resolve horarium.desktop.codeperf.net:443:127.0.0.1 https://horarium.desktop.codeperf.net/api/plans`

## Aspire dashboard login

The AppHost prints a one-time login URL at startup:
```
Login to the dashboard at http://localhost:17000/login?t=<token>
```

## Stand-alone API only (no AppHost)

```powershell
dotnet run --project src/Horarium.Api -- C:\src\horarium\samples
```
Binds to port 17002 (as per launchSettings.json).

## Rebuild UI (only after frontend changes, for production build)

```powershell
cd src/horarium-ui
npm install
npm run build
```

## Notes

- Path arg must be absolute — app resolves relative to its own working dir
- AppHost uses Aspire 13.3.5 + `Aspire.AppHost.Sdk` (NuGet-only, no workload needed)
- `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` is set in launchSettings.json to allow HTTP
