# ANALYST-WORKORDER.md - Analytics implementation spec

> **Active tasks have moved.** The work order for this project lives entirely in `AGENTS.md`. This file is a technical specification only — implementation details, schemas, and phase definitions for the analytics system. Check `AGENTS.md` for what is currently assigned and what has been completed.

## Goal

Collect enough first-party signal to answer five questions every Monday:

1. Which posts pulled traffic this week?
2. Where did that traffic come from?
3. How did the subscriber funnel convert?
4. Is the archive still earning its keep?
5. What changed week over week?

No third-party trackers. No JS in the page. No build step.

## Non-goals

- A live dashboard.
- Per-reader identity. Aggregates only.
- Time-on-page or bounce rate. We can't measure those honestly from this stack.
- Email open tracking. Defer unless Ev asks for it.

## Phase 1 — Event capture middleware

**File:** `lib/analytics.js` (new).

Export a Hono middleware `recordRequest()` that appends one JSON line to `analytics/events.jsonl` per request. Schema:

```
{
  "t": "2026-05-14T15:04:22Z",     // ISO timestamp, second precision
  "kind": "view",                   // view | rss | subscribe_attempt | confirm | unsubscribe | send
  "path": "/posts/some-slug",       // request path
  "ref_host": "news.ycombinator.com", // referrer host only, or null
  "ua_class": "browser",            // browser | feed | bot | other
  "ip_hash": "f3a1...",             // sha256(ip + ANALYTICS_SALT), first 12 chars
  "status": 200
}
```

Rules:

- Skip `/assets/*`, `/favicon.ico`, and any `OPTIONS` request.
- Skip the request entirely if `ANALYTICS_SALT` is not set in env — fail closed, don't log unsalted hashes.
- `ua_class` is decided by a short substring list — `bot|crawl|spider` → `bot`, `feed|rss|reader` → `feed`, otherwise `browser`. Don't ship a 500-line UA parser.
- The raw user-agent string is never written.
- Writes are async and never block the response — fire-and-forget through a queue, with a single appending writer.

**Wire it up** in `serve.js` once, before route registration.

**Done when:** hitting `/`, `/posts/<slug>`, and `/feed.xml` locally produces one line each in `analytics/events.jsonl` with the right `kind` and `ua_class`.

## Phase 2 — Funnel events

**Files:** `lib/analytics.js`, `lib/subscribers.js`, `send-post.js`.

Add a `recordEvent(kind, fields)` helper next to the middleware. Call it from:

- `/subscribe` POST — `kind: "subscribe_attempt"`, with `outcome: "ok" | "invalid" | "error"`.
- The confirm-token handler — `kind: "confirm"`.
- The unsubscribe-token handler — `kind: "unsubscribe"`.
- `send-post.js` after a successful send to the list — `kind: "send"`, with `slug` and `recipient_count`.

No email addresses, no tokens, no IPs in these rows. Just the verb and the minimum context.

**Done when:** a full local cycle (subscribe → confirm → unsubscribe) writes three rows to the log with the expected `kind` values and no PII.

## Phase 3 — Weekly report script

**File:** `scripts/weekly_report.js` (new).

Reads `analytics/events.jsonl`, filters to the trailing 7 days (Monday 00:00 → Sunday 23:59 in `America/Chicago`), writes `analytics/reports/YYYY-Www.md`.

Report sections, in this order:

1. **Headline** — one line. The single most useful sentence the data supports.
2. **Top posts** — table of the top 10 slugs by `view` count, plus a small inline SVG bar chart. Columns: rank, slug, views, top referrer.
3. **Referrers** — table of referrer hosts that sent ≥ 5 readers, sorted desc.
4. **Subscriber funnel** — counts for `subscribe_attempt(ok)`, `confirm`, `unsubscribe`, plus the form → confirm conversion %.
5. **Post → signup conversion** — top 10 source paths that drove confirmed signups, with attempt count, confirm count, and the conversion %. Identifies which posts are pulling weight at the bottom of the funnel, not just the top. (Powered by Phase 6.)
6. **Email click funnel** — for each campaign sent this week: recipients, unique clickers, click rate, top 3 clicked links, and confirmed signups attributed to that campaign. (Powered by Phase 7.)
7. **Archive vs new** — % of post views that landed on posts older than 90 days. One number. One line.
8. **Week over week** — three deltas: total post views, confirms, top-post share. Plain text. No charts.
9. **Notes** — anything the script noticed but couldn't quantify (e.g. a referrer host that's new this week).

Chart rules:

- One SVG per chart, written inline into the markdown. No external image files.
- Plain `<svg>` with `<rect>` bars and `<text>` labels. No JS, no defs, no gradients.
- Max width 600px so it renders cleanly in the eventual `/analytics` route and in email.

Idempotency: running the script twice in the same ISO week overwrites the same file.

CLI:

```
deno run --allow-read --allow-write --allow-env scripts/weekly_report.js [--week=YYYY-Www]
```

`--week` is optional; defaults to the most recently completed ISO week.

**Done when:** running the script against a seeded `events.jsonl` produces a report that matches the section list above and renders cleanly in a markdown previewer.

## Phase 4 — Cron + email (DevOps)

On the VPS, add a Monday 09:00 America/Chicago cron entry that:

1. Runs `scripts/weekly_report.js` for the previous ISO week.
2. Commits the new report file from the VPS to the repo (the `analytics/reports/` directory is committed; the `events.jsonl` is not).
3. Emails Ev the rendered markdown via the existing SMTP path. Subject: `[evbogue.com] weekly report: YYYY-Www`.

Update `Agents/DEVOPS.md` with the cron line and the rollback command.

**Done when:** Monday morning, Ev gets one email with the week's report and the same report is committed to master.

## Phase 5 — Gated `/analytics` route (optional)

**File:** `serve.js`.

Add a `GET /analytics` route that renders the most recent report from `analytics/reports/`. Gate it behind `ANALYTICS_TOKEN` from env — accept the token via `?token=…` and 404 on mismatch. Plain HTML, no JS, no fancy chrome — reuse `signalPage()`.

Skip this phase if Ev would rather just read the emailed markdown.

**Done when:** `/analytics?token=…` shows the latest report and `/analytics` without the token returns 404.

## Phase 6 — Signup attribution (no cookies)

We want to know which post drove a signup, without tracking readers.

**Files:** `serve.js`, `lib/analytics.js`, `lib/subscribers.js`.

Approach — first-party, no cookies, no JS:

1. **Hidden form field.** Render the subscribe form (in `signalPage()` and the dialog) with a hidden `<input type="hidden" name="source" value="<current-path>">`. The post page renders `/posts/<slug>`; the homepage renders `/`; the about page renders `/about`.
2. **Capture on POST.** `/subscribe` reads `source` from the form body, sanitizes it (must start with `/`, max length 200, drop query string), and stores it on the subscriber row as `signup_source`. Also include it on the `subscribe_attempt` event.
3. **Carry through confirm.** When the confirm-token flow flips `confirmed_at`, emit the `confirm` event with the row's `signup_source` so the report can compute conversion by source.
4. **Referrer fallback.** If `source` is missing or invalid, fall back to the `Referer` header path (same-origin only). Drop the value entirely if it points off-site — don't log external referrers as a signup source.

**Privacy:**

- Source is a path, not a URL with query parameters. Never log a query string from the form context.
- The subscriber row already lives only on the VPS; `signup_source` rides along with it.
- The committed weekly report only ever shows aggregated source paths, never which subscriber came from which post.

**Done when:**

- Subscribing from `/posts/my-post` writes a `subscribe_attempt` row with `source: "/posts/my-post"`.
- Confirming that signup emits a `confirm` event with the same source.
- The weekly report's "Post → signup conversion" section lists source paths sorted by confirmed signups.

## Phase 7 — Per-recipient email click tracking

We want to know which links in a newsletter got clicked and which campaigns drove signups.

**Files:** `send-post.js`, `lib/analytics.js`, `serve.js`, new `analytics/sends/<send-id>.json` directory (gitignored).

### Send-time changes (`send-post.js`)

When sending a post to the list:

1. Generate one `send_id` for the campaign (UUID).
2. For each recipient, generate a random `recipient_token` (≥ 16 bytes, base64url).
3. Scan the email body for every `https://evbogue.com/...` link. Assign each unique target a stable `link_id` within this send.
4. Rewrite each link to `https://evbogue.com/r/<send-id>/<recipient_token>?l=<link_id>`. The unsubscribe link is already per-recipient and stays as-is — don't double-wrap it; just log clicks on it as a separate event class.
5. Write `analytics/sends/<send-id>.json` on the VPS, gitignored, with the shape:

   ```json
   {
     "send_id": "...",
     "slug": "post-slug",
     "sent_at": "2026-05-14T15:00:00Z",
     "links": [{ "id": "L1", "target": "https://evbogue.com/posts/post-slug" }],
     "recipients": [{ "sub_hash": "f3a1...", "token": "..." }]
   }
   ```

   `sub_hash` is `sha256(subscriber_email + ANALYTICS_SALT)`, first 12 chars — same construction as the request-log hash. The recipient's email is **not** stored in the send file.
6. Emit one `send` event (already in Phase 2) with `{ send_id, slug, recipient_count, link_count }`.

### Redirector (`serve.js`)

Add `GET /r/:send_id/:token`:

1. Look up `analytics/sends/<send_id>.json`. If missing → 302 to `/`.
2. Find the recipient row by `token`. If missing → 302 to `/`.
3. Look up the link by `l` query param. If missing or invalid → 302 to `/`.
4. Emit `email_click` event: `{ send_id, slug, sub_hash, link_id, target }`. No raw URL parameters logged beyond `link_id`.
5. Deduplicate: if the same `(send_id, token, link_id)` triple already fired within the last 60 seconds, skip the event but still redirect. This kills the bulk of email-security-scanner double-clicks.
6. `UA` classification still applies — `bot`-class clicks are logged with the `ua_class` field so the report can subtract them when computing the unique-clicker count.
7. 302 to the target URL. Don't render an interstitial page.

### Cross-referencing signups

The `subscribe_attempt` event from Phase 6 already carries `source`. If a reader clicks an email link, lands on `/posts/<slug>`, and signs up from that page, the `source` field will match the slug from the campaign. The weekly report joins on `(send.slug, signup.source)` to attribute signups to campaigns — coarse, but honest. We can sharpen it later by adding a `?ref=email-<send_id>` query parameter to the rewritten URLs and capturing it into a separate `email_landing` event, but not in v1.

**Privacy:**

- Per-recipient resolution exists only in `analytics/sends/<send-id>.json` and the events log, both gitignored, both VPS-only.
- Reports never name a subscriber. They report counts.
- Send manifests older than 180 days are deleted by a maintenance step (defer to a later phase if you want, but note it).

**Done when:**

- Running `send-post.js <slug>` for a test list produces a `sends/<send-id>.json` manifest and rewrites every site link in the email to a `/r/...` URL.
- Clicking a rewritten link from a real inbox lands on the right post and writes one `email_click` event with the expected `link_id`.
- Reloading the same link within 60s does **not** double-log.
- The weekly report's "Email click funnel" section shows click rate per campaign and credits signups whose `source` matches the campaign's `slug` during the send-week window.

## Constraints (reminder)

- `analytics/events.jsonl` and `analytics/sends/` are both gitignored. Add the lines to `.gitignore` in Phase 1 and Phase 7.
- `ANALYTICS_SALT` and `ANALYTICS_TOKEN` are env vars only. Never hardcoded. Never committed.
- No new dependencies. Everything ships using Deno stdlib and what's already in `deno.json`.
- Don't ask Ev to restart the server. He runs the VPS himself.

## Definition of done for the whole work order

- Hitting any public route on the VPS appends a row to `analytics/events.jsonl`.
- The full subscribe → confirm → unsubscribe cycle produces clean funnel rows.
- Every signup carries a `source` path so the report can attribute it to a post.
- Outbound newsletter links get rewritten per-recipient, clicks land in the events log, and the report credits signups back to the campaign that drove them.
- The Monday cron writes a weekly report to `analytics/reports/`, commits it, and emails it.
- The Analyst role can produce its weekly memo from the committed reports without touching production data.
- A first real weekly report exists on master and reads like a memo, not a dashboard.
