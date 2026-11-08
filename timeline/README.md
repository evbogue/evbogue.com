# Wiredove application on evbogue.com

`/timeline/` mounts the full shared `mountWiredove` application in Shadow DOM.
The website and this embed use the same application runtime. The site supplies
chrome, URL navigation, owner policy and verified backend/media services; it no
longer assembles screens, counts replies or orchestrates publication callbacks.
The homepage still uses the individually importable shared message widget.

## Release and ownership

Pinned upstream: `220d155f288821c228416bdb6e6964f0b58d0210`.
`timeline/wiredove-client.json` records exact file hashes, including `dist/app-v1`.
Generated files are unchanged upstream copies. Update with:

```sh
deno run --allow-read --allow-write --allow-run=git scripts/pin-wiredove.js ../wiredove <full-reviewed-commit-sha>
```

`serve.js` selects the pin; `client.js` calls its `dist/app-v1/app-embed.js`.
The server serves only manifest-listed assets and checks SHA-256, with correct
JavaScript/CSS/font/image MIME types and public read CORS. Imports do not start
the application. The embed does not register a host service worker.

The initial route is the configured owner's profile/feed. Home returns there.
Existing `?post=` and `?author=` links and hash routes are supported; other
application routes use hash navigation. Browser Back/Forward and reload use the
shared router. Cached text links and selected-post descriptions remain available
when JavaScript or the module fails. Archive scope is bounded and incomplete.

## Browser storage upgrade

The application uses `evbogue-wiredove-application`; the explicit
`legacyDatabase: 'evbogue-wiredove'` option imports the former session's validated
identity, exact signed outbox and text drafts once. It preserves the old store
and localStorage entries. An identity conflict stops the upgrade rather than
replacing either identity. Existing File attachments remain in the old IndexedDB
store and appear as **Restore previous attachment** when opening their composer.
Restoring explicitly uploads the selected file through the shared upload client.
New application drafts/outbox follow the shared runtime's persistence behavior.
Unuploaded new files are not durable drafts.

The owner alone sees Compose and can publish roots. Visitors can create/import
an origin-owned identity and reply. Settings exposes identity backup/import;
existing backups remain valid. evbogue.com and wiredove.net have separate browser
identity storage. Host scripts can access their origin's keys: Shadow DOM does
not provide a security boundary. Never configure Ev's secret key on the server.

## Backend and signed bytes

`GET /timeline/api/application?after=N` supplies up to 100 exact signed artifacts,
a durable append-order cursor, `more` and `scope: "backend-archive"`.
`POST /timeline/api/application` shares the existing signature verification,
owner/reply authorization, quotas, persistence, deduplication and relay delivery.
Profile metadata-only statements are allowed; edits require a known original
owned by the signer. Unsupported history/completeness is not inferred from an
empty result. Existing `/api/posts`, import/export, sync and media reads remain.

The server stores messages unchanged. `application-order.json` adds a stable
archive cursor without rewriting signed artifacts. Relay retries preserve exact
content/signatures and confirm both gossip objects. A configured relay failure
returns `relayed:false` and retains the application outbox. With relay explicitly
disabled, the selected local backend is the delivery destination.

Initial bounded sync and Load older/check updates retain the existing 12-second
budget and persisted history cursor. The app polls its local archive every three
seconds; cached panels merge verified arrivals through shared feed queries.
Historical APDS images are fetched through `/api/image`, hash-verified and placed
in the shared verified cache. Failures remain queued independently of archive
cursors; later refreshes retry and notify mounted image readers on verified arrival. Existing `/timeline/media/*`, `/timeline/blobs/*`,
AndFS disk blocks and cached historical images are preserved. Full historical
anblob availability and physical Safari recording are not established here.

New uploads use the signed AndFS v1 upload contract at `/timeline/api/media`.
Signed source URLs identify `/timeline`; new file links use
`https://evbogue.com/timeline/#<manifest-hash>`. Historical `/media` links remain
readable. GET/HEAD and single-range verified media reads remain available.
Chunks are storage blocks, not codec segments; no transcoding is introduced.

Writes accept same-origin requests or the explicit production HTTPS allowlist.
Forwarded headers cannot expand it. Public read CORS does not authorize foreign
writes; signature, owner/reply and quota checks remain mandatory.

## Checks and release

```sh
deno check --frozen serve.js
deno task timeline:test
deno task timeline:browser
```

The application browser suite runs the real pinned graph, real site bootstrap,
real cryptography and two local origins with disposable identities and public
writes blocked. It covers old identity/text/File draft migration, visitor replies,
reverse-origin identity/profile/reply, thread reload, owner Compose, failed-save
reload/exact retry, deduplication and 1200/390/320px light/dark screenshots.
`test-results/` is ignored. The full site shell is separately smoke-tested locally
and after release with non-GET traffic blocked. Earlier widget browser/HTTP-relay
suites are historical component acceptance, not full-application acceptance.

Back up the entire `timeline-data/` directory before deployment: message exports
alone do not contain media. Preserve production-only video and subscriber files.
Deploy reviewed `master`, run the frozen check and reload only the existing tmux
application on port 8082. Retain the previous revision and backup for rollback;
code rollback does not undo public signed publications. Proxy/DNS/TLS stay unchanged.

Remaining scope: full shared feature parity, complete historical/legacy media
coverage, physical Safari/device recording, and broader network discovery.

## Historical compatibility checks — 2026-11-01

The source pin is Wiredove `a078b53`. The site adapter preserves `?post=`,
`?author=`, `?q=`, `?reply=`, `?view=identity`, owner `?view=compose`, and raw or
percent-encoded hash links. Wiredove owns the resulting screens/composer actions.
Legacy APDS data-URL image hashes still resolve through the verified image service.
Historical anblob playback uses the shared reader and original IDs/verifier/cache.
Signed `media_source` selects its source; otherwise `legacyMediaURL` from site
configuration defaults to `https://wiredove.net`, independently of new AndFS storage.
The remote legacy blob service must permit CORS GET/HEAD. This source change requires
Wiredove's companion CORS release before deployment acceptance of source-free reads.

`deno task timeline:browser` now includes `tests/historical.browser.js` through the
real site bootstrap and separate-origin application. Disposable signed fixtures
cover APDS image/avatar decoding/reload, old links, raw WebM and chunked WAV legacy
playback and byte equality, audio seek, corrupt-read rejection/retry, source adapter,
AndFS gateway full/range and hash-route reads, and unchanged signed originals.
No public fixtures are published. These tests do not audit every production-stored
historical item, all profile-photo/format combinations or physical Safari/mobile.
The source pin update has not been deployed by this compatibility-check session.


## Shared profile/settings/control widgets — 2026-11-01

The application source pin is Wiredove `2992b9d`. It includes the full shared
profile header/editor, settings screen, and rich edit-history/moderation control
factories. The site still supplies configuration/services only; it does not rebuild
those screens. Signed photo originals/crops, profile links/empty bio, revisions,
identity storage and historical readers remain intact. Archive-only settings use
selected-backend refresh/retry. Accessibility, discovery and historical-image-limit
changes from the paused batch are excluded from this release.

The historical-image size-limit patch is preserved separately in the named local
Git stash; it is not fixed by this pin update. Full shared-application parity and
physical-device acceptance remain open. See upstream docs/BEHAVIOR_MATRIX.md for
the scoped widget acceptance and current deferred work.

## Historical photo reads — 2026-11-07

Large historical APDS images have a dedicated 48 MiB source budget and a bounded
JSON response allowance. Gossip reads for posts retain the 4 MiB default.
Cache and upstream values must match the referenced APDS hash before serving;
oversized streams are cancelled. Regression coverage includes >4 MiB images,
restart, corrupt cache, oversized response and retry. The two previously rejected
4000×3000 photos now decode from the deployed service without changing their hashes.
