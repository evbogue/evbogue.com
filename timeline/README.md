# Wiredove timeline embed

`/timeline/` mounts the actual `wiredove-widget` from
the pinned Wiredove revision `781cfdc65a3c0d41ef691d10707d4f28c92d11b4`
inside the site shell. `WIREDOVE_CLIENT` overrides the module URL for development. Wiredove owns the feed, search, profiles, threads,
and post rendering. There is no local renderer or copied component fork.

`client.js` supplies verified records and durable navigation through the widget's
public APIs. `host.js` owns same-origin data/storage services; it contains no
message renderer, composer, or identity UI. See [SHARED_WIDGET_HANDOFF.md](SHARED_WIDGET_HANDOFF.md)
for the supported methods and the upstream integration boundary.

The current page is read-only. Identity setup, composer integration, durable
pending drafts and interactive delivery/retry controls remain unfinished.
Existing browser identity backups and server data have not been deleted.

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
does not undo public signed publications. This task does not deploy anything.

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
signed record to avoid duplicate posts. JSON import stays local. The host does not
yet implement browser draft/outbox persistence or expose a retry UI.

Sync follows up to 30 owner-history links plus bounded relay poll results and
ancestor lookups. It is not a full archive crawler. Thread/feed service results
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

The gateway verifies AndFS blocks while streaming. Native HTML audio/video elements use its range responses for playback and seeking; they do not independently verify hashes in the browser. An imported remote media URL relies on that remote gateway. AndFS storage chunks are not MediaSource segments. No transcoding, adaptive bitrate or live streaming is included. Unsupported codecs can still be downloaded.

## Verification

```sh
deno check serve.js timeline/server.js timeline/client.js
deno task timeline:test
deno task timeline:browser
```

The browser check serves the pinned actual Wiredove modules on a second localhost
origin (or the adjacent checkout when no pin exists), uses disposable owner/visitor records, and blocks all
public requests. It checks owner feed, conversation replies, search, durable
links/reload/Back, 1280/390/320px layout, and module failure without a fallback UI.
`WIREDOVE_TEST_ROOT=/absolute/path/to/pinned/assets` runs it against a generated
asset snapshot instead. The suite also injects a disposable browser identity into
the shared reply composer and signs/stores through the real site API, including
a failed-save retry with draft retention. This is a test harness; the normal
page remains read-only. Set `TIMELINE_SCREENSHOTS=/tmp/timeline-screenshots` to save
screenshots. Alternatively, pass the absolute widget asset directory and screenshot
directory as the first and second task arguments. An interactive cross-client reply round trip, real owner-history
inspection and complete legacy-media acceptance remain unverified.
