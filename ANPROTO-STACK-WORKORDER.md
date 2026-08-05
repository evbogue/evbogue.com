# ANProto Stack workorder

Finish the **ANProto Stack** group on `/projects`. Two of three cards now have real screenshots; **Wiredove** is the last one, plus an optional TLS cleanup.

Opened 2026-08-04 (wiredove-restore). Rewritten 2026-08-05 after establishing that apds is not down — it was a wrong-URL problem.

## Status of the three cards

| Card | Card URL | Screenshot | State |
|---|---|---|---|
| ANProto | anproto.com | ✅ `anproto.png` | Done |
| apds | pub.wiredove.net | ✅ `apds.png` (raw `/all` JSON) | Done |
| Wiredove | wiredove.net | ❌ placeholder | Up, but **feed is empty** |

## What we learned about apds (resolved)

apds was never down. It runs on the VPS (`root@evbogue.com` = `45.55.134.151`) as `deno run -A serve.js` in `/root/apds`, listening on **:9000**, and the reverse proxy maps **`pub.wiredove.net` → 9000**. `https://pub.wiredove.net/` (and `/all`) returns the full signed-message store as JSON — that's what `apds.png` shows, and the card now links there.

`apds.anproto.com` simply was **never added to `/root/reverse-proxy/domains.json`**, so the proxy 404s it — that was the "wrong URL," not a dead server. Left unrouted on purpose for now.

## Remaining work

### 1. Wiredove screenshot — feed is empty

wiredove.net is up (real app, "Generate Keypair" in the top bar) but a fresh visit shows only the top bar on black. Wiredove is local-first and syncs its feed from an apds pub over websocket, so the empty feed almost certainly means **the deployed wiredove is pointed at the wrong pub URL** — very likely `apds.anproto.com` (which 404s) instead of `pub.wiredove.net` (the live pub). Same wrong-URL bug as the apds card.

- [ ] In the wiredove repo/deploy (`/root/wiredove`, served on :8081), find the configured apds/pub endpoint and confirm whether it points at the unrouted `apds.anproto.com`.
- [ ] Point it at the live pub (`wss://pub.wiredove.net` / `https://pub.wiredove.net`), redeploy/reload wiredove, and confirm the feed populates.
- [ ] Capture → `sites/evbogue.com/assets/projects/wiredove.png` (SPA holds a websocket, so wait on a fixed delay, not networkidle). Eyeball it: real feed, not the empty top-bar state.
- [ ] Commit + deploy (pull-only; assets are read per request).

### 2. Optional: TLS cert for the pub domains

The `:443` proxy serves one shared `wiredove.net` cert for every site. Its SAN list does **not** include `pub.wiredove.net`, `apds.anproto.com`, `try.anproto.com`, or `presentation.anproto.com` — so clicking through to the apds card's `pub.wiredove.net` link currently shows a browser cert warning (the screenshot itself is unaffected).

- [ ] If you want clean click-through: `certbot --expand` the shared cert to add `pub.wiredove.net` (and optionally `apds.anproto.com` etc.), then restart the `:443` proxy.
- [ ] **Caution — this is shared, production-wide infra.** `Agents/DEVOPS.md` says never restart the `:443`/`:80` proxy, and `certbot --expand` replaces the one cert every domain depends on. A restart blips HTTPS for all ~18 domains for ~1s. Do this deliberately, with a cert backup, and verify a few domains still serve afterward. Ev's call, not a routine deploy.

## Capture recipe (already set up)

Full "Chrome for Testing" Chromium is installed at `~/Library/Caches/ms-playwright/chromium-1234/`. Session scratchpad scripts (`shoot_anproto.js`, `shoot_apds.js`, `shoot_ssb.js`) show the pattern: launch with `executablePath` to that binary, `newContext({ viewport:{width:1280,height:800}, deviceScaleFactor:2, ignoreHTTPSErrors:true })`, `goto(url,{waitUntil:"domcontentloaded"})`, `waitForTimeout(5000–7000)` for feeds, then `screenshot({path})`.

## Notes

- **Network:** the machine this ran from blocks outbound SSH `:22` to GitHub only. Push workaround: `git -c url."ssh://git@ssh.github.com:443/".insteadOf="git@github.com:" push`. SSH to `root@evbogue.com:22` works fine.
- Shipped and live: anproto, apds, and the SSB group (decent, ssbski, ssbpro).
