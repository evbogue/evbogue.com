# Wiredove workorder

Bring **wiredove.net** back online, then capture its screenshot for the ANProto Stack area on `/projects`.

Opened 2026-08-04. Deferred by Ev until he's off restrictive wifi (current network blocks outbound SSH on port 22 — see note below).

## Why this exists

The `/projects` page groups Wiredove, apds, and ANProto into one "The ANProto Stack" cluster. Each card wants a real screenshot; until one lands it shows a clean browser-frame placeholder, so **nothing here is urgent or user-visible-broken on evbogue.com** — this is only about filling in the Wiredove card (and standing in for the visual of the stack).

The blocker: as of 2026-08-04, **https://wiredove.net/ returns `Internal Server Error` (HTTP 500)**. Confirmed in both Playwright and the in-app browser — it's the site, not the tooling. A screenshot taken now just captures the error page, so the capture step is gated on the site being back up.

## Network constraint (why it's deferred)

The wifi Ev was on blocks outbound **SSH port 22**, so he couldn't reach the host to fix it. Workaround discovered this session for GitHub: **SSH over port 443** works when 22 is blocked —

```sh
ssh -T -p 443 git@ssh.github.com   # authenticates fine when :22 times out
```

If wiredove's host also blocks :22, try the same `-p 443` / `ssh.github.com` style routing, or just wait for an unrestricted network.

## Tasks

### 1. Diagnose and restore wiredove.net

- [ ] SSH into the wiredove.net host. **Host/repo path is not yet documented** — Wiredove is a *separate* deployment from the evbogue.com VPS (`root@evbogue.com`, `/root/evbogue.com`), so don't assume the same box. Record the real host + repo path here once known.
- [ ] It almost certainly follows the same boring model as evbogue.com: a Deno server running foreground inside a long-lived **tmux session** (no systemd, no auto-restart on reboot — see `Agents/DEVOPS.md`). Find the session: `tmux list-sessions`, attach, read scrollback for the stack trace behind the 500.
- [ ] Fix the cause (crashed/exited process, bad pull, missing env/secret, or a dependency like apds being down), then relaunch the app in its tmux session.
- [ ] Verify:
  ```sh
  curl -s -o /dev/null -w '%{http_code}\n' https://wiredove.net/   # expect 200, not 500
  ```
- [ ] Record the host, repo path, tmux session, and launch command in `Agents/DEVOPS.md` (or a wiredove note) so this isn't a mystery next time.

### 2. Capture the screenshot and commit it

Once wiredove.net returns 200:

- [ ] From this repo, capture just Wiredove into the portfolio assets:
  ```sh
  npx playwright install chromium-headless-shell   # one-time, if not already present
  deno task screenshots --only=wiredove
  ```
  Writes `sites/evbogue.com/assets/projects/wiredove.png` (1280×800 @2x). The `/projects` page picks it up automatically — it replaces the placeholder frame on the Wiredove card.
- [ ] Eyeball the PNG before committing — make sure it's the real app, not another error page or a login wall.
- [ ] Commit and push `wiredove.png` to `master` (author `Ev Bogue <ev@evbogue.com>`).

## Notes / open question

- Ev's phrasing was "a screenshot of wiredove **for anproto**." Default reading: the Wiredove shot fills the Wiredove card inside the ANProto Stack area. If instead he wants the Wiredove image to also stand in for the **ANProto** card (anproto.com is a spec page, not visual), copy it: `cp wiredove.png anproto.png` in the assets dir. Confirm with Ev before doing that.
- The full "Chrome for Testing" Chromium was installed locally this session at `~/Library/Caches/ms-playwright/chromium-1234/` — usable via Playwright `executablePath` if the headless-shell route is inconvenient.
