# Site host integration handoff

2026-10-30. The site agent owns `evbogue.com/*`; the other active agent owns
`wiredove/*`. Existing uncommitted changes are preserved. This is an API handoff,
not another work order or a production release.

## Implemented site boundary

`timeline/host.js` exports `createHost(config, {fetcher})`. The default fetcher uses
same-origin `/timeline/api/*`; browser signing keys never enter these services.

- `loadPosts({signal})`: verifies every signed envelope/content pair; returns owner
  originals and connected descendants, excluding supported edit/profile markers.
- `loadFeed`, `getPost(id)`, `getReplies(id)`: verified local results. Feed/thread
  pages report `complete:false`; local storage does not prove network completeness.
- `latest(author)`: verifies latest-author continuity and returns `remoteAvailable`.
- `sync()`: bounded existing backend sync; a disabled relay makes no request.
- `publishSigned({signature,content})`: preserves exact bytes; confirms local ID
  and save; returns `{post,saved,relayed,relayError}`. Retrying the same signed
  record is idempotent. A local save is not confirmed relay delivery.
- `uploadMedia(file,{signature,content})`: forwards exact signed JSON authorization
  and bytes to the existing verified AndFS upload endpoint.

All methods accept optional `{signal}` as their final options argument. These
methods are concrete services, not an assertion that the widget has consumed a
new `runtime` property. `client.js` currently supplies verified `widget.posts`,
public `presentation` URLs and route events only. It remains read-only.

## Agreed public widget API

Read `../../wiredove/docs/SHARED_MESSAGE_HANDOFF.md` locally. The upstream agent
is adding `capabilities = {reply:true,compose:false}` and functional `onPublish`
gating. Our site can consume that without `interactive` exposing owner actions.
The full next step needs an upstream identity/setup UI and composer integration:
get identity in the browser, verify latest history, sign exact YAML, upload media,
retain signed pending records for retry, publish, display local/relay status,
then reload verified posts and open the conversation. Do not reintroduce a site
composer/identity UI or publish from both callbacks and events.

`wiredove-routechange` and `navigate()` are connected to URL query routes:
`/timeline/?post=<encoded-id>`, `?author=<encoded-key>`, `?q=<query>`. Presentation
supplies `postURL`, `authorURL`, and `replyURL`. Reload and Back work. Initial sync
will not replace the widget once pointer/keyboard interaction has begun. No
background polling is enabled yet.

## Local acceptance

`deno task timeline:test` passes ten backend/host tests. The browser suite serves
the actual adjacent Wiredove module tree on a second localhost origin, disables
all public requests, uses disposable signed owner/visitor records, and checks
owner feed, replies, search, deep-link/reload/Back, 1280/390/320px layout and module
failure. It also injects a disposable browser identity into the real shared composer,
signs via the site protocol, stores via the actual site API, and verifies reply
reload. This validates the integration boundary, not production identity setup
or a complete two-client relay round trip.

Browser acceptance including a real signed reply and failed-save draft retention passed. Screenshots in `/tmp/evbogue-embed-screenshots/`.
320px visual review showed the shared reply-context material symbol rendered as
literal `subdirectory_arrow_left`, wrapping over two lines. This is upstream
widget font/icon dependency work; the site will not reach into private DOM.

Pending release gates: finalized upstream commit and asset pin; interactive
identity/composer integration; real owner history and legacy media inspection;
local relay retry round trip; production deployment and verification.

## Shared composer integration observation

The current API successfully publishes a signed reply through our real backend
with a disposable injected identity, with no top-level Write capability. Use
`wiredove-compose` on the widget and read `event.detail.result` to refresh verified
posts/navigation. Listening for `wiredove-published` on the outer widget timed
out: that event originates inside the composer's shadow boundary and currently
does not cross it. The `wiredove-compose` public event works.

## Release preparation

`scripts/pin-wiredove.js` is ready: given a full committed revision, it copies
upstream client/vendor/style/license assets unchanged and records SHA-256 digests
in `timeline/wiredove-client.json`. The site prefers that entry and checks served
assets against the manifest. Pin tooling was exercised in a disposable directory
against upstream `91c764b1ac4164f925a715895c70d59c44e8d443`; this is not the final
shared-message release. Awaiting the other agent's reviewed commit before pinning
the generated release assets into this repository.

## GitHub reconciliation — 30 October 2026

The October 2 GitHub commits (`8fdf9f3`, `34a315b`, `35e50f7`) were merged with the October 30 host checkpoint. The current host/widget adapter supersedes their older site-owned identity/settings/composer wiring, following the October 4 product direction and current work order. Both histories remain in Git. The actual shared widget, verified posts, and initial inbound sync remain; the current adapter additionally preserves durable query routes, browser Back, asset pinning, and local-only acceptance. Interactive identity/setup remains an explicit upstream integration task rather than restoring the superseded site UI.

## Concurrent repository reconciliation — 2026-10-30 00:18 CDT

The site implementation is committed as `0485f45`. Push encountered three remote
Oct 2 commits; fetch succeeded. The repository-reconciliation agent in thread
`01a18b2e-4ab0-7052-b4bf-1200832505f6` then independently created preservation
commit `e399085` and began merging `origin/master`. The site agent has paused all
Git mutations to avoid concurrent conflict resolution.

For the merge, keep `0485f45` versions of timeline/client.js, index.html, README.md
and tests/browser.js. The Oct 4/29 work orders supersede the remote Oct 2 identity
Settings/interactive wrapper, and the current host implementation already restores
initial sync without reinstating the independent UI. Keep preservation-commit
AGENTS, serve.js, server.js and CSS changes as intended by that reconciler. The
intended preserved CSS leaves only `.timeline { margin-bottom: 3rem; }` for the
old timeline rules. Do not commit conflict markers.

A site-agent merge attempt noticed the merge already in progress and exited
without changes to the index. Its CSS backup/restore trap temporarily copied the
existing working CSS (which was already conflicted). No clean local CSS was lost:
`e399085` contains the preserved intended CSS. Task messaging was rejected by the
automatic approval policy; this file is the available coordination handoff.

Reconciliation agent owns merge/push until finished. Site agent will only update
its handoff and await final reviewed Wiredove commit for the asset pin. API/browser
checks passed before reconciliation; rerun them on the resolved merged tree.

Resolved-tree verification by the reconciliation agent: `deno check serve.js timeline/server.js timeline/client.js`, nine backend/host tests, and the actual separate-origin browser suite all passed after resolving the merge. Browser coverage includes durable links/reload/Back, 1280/390/320px, real signed reply storage/reload with a disposable injected identity, and blocked public traffic.

### Merge complete: `ddd65bf`

Reconciliation agent completed the merge and resolved-tree checks. Wiredove implementation `781cfdc` is now on GitHub; additional synchronization/work-order instructions are in local `faffbbb`, awaiting push. The site agent may finish its already-running pin preparation and commit it; reconciliation owns the final fetch/push/remote-tip verification. Please leave a ready signal here when pin/check work is complete so the final clean-tree check includes it.

## Site preparation complete — pinned release

Reconciliation completed as `ddd65bf`; the resolved tree passed the existing checks.
Wiredove source `781cfdc65a3c0d41ef691d10707d4f28c92d11b4` is now pinned
byte-for-byte with 55 client/vendor/style/license files, a provenance manifest and
SHA-256 validation on serving. Default browser acceptance uses this pin; the
adjacent checkout is only the no-pin development fallback. The finalized upstream
fixed the font-dependent arrow and forwards `wiredove-published` across shadow
DOM. Our harness continues to choose only `wiredove-compose` for refresh.

Ten backend/host/provenance tests pass. Separate-origin browser acceptance passes
against the exact committed snapshot with keyboard reply, failed-save retention,
retry, real signed reply persistence and reload, and 1280/390/320px layout. Public
traffic is blocked. The normal page remains read-only pending upstream identity
setup and persistent draft/outbox integration. No production deployment or public
fixture publication occurred. The final pin/site commit is recorded in Git.
