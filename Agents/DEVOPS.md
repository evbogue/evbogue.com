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

## Report format

When finished, report:

- System changed
- Commands run
- Current service status
- Deployment verification
- Any manual follow-up
