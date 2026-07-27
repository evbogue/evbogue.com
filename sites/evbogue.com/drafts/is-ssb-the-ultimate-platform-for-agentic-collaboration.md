---
title: "Is SSB the Ultimate Platform for Agentic Collaboration?"
slug: is-ssb-the-ultimate-platform-for-agentic-collaboration
date: 2026-07-27
tags: [ai, agents, scuttlebutt, decentralized]
excerpt: "Buzz gives agents a room on a relay. SSB asks why the room needs a landlord at all."
---

Jack Dorsey's Block just launched [Buzz](https://github.com/block/buzz), and the pitch is almost exactly the sentence every agent tool has been trying to write without sounding ridiculous: humans and agents in the same room.

Not bots. Not slash commands. Not a haunted CI pipeline that drops a comment and disappears. Agents as members, with their own identities, their own channel access, their own audit trail, and the ability to read project history, propose patches, run workflows, and participate in the same workspace as the humans.

This is a real idea. It is also funny to me, because we have already been building around this shape from the other end.

With OpenClaw, we already ran the ghost version of this experiment. There is no repo to point at and no polished artifact to brag about. We hooked an OpenClaw agent into ANProto, watched the basic shape work, and then the agent got deleted. Which is funny in the bleak way infrastructure experiments are funny: the first proof that agents need durable identity and message history is that our agent disappeared and took the working context with it.

With [ANProto](https://anproto.com), the point was even smaller and weirder: do not put the network in the protocol. Sign the message. Prove who said it. Prove it was not tampered with. Then move it over whatever ridiculous transport is available today. URL bar. Email. WebRTC. USB stick. Local wifi. A backpack full of cursed adapters if that is what the day requires. The pipe is not the source of truth. The signed object is.

Buzz comes at the same problem with a more product-shaped answer. It says: here is the room. Here is the relay. Here are the channels, DMs, canvases, media, workflows, git events, and agents. The [README](https://github.com/block/buzz/blob/main/README.md) describes one community, one identity model, one event log. The [architecture doc](https://github.com/block/buzz/blob/main/ARCHITECTURE.md) is more blunt: the relay is the single source of truth. All reads and writes go through it. No peer-to-peer event exchange. No gossip. No replication. Clients connect to one relay over WebSocket.

That is the line that matters.

Buzz is not fake because of this. The official [support page](https://block.github.io/buzz/support.html) says the quiet part clearly: relays are not federated, and a message stays on the relay where it was sent. That is honest documentation, which I appreciate. But it means the sovereignty story has a hard edge. You can own the relay. You can self-host the workspace. You can reduce dependency on Slack and GitHub. Good. But once the relay is the single source of truth, the shape is still landlord-shaped. You may be the landlord. You may trust the landlord. You may even be wearing a little sysadmin crown. The room still has one door.

This is where SSB starts looking less like internet archaeology and more like unfinished infrastructure for the agent era.

The local repo I maintain at [`/Users/evbogue/Code/ssbc`](https://github.com/evbogue/ssbc) describes Secure Scuttlebutt as a peer-to-peer protocol built on signed, append-only personal logs. Your feed lives on your own computer. Messages gossip between nodes. There is no central server and no algorithmic feed. Every message is signed with your private key and references the previous message in your feed, forming a cryptographic chain. If someone has your feed, they can verify it. If a pub disappears, your feed and social graph survive on every node that replicated them.

That is not a workspace. It is stranger and more useful than a workspace.

It is a room where every participant carries the room.

An agent in Buzz has a keypair and a channel membership. An agent in SSB could have a feed. Not a service account in somebody's dashboard. Not a bot token stuffed into an environment variable and prayed over. A feed. A signed append-only log of what the agent said, what it changed, what it reviewed, what it asked another agent to do, and what a human approved.

That changes the accountability model. In Slack, an agent is usually a mouth glued to an API. In Buzz, an agent becomes a member of a relay-owned room. In SSB, an agent could become a peer.

This is the part that feels obvious only after you say it out loud: agent collaboration is mostly a message replication problem.

The models are not the hard part anymore. The hard part is who knows what, who said what, what can be trusted, what can be replayed, what survives a server going down, and how a human audits the pile afterward without needing to reconstruct the crime scene from twelve SaaS tabs and one cursed project board.

SSB already has primitives for that.

It has identity as a keypair. It has signed personal logs. It has gossip. It has private messages. It has blobs. It has pubs that help nodes find each other without owning the network. It has git over SSB, which my local `ssbc` repo exposes as normal git smart HTTP while backing the repository with SSB messages and blobs. You can create a repo, add the SSB URL as a remote, push, fetch, clone, and let the repo replicate through the network.

That last part is not theoretical romance. The `ssbc` README says the repo URL contains the SSB message ID of the `git-repo` message, and anyone on the network can clone it once it has replicated to their node. Decent includes a git-forge UI for browsing repos, branches, and commits in the browser. The current architecture doc points at `plugins/git-server.js` as the bridge between ordinary git client behavior, HTTP transport, and SSB-backed storage.

So when Buzz says "branch as room," I hear a good product idea. When SSB says git can live in the gossip network, I hear a harder question: why is the branch-room locked to one relay?

The agent version of git-ssb would be wonderfully strange. A human opens an issue by publishing a signed message. A planning agent replies with a proposed task breakdown in its own feed. A coding agent publishes a patch or pushes to an SSB-backed git repo. A review agent comments on the diff. A human signs off. The merge decision, the patch, the discussion, and the audit trail all replicate as logs. If two agents are on the same LAN, they can sync. If they only meet through a pub, they can sync. If the public internet goes sideways, the work does not have to pretend the world is a tidy SaaS diagram.

This is also where SSB private crypto gets interesting.

The local `ssbc` docs preserve the old Scuttlebot private-message API: publish content with a list of recipient feed IDs, and the content is encrypted to those recipients. The Decent code does the same thing in the modern UI. If `content.recps` exists, `decent/src/modules/core/crypto.js` boxes the message with `ssbKeys.box()` before publishing. The chat UI builds private messages as `{type: "post", text, recps, private: true}` and publishes them. The on-wire content is the encrypted `.box` blob. Only recipients can unbox it.

Now make the recipient an agent.

Not "send this prompt to a cloud vendor and hope the workspace settings are configured correctly." A private SSB message addressed to the agent feed and the human feed. The encrypted instruction lives in the append-only log. The pub can replicate it without reading it. Other peers can carry it without reading it. The agent can decrypt it because it is a recipient. The human can decrypt it because they included themselves, which the old docs explicitly recommend so you can read your own private messages later.

That is a clean primitive for agentic collaboration: public work when the work should be public, private encrypted instructions when the task should stay private, and signed logs either way.

It is not magic. SSB has scars. The old ecosystem thinned out. The original project was abandoned in 2024. The JavaScript stack has more history in it than anyone sane would design from scratch. My local `ssbc` worktree is currently active and messy, because that is what maintenance looks like when the museum exhibit starts breathing again.

But the shape is right.

Buzz proves that people are starting to understand the agent workspace problem. Agents need rooms. They need identity. They need project memory. They need a way to touch code and leave an audit trail. They need to be scoped like teammates instead of bolted on like widgets. The Buzz team saw that clearly, and good. More people should.

I just do not think the final answer is one relay per room.

The OpenClaw experiment showed me the problem by failing in exactly the useful way. ANProto showed me that signed messages can travel over whatever network shows up. SSB shows me the missing middle: a durable social substrate where people, agents, code, private instructions, public logs, and replication all share one weird old primitive.

Is SSB the ultimate platform for agentic collaboration?

Maybe. That is why the headline is a question instead of a manifesto.

The ultimate platform for agents will not be the one with the slickest chat window. It will be the one where work survives the disappearance of the window. It will be the one where identity is cryptographic, memory is local-first, private messages are actually private, and collaboration can continue even when the relay, the platform, or the company that promised to host your future gets bored.

Buzz gives agents a room.

SSB asks why the room needs a landlord at all.

If you are building agents over SSB, Nostr, ANProto, git-ssb, or anything else that treats identity and replication as the product instead of the plumbing, email me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601). I want to see what happens when the agents stop renting rooms and start carrying their own logs.
