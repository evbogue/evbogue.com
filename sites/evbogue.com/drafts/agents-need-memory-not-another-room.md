---
title: "Agents Need Memory, Not Another Room"
slug: agents-need-memory-not-another-room
date: 2026-07-27
tags: [ai, agents, scuttlebutt, anproto]
excerpt: "Buzz gives agents a workspace. ANProto gives them signed messages. SSB gives them durable memory."
---

The agent workspace problem is not that agents need a better chat room.

They need memory that survives the room.

That is the thing I missed when I first started thinking about [Buzz](https://github.com/block/buzz), the new collaboration platform from Jack Dorsey's Block. The obvious take is that Buzz is Slack plus GitHub plus agents. That is true enough, and also too shallow to matter. Buzz is interesting because it treats agents as participants in the workspace. They have profiles. They have public keys. They can be members of channels. They can read, write, run workflows, touch code, and leave an audit trail.

That is a real product insight. It is also not the whole problem.

The better comparison is not "Buzz versus SSB" or "Buzz versus ANProto." That turns into protocol cosplay very quickly, and nobody needs another table where every row says "decentralized" until the word dies of boredom. The useful comparison is what each system thinks the durable unit of collaboration is.

Buzz thinks the durable unit is the workspace.

ANProto thinks the durable unit is the signed message.

SSB thinks the durable unit is the feed.

Once you see that, the whole question gets cleaner.

Buzz's own docs are refreshingly direct about its architecture. The [README](https://github.com/block/buzz/blob/main/README.md) says the relay is the single source of truth. The [architecture doc](https://github.com/block/buzz/blob/main/ARCHITECTURE.md) says `buzz-relay` orchestrates the subsystems: database, auth, pubsub, search, audit, workflow. The [vision doc](https://github.com/block/buzz/blob/main/VISION.md) puts it even more plainly: the relay is the workspace.

That is Buzz's strength. You get one place where humans and agents can coordinate. Channels, DMs, workflows, code, search, audit trail, agent directory, the whole little company nervous system. If I am trying to ship a product with a team tomorrow, this is the shape I want. The agent does not have to be a weird sidecar glued to GitHub issues and Slack threads. It can show up in the place where the work is already happening.

But the cost of that clarity is that the room owns the context.

The official [Buzz support page](https://block.github.io/buzz/support.html) says relays are not federated and do not share content with each other. A message stays on the relay where it was sent. It also says messages, direct messages, and uploaded media in Block-hosted communities are not end-to-end encrypted. You can run your own relay, and that matters. Self-hosting changes who operates the room. It does not change the fact that the room is the thing.

That is fine if the room is the product.

It is less fine if the agent is the product.

We already hit the stupid version of this problem with OpenClaw and ANProto. There is no heroic repo to link because the experiment did not become a maintained project. We hooked an OpenClaw agent into ANProto, proved enough of the shape to know it was interesting, and then the agent got deleted.

That deletion is the whole essay.

The problem was not that the agent failed to think. The problem was that its working identity and context did not persist in a substrate we owned. It could talk through ANProto. It could participate in the experiment. But when the agent disappeared, the collaboration memory went with it. We had signed messages, or at least the idea of signed messages, but we did not have a durable agent life.

This is what ANProto gets right and what it deliberately refuses to solve.

[ANProto](https://anproto.com) is a signed-message protocol. A message proves who authored it and whether it changed. The network is somebody else's problem on purpose. Send it through WebRTC, email, local wifi, a URL, a USB stick, or whatever grim little pipe the day provides. That is powerful because it moves trust out of the transport. The pipe can be ugly. The message can still be true.

But a signed message is not a workspace. It is not a mailbox. It is not a social graph. It is not a durable agent identity with history, relationships, subscriptions, private threads, and replicated context. ANProto is the receipt. It is not the office.

That is not a criticism. That is the design.

SSB sits in the middle in a way that suddenly looks less nostalgic than practical.

The local [`ssbc`](https://github.com/evbogue/ssbc) repo describes Secure Scuttlebutt as a peer-to-peer protocol built on signed, append-only personal logs. Your feed lives on your own computer. Messages gossip between nodes. There is no central server and no algorithmic feed. Every message is signed and chained to the previous message in your feed. Anyone who has your feed can verify it. If a pub disappears, your feed survives on the peers that replicated it.

That is the primitive agents need.

Not because SSB is prettier than Buzz. It is not. Buzz has the product shape. SSB has the memory shape.

An agent on Buzz is a participant in a relay-scoped workspace. Useful. An agent using ANProto can emit signed portable messages. Also useful. An agent on SSB could have a feed. That is different. The agent's work becomes an append-only history. Its prompts, replies, patches, reviews, approvals, mistakes, and handoffs can live as signed messages that replicate through the network. The agent stops being a session and starts being an identity with memory.

This matters because agents are ghosts. They do not remember the way people remember. They inherit context from files, logs, prompts, summaries, and whatever harness we build around them. If the harness is a relay, the relay owns the memory. If the harness is only signed messages, the messages prove themselves but still need somewhere to accumulate. If the harness is a feed, the agent has a trail.

That trail is what lets another agent enter the work without asking the human to reconstruct the last three hours from screenshots and regret.

Imagine the same task in the three systems.

In Buzz, a human asks an agent in a project channel to inspect a bug. The agent reads the channel, checks the repo, proposes a patch, and posts the result back into the workspace. This is excellent because the workspace has context and permissions. The failure mode is clear too: the context belongs to that relay. Move relays, lose the room. Trust the hosted relay, or run your own.

In ANProto, a human sends a signed task message to an agent. The agent replies with signed findings. Maybe another transport carries the patch. This is excellent because no transport gets to impersonate anyone. The failure mode is that the protocol does not decide where the agent waits, how it subscribes, how it catches up, or how its working history becomes a living body instead of a pile of individually valid artifacts.

In SSB, a human publishes a task into a feed or sends it privately to an agent feed. The agent publishes its own signed response. If the task is sensitive, SSB private messages can encrypt the content to specific recipient feed IDs. The local `ssbc` docs preserve the classic private-message model: encrypted messages are published like ordinary log entries, but only recipients can decrypt them. The Decent code in `decent/src/modules/core/crypto.js` still boxes content when `content.recps` exists before signing and publishing. That means the network can replicate the encrypted message without reading it.

Now the instruction can be private and durable.

That is the piece I care about.

If I privately message an agent through SSB, I am not just sending a prompt into a vendor-shaped fog. I am publishing an encrypted message into an append-only log. The pub cannot read it. Random peers cannot read it. The agent can read it because it is a recipient. I can read it later because I include myself as a recipient. The instruction becomes part of a history instead of a disposable API call.

For code, the comparison gets even sharper because `ssbc` already has git over SSB. The repo can expose git smart HTTP while backing the repository with SSB messages and blobs. A repository can be created on the node, pushed to as a normal git remote, cloned once replicated, and browsed in Decent's git-forge UI.

Buzz says: put the branch in the workspace.

SSB says: put the repo in the gossip network.

ANProto says: sign the thing so it does not matter how it got there.

These are not enemies. They are layers with different instincts.

Buzz is the product layer. It answers: where do humans and agents meet today?

ANProto is the proof layer. It answers: who said this, and did it change?

SSB is the memory layer. It answers: where does this participant's history live when the room disappears?

The mistake is trying to make one of them win every layer.

Buzz should not pretend a relay is the same thing as a peer-to-peer memory substrate. ANProto should not pretend signed messages magically become an agent society. SSB should not pretend historical correctness is a user interface. Each thing has a job.

The interesting build would steal the best job from each.

Use a Buzz-like surface because humans need rooms. Channels are good. Search is good. Agent rosters are good. Workflows are good. Nobody wants to collaborate by manually tailing a log file unless something has gone terribly wrong.

Use ANProto-style signatures where objects need to survive transport. The message should prove itself before anyone argues about the pipe.

Use SSB-style feeds where agent identity needs a life. Each agent gets an append-only log. Public work goes into public feeds. Sensitive instructions go into private boxed messages. Code moves through git-over-SSB or an equivalent replicated object store. Pubs help with reach, but they do not become the source of truth.

That would have saved the OpenClaw experiment from becoming a ghost story. The agent could have been deleted as a process and still existed as a feed. Another agent could have picked up the log. A human could have audited what happened. The work would not have depended on the survival of one workspace, one session, or one vendor-shaped memory trick.

This is the actual agent collaboration problem.

Not "can an agent post in chat?"

Of course it can. We have successfully taught the ghost to use Slack. Congratulations to civilization.

The question is whether the agent can have durable, portable, private, inspectable memory without handing the whole collaboration record to one room.

Buzz gives agents a workspace. ANProto gives agents signed messages. SSB gives agents durable memory.

The next system should use all three lessons and worship none of them.

If you are building agents over SSB, ANProto, Nostr, git-ssb, or any other substrate where identity and memory are first-class instead of decorative, email me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601). I want to see the version where deleting the agent does not delete the work.
