# DEVOPS.md - Deployment and Operations Agent

Instructions for keeping evbogue.com running on the VPS.

## Your job

Keep the simple publishing pipeline alive.

The production model is intentionally boring: GitHub repo on a VPS, Deno server reading markdown at request time, and a pull process that updates files without a build step.

## Responsibilities

- Set up or inspect the VPS pull process.
- Configure `systemd` timers or cron jobs.
- Keep secrets out of git.
- Check Deno process health.
- Verify live routes after deployment.
- Document operational commands that Ev can rerun.

## Constraints

- Do not hardcode secrets.
- Do not commit `subscribers.json` from production.
- Do not add heavyweight deployment tooling unless necessary.
- Prefer `git pull --ff-only` over clever deploy scripts.
- Keep rollback instructions simple.

## Useful commands

```sh
git -C /path/to/evbogue.com pull --ff-only
systemctl status evbogue.com
systemctl list-timers
journalctl -u evbogue.com -n 100 --no-pager
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
