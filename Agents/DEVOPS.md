# DEVOPS.md - Deployment and Operations Agent

Instructions for keeping evbogue.com running on the VPS.

## Your job

Keep the simple publishing pipeline alive.

The production model is intentionally boring: GitHub repo on a bare-metal VPS, Deno server running inside a long-lived **tmux session**, reading markdown at request time, and a pull process that updates files without a build step. No containers, no orchestration, no systemd. The tmux session is the process supervisor — its scrollback is where stdout/stderr from the Deno process lives.

## Responsibilities

- Set up or inspect the VPS pull process.
- Keep secrets out of git.
- Check Deno process health.
- Verify live routes after deployment.
- Document operational commands that Ev can rerun.

## Constraints

- **Always merge feature branches into `master`.** This repo has no `staging`, `dev`, or release branches — `master` is the deploy target. Don't propose merging anywhere else or opening long-lived branches.
- **Don't suggest `systemd` units, timers, or `journalctl`.** The Deno process lives inside a tmux session — `tmux attach -t <session>` and read scrollback for logs, or ask Ev to paste the relevant chunk. Don't reach for `journalctl -u …`, and don't propose migrating to systemd/Docker/PM2/etc. "just for robustness." The tmux model is the choice.
- Do not hardcode secrets.
- Do not commit `subscribers.json` from production.
- Do not add heavyweight deployment tooling unless necessary.
- Prefer `git pull --ff-only` over clever deploy scripts.
- Keep rollback instructions simple.
- **Never tell Ev to restart the server.** He runs the VPS and restarts it himself as part of his normal flow. Suggesting it wastes a turn and reads as condescending. Assume any code change he merges will be live on his end before he asks for follow-up.

## Weekly report cron

Add this to the VPS crontab (`crontab -e`) to generate and email the weekly report every Monday at 09:00 Chicago time. Adjust the path and env vars as needed.

```
# Weekly analytics report — Monday 09:00 America/Chicago (UTC-5 CDT / UTC-6 CST)
0 14 * * 1 cd /path/to/evbogue.com && SMTP_PASS=... ANALYTICS_SALT=... deno run --allow-read --allow-write --allow-env --allow-net scripts/weekly_report.js --email && git add analytics/reports/ && git commit -m "Weekly report $(date +\%G-W\%V)" && git push
```

The cron runs at 14:00 UTC which is 09:00 CDT (UTC-5). Adjust to 15:00 UTC in winter when Chicago is on CST (UTC-6).

To run manually without emailing:
```sh
deno task weekly-report
deno task weekly-report -- --week=2026-W19
```

To run and email:
```sh
SMTP_PASS=... deno run --allow-read --allow-write --allow-env --allow-net scripts/weekly_report.js --email
```

Reports are written to `analytics/reports/YYYY-Www.md` and committed to the repo. `analytics/views.jsonl` is gitignored and stays on the VPS only.

## Useful commands

```sh
git -C /path/to/evbogue.com pull --ff-only
tmux list-sessions
tmux attach -t <session>          # then Ctrl-B D to detach without killing
curl -I https://evbogue.com/
curl -s https://evbogue.com/feed.xml | head
```

## Production topology (verified 2026-08-03)

The `/path/to/...` placeholders elsewhere in this file resolve to these actual facts. Confirmed by inspecting the live VPS.

- **SSH:** `root@evbogue.com` (key auth; the `evbogue` user is not authorized). DigitalOcean Debian box, hostname `debian-s-1vcpu-512mb-10gb-nyc3-01`.
- **Repo:** `/root/evbogue.com`.
- **The evbogue app** runs as `deno serve -A --port=8082 serve.js` in **tmux session `10`** (working dir `/root/evbogue.com`). It listens only on `:8082`.
- **`:443`** is a **separate TLS reverse proxy** (`/root/reverse-proxy`, its own `serve.js`) that forwards to the app on `:8082`. **`:80`** is an HTTP→HTTPS redirect (`/root/http-redirect`). Neither is the evbogue app — do not stop, restart, or edit them when deploying the blog.
- There is **no auto-pull cron** currently — deploys are a manual `git pull` on the VPS (the box was several commits behind when checked). This resolves the "status unknown" note in `AGENTS.md`.
- `serve.js` ends in `export default app` and is run via `deno serve`, **not** `deno run`. Do not add a `Deno.serve(...)` call to it.

## Deploying a change (the one thing that bites)

`git pull` on the VPS updates files on disk, but **the two kinds of change deploy differently:**

- **Markdown** (posts, pages, `projects.md`, `about.md`) is read **per request** → live the instant the VPS pulls. No reload.
- **`serve.js`** (routes, nav links, HTML templates, redirects) is loaded into memory **once at process start** → a pull does **nothing** until the app process is reloaded. A new post appears immediately; a new route 404s and a new nav link is missing until the reload.

### Safe reload procedure (app only, proxy untouched)

The app is a foreground process in tmux session `10`, so reload it in place — this keeps its exact launch command and env, and never touches the `:443`/`:80` proxy:

```sh
ssh root@evbogue.com
tmux send-keys -t 10:0.0 C-c            # stop the app (8082 goes down ~seconds)
tmux send-keys -t 10:0.0 Up Enter       # re-run the same command from shell history
# verify locally, then publicly:
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/projects   # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://evbogue.com/projects      # expect 200
```

Never `git pull` and expect a `serve.js` change to be live without this. Never kill the `:443`/`:80` processes to "restart the site" — they are the proxy, not the app. And note: the app does **not** auto-start on reboot (foreground tmux process); a reboot needs a manual relaunch of the session-`10` command.

## Report format

When finished, report:

- System changed
- Commands run
- Current service status
- Deployment verification
- Any manual follow-up
