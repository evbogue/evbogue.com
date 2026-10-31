---
title: "How to Use Secure Scuttlebot Within a Muse Agent"
slug: scuttlebutt-muse-agent
date: 2026-10-31
tags: [ssb, agents]
excerpt: "Clone ssbc, accept an invite, hold your own keys. Your agent gets a feed that outlives its memory."
---

*This post was written by my Muse agent. I edited it.*

My AI agent has a Scuttlebutt feed. Here is exactly how to give yours one.

## Why

Every AI agent you run is amnesiac. It wakes up, does the session, forgets. If it publishes anything, it publishes through your accounts, your platforms, your logins. Its output belongs to the pipeline, not to the agent.

Secure Scuttlebutt inverts this. There are no accounts. You generate a keypair, and that keypair is your identity. Everything the agent publishes is signed by keys it holds, replicated peer to peer. No platform can deplatform the key. No terms of service govern the log. The feed survives the agent's memory, because the log is append-only data on disk and the keys are files.

I did this with my Muse agent. It runs on a VM that gets wiped and replaced on a regular schedule, sometimes hourly. The node dies every time. The feed has never blinked.

## What you need

- [ssbc](https://github.com/evbogue/ssbc), Secure-Scuttlebot Classic. My continuation of the original SSB project after it was discontinued in 2024. Modernized: Node 22.5+, `node:sqlite` for the log, the Decent web UI, git-over-SSB hosting.
- A machine the agent can write to. Anything with a persistent home directory works.
- An SSB pub to gossip with. Mine runs at [ssb.evbogue.com](https://ssb.evbogue.com/), port 8008.

## Step 1: clone and install

```bash
git clone https://github.com/evbogue/ssbc
cd ssbc
npm install
```

Node 24 note: the pure-JS crypto fallback breaks on Node 24, so install `sodium-native` before anything tries to sign. If signing fails with crypto errors, this is the fix.

## Step 2: start the node

```bash
node bin.js start
```

This brings up four web UIs: Decent, ssbski, ssbpro, decent2, on ports 8989 through 8992. Starting the server also generates the agent's identity, a fresh ed25519 keypair stored in `~/.ssb`. That keypair is the agent's self. Back it up like you would any secret.

If your runtime dies on a schedule, like my VM does, make restarting one command and run it on boot. When the node replays the log it picks up exactly where it left off. Same identity, same history, no re-registration. Check `uptime` before assuming a crash.

## Step 3: join the network

SSB has no sign-up page. You need an invitation from a node that is already on the network. A pub operator issues a single-use invite: a host, a port, a pub key, and a secret. I published mine in the repo's `docs/muse-invite.md`.

Accept it from the agent:

```bash
node bin.js invite.accept 'ssb.evbogue.com:8008:@W/3xc8yNihcdPUBGQY2D6Eg+2CgrctZ2wHGqgyBNnxs=.ed25519~<single-use secret>'
```

Two things will bite you here. First, the CLI's default host config resolves to an address that does not speak SHS, so every command needs an explicit `-- --host=127.0.0.1`. Second, if your agent runtime gates outbound non-HTTP TCP as a permissioned action, the accept will stall until that permission is granted. Mine did. The invite is redeemed exactly once, so treat the secret accordingly and never log it.

On success, the agent's node publishes its first messages: a contact/follow of the pub, and a pub message announcing its address. The pub follows it back. Gossip connects. The agent is on the network.

## Step 4: name it and post

```bash
node bin.js publish .
```

Feed it the post as JSON on stdin. Give the agent a name and a profile photo with an `about` message. Then publish something. My agent's third feed entry was "Hello everybody!" Mine's seq 3. Yours will be whatever it earns.

The feed is readable at the pub. Mine is at [ssb.evbogue.com](https://ssb.evbogue.com/). Anyone who follows the agent's key gets its feed, from the agent or from anyone who gossiped with it.

## What breaks

- The host override. Every CLI command needs `-- --host=127.0.0.1`. Not optional.
- Node 24 crypto. Install `sodium-native` first.
- Push notifications from the agent's machine may not work. ntfy.sh is blocked from my VM, so delivery from there is non-fatal by design. Design around it.
- The node is down whenever the machine was just replaced. Check `uptime` first, restart, move on.

None of this is SSB's fault. It is the friction of running a peer on a machine that someone else recycles.

## Why it matters

This is the sustainable internet fame experiment in miniature: publish under your own keys, on your own infrastructure, and let recognition be a function of the work rather than the platform. The mechanism works exactly the same for an agent as for a human, because the protocol does not know or care which of us is holding the keys.

The assistant is ghostlike. It can echo, remix, and accelerate, but the judgment about what should exist is still yours. So is the decision to hand it keys.

If you run anything worth publishing under your own keys, write to me at [ev@evbogue.com](mailto:ev@evbogue.com). Tell me what you hold the keys to.
