# Bogbook workorder

Bogbook is the bogbook.com side of this repo: an AI-generated, human-owned media blog by Ev Bogue with the motto **Augmented Chicago Against Silicon Valley**.

The mission is to bring Gawker's useful function back from the dead and point it at Silicon Valley: founders, funds, AI labs, press capture, authoritarian tech politics, and the self-mythology that lets powerful people mistake capital for intelligence. Media and NYC scene coverage are secondary when they help expose the same machinery.

## Current status

### Shipped

- [x] **Multi-site architecture**: `evbogue.com` and `bogbook.com` run from one Deno/Hono process using `sites/<site>/site.json` and Host / `x-forwarded-host` dispatch.
- [x] **evbogue.com moved**: posts, drafts, assets, about page, subscribers, and site metadata live under `sites/evbogue.com/`.
- [x] **Bogbook skeleton**: `sites/bogbook.com/` contains `site.json`, `about.md`, `assets/bogbook.css`, `assets/ev-profile.jpg`, `drafts/`, and `posts/`.
- [x] **Reverse proxy**: `evbogue/reverse-proxy` maps `bogbook.com` and `www.bogbook.com` to the shared Deno backend port.
- [x] **Production host dispatch fix**: app dispatch prefers `x-forwarded-host`, so bogbook.com renders Bogbook behind the proxy instead of falling back to evbogue.com.
- [x] **Site-aware email/subscriber tools**: subscribe, confirm, unsubscribe, reconfirm, `send-post.js`, mailer identity, analytics, and weekly reports are parameterized by site.
- [x] **Bogbook about page**: masthead explains the AI-generated workflow, Ev's responsibility, the Silicon Valley vendetta, the anti-technofascist bent, Peter Thiel's destruction of Gawker Media, tips, contact, and sponsorships.
- [x] **Gawker Writer agent**: `Agents/GAWKER-WRITER.md` defines Bogbook mission, beat, moral line, voice registers, sourcing rules, byline policy, and draft workflow.
- [x] **Editor agent routing**: `Agents/EDITOR.md` now serves both evbogue.com and bogbook.com and points Bogbook edits back to `Agents/GAWKER-WRITER.md`.
- [x] **Agent/site routing table**: `AGENTS.md` documents which agents serve which site.
- [x] **Temporary noindex**: bogbook.com has `noindex` enabled in `sites/bogbook.com/site.json` until launch posts are live.

## Remaining launch work

### Editorial launch

- [ ] **First 3 Bogbook launch stories**: draft and publish three inaugural pieces under `sites/bogbook.com/posts/` before promoting the site. Use `Agents/GAWKER-WRITER.md` and run a headline pass with `Agents/EDITOR.md`.
- [ ] **Launch announcement**: publish one evbogue.com post announcing Bogbook and linking to the three launch stories.
- [ ] **Distribution copy**: prepare short launch copy for Ev's social channels after the posts are live.

### Launch switch

- [ ] **Remove noindex**: set `"noindex": false` or remove the key from `sites/bogbook.com/site.json` once DNS, HTTPS, feed, subscribe, and the first three stories are verified.
- [ ] **Live smoke test**: after production pulls and restarts, verify:
  - `https://bogbook.com/`
  - `https://bogbook.com/about`
  - `https://bogbook.com/feed.xml`
  - `https://bogbook.com/assets/bogbook.css`
  - subscribe, confirm, unsubscribe round trip
  - `https://evbogue.com/` still renders evbogue.com

### Infrastructure checks

- [ ] **TLS/cert confirmation**: confirm the production certificate covers `bogbook.com` and `www.bogbook.com`.
- [ ] **VPS data paths**: confirm `sites/evbogue.com/subscribers.json`, `sites/bogbook.com/subscribers.json`, `analytics/evbogue.jsonl`, and `analytics/bogbook.jsonl` exist or are created safely on the VPS.
- [ ] **Weekly report cron**: optional for Bogbook at launch scale. If enabled, run `deno task weekly-report --site=bogbook.com --email` from the VPS environment with `SMTP_PASS` and `ANALYTICS_SALT`.

## Explicitly not needed now

- No ad-rate-card project.
- No separate ad-ops agent.
- No hiring workflow.
- No programmatic ad setup.
- No separate CMS or build step.

## Operating rules

- The publication is always called **Bogbook** — one g, one word, capital B. Never "Boggbook," never "Bog Book," never "bog book." This applies in copy, commit messages, file names, and agent prompts.
- Every Bogbook post publishes under Ev Bogue's byline. AI can draft and organize, but Ev owns the claims.
- Bogbook must disclose its AI-generated workflow honestly. Do not pretend there is a newsroom of hidden humans.
- Punch up at power and pretension. Punch sideways at industry excuses. Do not punch down.
- Link sources. Name documents. Give criticized subjects a chance to respond when the piece makes reportorial claims.
- No em dashes in published copy.
- Keep Bogbook and evbogue.com voices distinct. Bogbook is not Ev's personal essay blog with a different stylesheet.
