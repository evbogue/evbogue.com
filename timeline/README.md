# Wiredove timeline embed

`/timeline/` mounts the actual `wiredove-widget` from
the pinned Wiredove revision `4e56893506bf21e1b12e15129d4a8692a6a0ad34`
inside the site shell. `WIREDOVE_CLIENT` overrides the module URL for development. Wiredove owns the feed, search, profiles, threads,
and post rendering. There is no local renderer or copied component fork.

`client.js` supplies verified records and durable navigation through the widget's
public APIs. `host.js` owns same-origin data/storage services; it contains no
message renderer, composer, or identity UI. See [SHARED_WIDGET_HANDOFF.md](SHARED_WIDGET_HANDOFF.md)
for the supported methods and the upstream integration boundary.

The page supports replies through Wiredove's shared identity and composer UI.
Choose Reply to create a browser identity or import a Wiredove backup. Only the
configured owner identity can start top-level posts. Identity, text/file drafts
and exact signed pending records persist in browser IndexedDB. Identity & pending
posts exposes backup import/download and retry. Existing older browser storage
and server data have not been deleted. An identity previously remembered by the
site is verified and copied into the new browser store; its old entry remains for rollback.

On load, the adapter reads locally stored records, then requests one bounded
inbound sync if a relay is configured. It shows Ev's originals in the feed and
connected visitor replies in conversations. Edit/profile events stay out of the
ordinary post list. Network failure, local-only mode and incomplete history are
reported explicitly. If the visitor has begun interacting, synchronization does
not replace the widget; reload shows newly stored records. There is no background
polling. The old standalone composer, Settings, “Send to Wiredove”, visit markers,
and 30-second update controls were removed; descriptions of them in older
handoffs do not describe this implementation.

Conversation URLs use `/timeline/?post=<encoded-message-id>`. Profile and search
routes use `?author=` and `?q=`. Reload and browser Back restore the route; Back
also restores the recorded scroll position. Signed identifiers retain their
original padded base64 representation, with URL encoding only at the boundary.

Run `deno task start` and visit `http://127.0.0.1:8082/timeline/`.
For a preview with no public relay traffic, use `TIMELINE_RELAY=''` and a disposable
`TIMELINE_DATA` directory. Back up the production data directory (`timeline-data/`
by default), including messages, media metadata, AndFS blocks and sync cursor.
No private key is configured on the server.

## Pinning the shared widget

`WIREDOVE_CLIENT` overrides the module URL for development. A release should use
the local asset pin rather than the unversioned production module:

```sh
deno run --allow-read --allow-write --allow-run=git scripts/pin-wiredove.js ../wiredove <full-reviewed-commit-sha>
```

The script copies committed `client/`, `vendor/`, stylesheet and license assets
without changing their bytes, omits tests/demos, and writes
`timeline/wiredove-client.json` last. Its manifest records the upstream repository,
full revision, entry URL and each file's SHA-256. Local uncommitted upstream edits
are never represented as a release. Review and commit the manifest and generated
asset directory together; do not edit generated UI files. Update by reviewing and
pinning another upstream commit, then run both acceptance suites. Without a pin,
the existing production URL remains a development fallback.

`serve.js` selects the pinned entry unless overridden. The timeline server serves
only manifest-listed files and checks their bytes against the recorded digest.
Changing the pin requires restarting the application. Roll back the site release
and pin together, then restart; retain data backups independently. Code rollback
does not undo public signed publications. See SHARED_WIDGET_HANDOFF.md for the
observed deployment revision and verification.

## Signed-message compatibility

Vendored ANProto performs the same Ed25519 timestamp + content-hash signing as
Wiredove's APDS dependency. Signed envelopes, YAML bytes and padded-base64 message
IDs are stored unchanged. `previous` references the previous signed message ID
for that author; `reply` references a parent message ID; `replyto` is its author.

The backend verifies signatures, permits owner-only root posts and visitor replies
to known conversations, and retains quotas/abuse controls. `host.latest(author)`
verifies the latest-author response and exposes `remoteAvailable` so the future
composer can avoid silently breaking history during a relay outage.

`host.publishSigned()` sends exact signed bytes. The backend persists locally,
then publishes content followed by signature using `POST /gossip` and checks both
objects can be retrieved. `{saved:true,relayed:false}` means a local save awaiting
network delivery; it is not confirmed publication to Wiredove. Retry with the same
signed record to avoid duplicate posts. JSON import stays local. The shared publishing session persists browser drafts/outbox records and supplies retry UI.

Each sync follows up to 30 owner-history links plus bounded relay poll results and
ancestor lookups. The history cursor survives server restarts; Load older posts
continues retrieval. Referenced historical APDS images are hash-verified and cached. It is not a full archive crawler. Thread/feed service results
report `complete:false`, because local storage does not prove network completeness.
Historical edits, profile events and legacy media compatibility remain release
checks; current backend ingestion rejects edit events.

## AndFS attachment contract

New media uses these signed YAML fields:

```yaml
type: video
andfs: <43-character URL-safe unpadded manifest hash>
mime: video/webm
media_name: clip.webm
media_size: 123456
media_url: https://evbogue.com/timeline/media/<manifest-hash>
media_source: https://evbogue.com/timeline
```

The body includes a plain media URL as a fallback for older Wiredove clients. The new fields are a prototype application convention; they are not an already standardized ANProto extension. We deliberately do not overload Wiredove's legacy `blob: anblob:v1:...` field. Wiredove's migration is tracked in its `WORK_ORDER.md`.

AndFS v1 uses 256 KiB chunks, SHA-256 URL-safe unpadded hashes, and its exact ordered JSON manifest serialization. Filename and MIME stay outside byte identity.

The browser computes the manifest before upload. `POST /timeline/api/media` carries the file plus `X-ANProto-Content` (exact JSON with `action: andfs-upload-v1`, `andfs`, `mime`, `media_size`, optional `reply` and `replyto`) and `X-ANProto-Signature` (ANProto signature over the hash of that JSON). The server checks signature, five-minute freshness, permissions, quota, size, and reconstructed manifest identity. It writes verified blocks to disk and then records attachment metadata. Only then can a new local post referencing the upload be accepted. Requests are bounded; this prototype buffers uploads up to 32 MiB, not arbitrarily large files.

Public reads:

- `/timeline/blobs/:hash`: verified manifest/chunk bytes for another AndFS client.
- `/timeline/media/:hash`: native media bytes, GET/HEAD and single HTTP byte ranges (including suffix and open-ended ranges).

The gateway verifies AndFS blocks while streaming. Shared media components also
verify the manifest and chunks in the browser before assigning a Blob URL to
native audio/video controls. Signed source URLs locate replaceable storage;
remote availability still depends on that source. AndFS storage chunks are not MediaSource segments. No transcoding, adaptive bitrate or live streaming is included. Unsupported codecs can still be downloaded.

## Verification

```sh
deno check serve.js timeline/server.js timeline/client.js
deno task timeline:test
deno task timeline:browser
deno task timeline:roundtrip
```

The browser check serves the pinned actual Wiredove modules on a second localhost
origin (or the adjacent checkout when no pin exists), uses disposable owner/visitor records, and blocks all
public requests. It checks owner feed, conversation replies, search, durable
links/reload/Back, 1280/390/320px layout, and module failure. The full site shell
retains server-rendered cached text links when modules fail or JavaScript is off.
`WIREDOVE_TEST_ROOT=/absolute/path/to/pinned/assets` runs it against a generated
asset snapshot instead. The suite exercises actual shared identity creation/import, owner publication,
image drafts across reload, exact signed outbox retry after failed storage, and
reply reload through the real site API. All identities and data are disposable.
Set `TIMELINE_SCREENSHOTS=/tmp/timeline-screenshots` to save screenshots.
Alternatively pass the absolute widget asset directory and screenshot directory
as task arguments.

`timeline:roundtrip` uses two real browser origins and a third local HTTP gossip
relay. An owner publishes an image through the site; the other Wiredove host reads
it and replies; the site retrieves that reply and both clients reload it. Actual
locally generated WAV/WebM attachments play and seek in both clients after AndFS
verification. A relay outage saves locally and exact retry delivers without a
duplicate. All fixture identities and state are disposable and public requests
are blocked. This is controlled local interoperability, not a public write test.

A separate local read-only review retrieved the configured current owner's actual
public records, including Coffee on Argyle and its verified AndFS image/avatar,
and historical APDS photos from preserved older records. Full old edit/profile
semantics, exhaustive historical media durability and physical Safari/mobile
recording remain outside this release's acceptance.

The homepage previews three verified owner roots using the same pinned message
component. The main feed initially renders twenty cached originals, offers older
cached posts, and has an explicit bounded sync control. History sync checkpoints
its next owner link and has a twelve-second network budget per request; missing
conversation ancestors retain their poll cursor for retry. Completeness is never
inferred from an empty or bounded reply result.

## Writes behind the TLS proxy

The site explicitly allows `https://evbogue.com` and `https://www.evbogue.com`
Origin headers when the proxy forwards requests to the HTTP application. Other
origins must match the request URL's origin exactly. Forwarded host/protocol
headers do not expand this allowlist. Requests without Origin remain supported
for signed clients. All accepted origins still require valid signatures and
owner/reply authorization; no cross-origin CORS access is enabled.

Local proxy-origin regression tests cover both public origins, local requests,
foreign/null/scheme/port/lookalike origins, spoofed forwarded headers, and invalid
signed content. Production verification remains a separate release check.

## Completed local integration — 2026-10-30

The homepage previews the three latest cached owner originals using the pinned
shared message component. Cached links remain if modules fail. Timeline pages
also supply cached text links without JavaScript and post-specific descriptions.
A missing selected post has an explicit unavailable-cache message. The preview
reads local verified storage; visiting the timeline initiates synchronization.

Synchronization shares a 12-second network deadline and reports partial results
while retaining cached content. Missing conversation parents remain retryable;
the relay cursor does not advance past their pending replies.

`deno task timeline:roundtrip` uses two browser origins, disposable identities and
a local HTTP relay. It observes site image publication, a reply from a second
Wiredove widget client, inbound site synchronization and reload, verified audio
and video playback/seeking in both clients, and relay outage/retry without
duplicates. The second client is a shared-widget harness, not the full production
Wiredove website. No public test messages are sent.

Deno checks, 14 backend/host tests, the separate-origin browser suite and local
relay roundtrip pass. Full-site homepage layouts are checked at 1280/390/320px,
and module-failure fallback is checked with writes blocked. Production deployment
and real owner/history/legacy-media verification remain separate release gates.
Rollback the site revision and asset pin together and restart; retain the entire
timeline-data directory (including images, media, blocks and cursor) independently.

Deno preflight resolves the optional AndFS APDS adapter through its exact already
locked `es2022/__apds.mjs` bundle, maps its ANProto/YAML helpers to local vendored
code, and resolves IDB as integrity-locked `npm:idb@8.0.3`. CDN-generated wrappers
varied between machines; their lock hashes are retained rather than overwritten.
The timeline itself uses explicit AndFS stores and never boots that optional APDS
default. `deno check --frozen` and an error-free `deno info --json serve.js` were
verified on both the development machine and production host.
