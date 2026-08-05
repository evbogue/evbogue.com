# ANProto Stack workorder

Fill in the two remaining screenshots on the **ANProto Stack** group on `/projects` — the **Wiredove** and **apds** cards — both currently showing the browser-frame placeholder.

Opened 2026-08-04 (as a wiredove-restore order). Rewritten 2026-08-05: wiredove.net is back up, and the real blocker is now **apds**.

## Status of the three cards

| Card | Site | Screenshot | State |
|---|---|---|---|
| ANProto | anproto.com | ✅ `anproto.png` shipped | Done |
| Wiredove | wiredove.net | ❌ placeholder | Up (HTTP 200) but the **feed is empty** |
| apds | apds.anproto.com | ❌ placeholder | **Down / misconfigured** |

## Root cause: apds is down

Both missing screenshots trace to the same thing — **apds is not serving correctly**, as of 2026-08-05:

- **Wrong TLS certificate.** `https://apds.anproto.com/` connects (DNS → `45.55.134.151:443`) but the cert has no SAN for `apds.anproto.com`, so strict clients (curl, and the screenshot capture) refuse it: `SSL: no alternative certificate subject name matches`.
- **Every route 404s** with a bare plain-text `Not Found` — including the routes that `apds/serve.js` defines (`/gossip/poll`, `/events`, `/share`, and the `/<key>` JSON handler). apds's own code would return JSON or HTML for these, so the process currently answering on that host is **not the real apds** (crashed process, stale deploy, or a catch-all proxy in front). Confirm what's bound to `:443` for `apds.anproto.com` and get the actual apds `serve.js` running again with a cert that covers the host.

Once apds is healthy, **Wiredove unblocks too**: wiredove.net is a local-first client that syncs its feed via apds, so with apds down a fresh visit shows only the top bar on an empty canvas (even after "Generate Keypair"). With apds back, it should sync a real feed and screenshot well.

## Tasks

### 1. Restore apds (unblocks both)

- [ ] SSH into the apds host (`45.55.134.151`). Host/repo path not yet documented here — record it once known. (Likely the same boring tmux + `deno serve` model as the evbogue box; see `Agents/DEVOPS.md`.)
- [ ] Get the real `apds/serve.js` process running again and fix the TLS cert so it covers `apds.anproto.com` (the reverse proxy / cert config, not just the app).
- [ ] Verify:
  ```sh
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://apds.anproto.com/all   # expect 200 application/json, no -k needed
  ```

### 2. Screenshot apds — the raw JSON view

Ev's idea, and it's the right one: apds is a headless data server, so its most honest "screenshot" is the data it holds.

- [ ] `GET https://apds.anproto.com/all` returns the full store as JSON (the `/<key>` handler in `apds/serve.js`; `all` → `apds.query()`). Capture that JSON view at 1280×800 @2x → `sites/evbogue.com/assets/projects/apds.png`.
- [ ] If the cert still can't be fixed in time, the capture script can pass Playwright `ignoreHTTPSErrors: true` to shoot it cleanly anyway — but prefer fixing the cert so real visitors aren't warned.

### 3. Screenshot Wiredove — a populated feed

- [ ] With apds healthy, load `https://wiredove.net/`, let it key up and sync (it holds a websocket, so wait on a fixed delay, not networkidle), confirm the feed actually has content, then capture → `sites/evbogue.com/assets/projects/wiredove.png`.
- [ ] Eyeball it — must be a real feed, not the empty top-bar-on-black state and not an error page.

### 4. Commit + deploy

- [ ] Commit `apds.png` and `wiredove.png` to `master` (author `Ev Bogue <ev@evbogue.com>`). No `serve.js` change — the cards pick up any PNG matching the slug automatically.
- [ ] Deploy is **pull-only** on the VPS (assets are read per request, no app reload): `ssh root@evbogue.com 'cd /root/evbogue.com && git pull --ff-only'`.

## Capture recipe (already set up)

Full "Chrome for Testing" Chromium is installed at `~/Library/Caches/ms-playwright/chromium-1234/`. The scratchpad capture scripts from this session (`shoot_anproto.js`, `shoot_ssb.js`) show the pattern: launch with `executablePath` to that binary, `newContext({ viewport: {width:1280,height:800}, deviceScaleFactor: 2 })`, `goto(url, {waitUntil:"domcontentloaded"})`, `waitForTimeout(5000–7000)` for SPAs/feeds, then `screenshot({path})`. Or just add apds/wiredove back into `scripts/screenshot_projects.js` and run `deno task screenshots --only=wiredove,apds` once the sites are healthy.

## Notes

- **Network:** the machine this was run from blocks outbound SSH `:22` to GitHub (only). Workaround: SSH over `:443` — `git -c url."ssh://git@ssh.github.com:443/".insteadOf="git@github.com:" push`. SSH to `root@evbogue.com:22` works fine.
- The other cards' screenshots (decent, ssbski, ssbpro under the SSB group; anproto) are already shipped and live.
