---
title: "I Maintain git-ssb. I Still Push to GitHub."
slug: i-maintain-git-ssb-i-still-push-to-github
date: 2026-05-13
tags: [git, decentralized, ai, anproto, scuttlebutt]
excerpt: "Forgejo is GitHub at home. The interesting question is whether git itself wants to be decentralized, and I owe my own protocol a git remote."
---

Yesterday Hacker News spent 432 points cheering for a post called "Leaving GitHub for Forgejo." The post is reasonable. Forgejo is a soft fork of Gitea, runs on a box you own, and the URL bar finally stops shouting somebody else's domain at you when you open your own repos. After fifteen years of letting Microsoft hold the issue tracker, the source, the CI, the discussions, the releases, the wiki, the project board, and the package registry for half the open source you depend on, moving to a self-hosted forge is the obvious move.

I have not done it.

The repo where I am writing this post is on GitHub. The [scuttlebutt code I maintain](https://github.com/evbogue/ssbc) is on GitHub. The protocol I designed to be impossible to host on GitHub's assumptions is, of course, also on GitHub. So is most of the rest of the decentralized infrastructure crowd. We cheerlead the rivers and ship over the highway.

This is the part of the post where I am supposed to make a clean declaration that I am leaving. I am not going to. That kind of post has become a genre of fiction. The honest piece is the one where I admit which network I actually push to, and then talk about why even Forgejo is not the move I am most interested in.

Forgejo is GitHub at home. That is the literal shape of it: take the centralized forge pattern, move the binary onto a server you rent, point a domain at it, and keep going. The platform risk goes away. Microsoft cannot delete your account. The terms of service cannot rewrite themselves overnight. Those are real wins, and if you maintain a serious project and have not done this, you probably should.

But the network shape has not changed. The repo still lives on one box. The box has one DNS name. The DNS name has one registrar. If your machine is offline, your repo is offline. If your country routes packets through an inconvenient cable, your repo is in an inconvenient cable. Self-hosting solves the platform-risk problem and reintroduces the single-point-of-failure problem as a feature.

The more interesting work is happening one layer down, where people are asking whether git itself wants to be federated.

[Tangled.sh](https://tangled.sh) is the most polished version of this question, and it is worth being specific about what tangled actually is. Tangled is an atproto AppView. The git servers it federates, called "knots," are self-hostable, and that part is real. The identity, follows, stars, and the pull-request-as-record social layer all ride on atproto, which means they ride on Bluesky's infrastructure. The DIDs that name tangled users resolve through plc.directory, which Bluesky Social PBC operates. There are over twelve million atproto identities in that directory and as far as I know nobody runs an alternative one in practice. The firehose that lets tangled discover repos and surface activity comes through Bluesky's relay, which Bluesky also operates. The login flow is the same OAuth flow you would use to post a skeet. Tangled is a clever git frontend calling Bluesky's APIs. If Bluesky shuts off plc.directory tomorrow, every tangled user is recoverable in theory and stranded in practice.

That is not the same shape of decentralization git-ssb was reaching for.

Git-ssb runs on top of secure-scuttlebutt, which has no central directory at all. Identity in SSB is an ed25519 keypair. The pubkey is the address. There is no plc.directory to resolve it through, because nothing needs to resolve it. Discovery is social: you follow someone, your peer pulls their feed and the feeds they follow, and the network grows outward through your friends-of-friends graph. Every peer stores the slice of the network it cares about. Pubs exist as well-connected bootstrap nodes, but no pub is required, and the protocol works over a LAN, a mesh, or a USB drive carried between laptops. You could clone a repo from someone you were on the same WiFi with. You could leave a comment that propagated through three pubs and a basement. The original scuttlebutt project was discontinued in 2024. I maintain the classic functionality restoration at [evbogue/ssbc](https://github.com/evbogue/ssbc), which makes me the current maintainer of git-ssb. I push that maintenance to GitHub.

Tangled federates by calling somebody else's API. Git-ssb decentralizes because every peer is the directory. The first one assumes the infrastructure stays up. The second one assumes nothing.

The protocol I designed for everything else, [ANProto](https://anproto.com), was written around one assumption: do not embed a network. The full name is "Authenticated and Non-networked protocol." A message is an ed25519 signature over a timestamp and a content hash, encoded in base64. That is the whole primitive. The protocol has nothing to say about how the message reaches you. The site recommends "URL bar, email, USB stick, Bluetooth, LoRa, or local wifi sync." It encourages you to slingshot the bytes over a river if that is what you have. Implementations exist in JavaScript, Go, Rust, and Python. The flagship client is wiredove. There is a chat app, a personal data server, a retro twitter clone, a tiny editable blog, and a bridge to atproto. There is not, yet, git.

There should be.

Git is already a content-addressable object store with signed refs. The hard parts of decentralization are mostly done inside the format itself: every object is identified by its hash, every commit chains to its parent, every signature is verifiable from local data. What git lacks is a way to say "here is this pack, signed by me, dated this minute, take it however you can get it." A git remote that spoke ANProto would publish refs and packs as signed timestamped messages and let replication happen over whatever transport was in the room. WebSocket. WebPush. WebRTC. A file dropped in an email. A USB drive handed across a table. The pack does not care.

The result would be a forge that does not assume you have the internet. The internet is mostly an internet right now. It will not always be. There are places this month where the internet is intermittent, expensive, surveilled, or actively hostile. A forge that can move source over the network you actually have, instead of the one the platform assumes you have, is a different kind of artifact than Forgejo on a VPS in Frankfurt.

I have not written this. I am writing this post instead, which is a confession in the shape of a roadmap.

The honest version of the Hacker News story is not "leave GitHub." It is "notice which assumptions about networks your forge is making, and decide whether those assumptions still match the world you want to publish in." Forgejo is a good answer to "Microsoft might be a bad landlord." Tangled is a good answer to "the social graph around source should be portable." git-ssb was a good answer to "code should propagate the way gossip propagates." ANProto-flavored git would be a good answer to "the network might not be there."

I run my newsletter as [a JSON file](/posts/my-subscriber-list-is-a-json-file). I write this blog with an agentic harness that produces code on my behalf while I supply the judgment. The leverage to actually build the missing piece, instead of writing about people who built adjacent pieces, has never been higher. The bottleneck is taste, not typing.

So I am not announcing that I am leaving GitHub. I am announcing that the move worth making is not the one Hacker News is currently celebrating, and that I owe my own protocol a git remote.

If you have built git over atproto, git over ssb, git over Nostr, or git over anything that does not assume DNS, email me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601). If you want to help build a git remote that speaks ANProto, same address.

I will push the first commit to GitHub. We have to start somewhere.
