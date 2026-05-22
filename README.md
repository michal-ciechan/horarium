# Horarium

Scheduling, planning, and Gantt chart software.

> *Horarium* — the daily schedule of a monastery, governing when each activity begins and ends.

## Running locally

```powershell
.\start.ps1
```

The script:
1. Kills any existing process on port 5000
2. Rebuilds the React UI (`npm run build`)
3. Starts the .NET API bound to `0.0.0.0:5000` (all interfaces)
4. Waits up to 30 s for the health check (`/api/plans`) to return a non-empty array
5. Prints the local and public URLs, or exits with an error if startup failed

By default it watches `C:\src\horarium\samples`. Pass a different folder:

```powershell
.\start.ps1 -WatchFolder "C:\Users\you\plans"
```

## Accessing it

| URL | Where |
|-----|-------|
| `http://localhost:17000` | Local browser |
| `https://horarium.laptop.codeperf.net` | Any device on Tailscale |

The public URL is reverse-proxied by Caddy (running in Docker at `C:\src\ClaudeBot\laptop`).
Caddy must be running for the public URL to work:

```powershell
cd C:\src\ClaudeBot\laptop
docker compose up -d
```

## After making UI changes

The UI is pre-built into `src/Horarium.Api/wwwroot`. Always run `.\start.ps1` (or `npm run build` manually in `src/horarium-ui`) after editing any `.tsx` / `.css` files — the running API will serve the old bundle until rebuilt.

## License

MIT
