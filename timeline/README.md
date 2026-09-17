# Personal ANProto timeline

A CSS-free HTML page at `/timeline/` for Ev's posts and public replies. Deno serves the page and stores exact signed Wiredove-compatible messages on disk. Browser signing uses the existing ANProto keypair format. AndFS stores audio/video and image bytes separately from the signed posts.

## Run

From the repository root, run `deno task start` and visit `http://127.0.0.1:8082/timeline/`. `/timeline` redirects there. The existing homepage stays at `/`. Existing `/posts`, `/posts/:slug`, RSS and other site routes remain available. Other hosted sites retain their existing homepage.

For a local-only preview, run `TIMELINE_RELAY='' deno task start`. This disables relay publication and synchronization. Do not publish localhost media URLs to a public relay; deploy the site at its intended HTTPS origin first.

`timeline/config.json` sets Ev's approved owner public key, the Wiredove relay, a 32 MiB attachment limit and a 1 GiB media quota. `TIMELINE_RELAY` overrides the relay, including an empty value to disable it. `TIMELINE_DATA` overrides storage (default `timeline-data/`, gitignored). Back up that whole directory; a JSON post export does not include media bytes. The key is never configured on the server.

Import a Wiredove keypair into the browser or create a visitor identity. Identities are remembered on this browser by default. Uncheck “Remember my key on this browser” for a session-only identity, or use “Forget identity” to remove the saved key. Download an identity backup to keep access after closing the page. Remembered keys use this origin's localStorage; they are not encrypted at rest. Display names are labels, not proof of identity. Owner permissions use the public key, not the label.

Only the owner can start a post. Other identities can reply to known conversations, including with attachments. Draft text is retained on a failed publish. There is no cross-device private-key synchronization or key recovery service.

## Signed-message compatibility

Vendored ANProto performs the same Ed25519 timestamp + content-hash signing as Wiredove's APDS dependency. Wiredove's YAML encoder/parser is used unchanged. The signed envelope, YAML bytes, and their standard padded-base64 hashes are stored unchanged.

`previous` references the previous signed message hash for that author. `reply` references the parent signed message hash, and `replyto` is its author public key. These are distinct from the content hash and the AndFS manifest hash. Before composing, the client checks the latest known local and relay message, including its signature; when the configured relay is unavailable it keeps the draft rather than silently starting disconnected feed history. Concurrent publishing across devices can still fork history.

Posts are sent to the configured relay using its existing `POST /gossip` protocol, content first and signature second. A separate request for the message hash confirms receipt. Local persistence happens first; unconfirmed posts show “Send to Wiredove” for their author, including after reload. JSON import only imports locally; it does not automatically republish.

“Sync from Wiredove” performs bounded, manual synchronization: up to 30 owner-history links, plus the relay's poll results, with capped content lookups and ancestor depth. It is not a full network crawler, automatic background replication, or a complete archive import. Unavailable content is not forged or replaced. The poll cursor is persisted only after processing the batch; retained incomplete batches may require further sync work for large histories. Export/import provides an additional transport for signed posts. Imports report rejected messages and support parents appearing after children within the batch.

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
deno test --allow-read --allow-write timeline/tests/timeline.test.js
deno run -A timeline/tests/browser.js
```

Browser checks use a disposable loopback server, generated identities and Chrome (installed locally), with the public relay disabled. They exercise owner posting, visitor replies, identity backup, text-safe rendering, a real multi-chunk WAV with seeking, and a real WebM video. The relay test uses a protocol-compatible local mock; an existing live owner message and its content have also been retrieved and successfully verified using the local implementation, but no test posts were published publicly. This is not yet an observed end-to-end test through Wiredove's actual UI.

## First-version limits

- Wiredove inline AndFS playback awaits the migration work order; old clients get the body link. Legacy anblob attachments link to Wiredove here rather than being decoded locally.
- Edit events are rejected; Markdown is displayed as safe text with HTTP(S) links, not full Wiredove rendering. Profile-only events and complete avatar replication are not implemented.
- Moderation UI, block lists, robust spam controls, resumable upload, garbage collection and complete history sync remain follow-up work. Basic signature checks, reply permissions, per-author write limits and media quotas exist; they are not a full public abuse-defense system.
- Up to 10,000 stored messages; the API returns the stored feed and the browser pages its display. Storage is a single-process prototype, not a multi-writer database.
- Exports contain public signed messages and media references, not private keys or a complete media backup. Save identity backups separately and back up `timeline-data/andfs` together with metadata.
