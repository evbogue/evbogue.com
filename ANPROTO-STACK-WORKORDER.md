# ANProto Stack workorder — COMPLETE (2026-08-05)

All six cards on the **ANProto Stack** and **SSB** groups now have real screenshots, and the root-cause infra issue (TLS cert) is fixed.

## Final state

| Group | Card | URL | Screenshot |
|---|---|---|---|
| ANProto Stack | ANProto | anproto.com | ✅ `anproto.png` |
| ANProto Stack | Wiredove | wiredove.net | ✅ `wiredove.png` (live feed) |
| ANProto Stack | apds | pub.wiredove.net | ✅ `apds.png` (raw `/all` JSON) |
| SSB | Decent | decent.evbogue.com | ✅ `decent.png` |
| SSB | ssbski | ssbski.evbogue.com | ✅ `ssbski.png` |
| SSB | ssbpro | ssbpro.evbogue.com | ✅ `ssbpro.png` |

## What was actually wrong (resolved)

- **apds** was never down — it runs on the VPS `:9000`, routed as the wiredove.net **pub** (`pub.wiredove.net`). `apds.anproto.com` was just never added to the proxy, so it 404'd. Repointed the card at `pub.wiredove.net`.
- **Wiredove's empty feed** and **apds's cert warning** were the *same* root cause: `pub.wiredove.net` wasn't in the shared TLS cert, so wiredove's `wss://pub.wiredove.net` handshake failed (`ERR_CERT_COMMON_NAME_INVALID`) → no sync. Expanded the Let's Encrypt cert to cover `pub.wiredove.net` and restarted the reverse proxy. Wiredove now syncs the pub's ~300 messages; both fixed.

The reverse-proxy + cert procedure this uncovered is now documented in `Agents/DEVOPS.md` ("Reverse proxy and TLS certs").

## Optional follow-up (not blocking)

- **Wildcard cert to stop hand-maintaining the SAN list.** DNS is on Namecheap (`registrar-servers.com`). Wildcards require DNS-01 validation + Namecheap API credentials + IP allowlisting + a third-party certbot plugin (or `acme.sh`) — needs Ev's DNS credentials, which an agent shouldn't handle directly. Alternatives: a small "add-a-domain" helper script wrapping the documented HTTP-01 re-issue (no credentials needed), or migrate DNS to Cloudflare for a trivial `certbot-dns-cloudflare` wildcard. Ev's call.
