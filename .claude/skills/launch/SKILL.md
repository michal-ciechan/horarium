---
description: Launch the Horarium app via Aspire AppHost (orchestrates API + Vite + Storybook)
---

# Launch Horarium

Use the AppHost to start everything in one command. It launches the Aspire dashboard + API + Vite dev server + Storybook.

## Start everything

```powershell
dotnet run --project src/Horarium.AppHost -- C:\src\horarium\samples
```

## Port assignments

| Port  | Service                           |
|-------|-----------------------------------|
| 17000 | Aspire dashboard (login required) |
| 17001 | Frontend — Vite dev server        |
| 17002 | Backend — ASP.NET Core API        |
| 17004 | Storybook                         |

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
