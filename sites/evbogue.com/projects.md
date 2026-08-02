For twenty years I have been building the same thing under different names. The tools change every few years. The instinct never does.

The question underneath all of it is small and stubborn: can you publish what you make, and reach the people who want it, without asking a platform for permission? Everything below is one long answer to that question, worked out in public, oldest to newest.

I started in the blog era owning my own words. I am ending up in the decentralization era owning my own network. It turns out those were never two different projects.

## The writing

Before I wrote a line of protocol code, I was a blogger. The discipline is the same one I still run on: publish directly, own the archive, keep the stack small, and let the writing do the damage.

**Far Beyond The Stars** (2009–2011). The minimalism blog I wrote when blogs still felt like they could change your life. I lived out of a bag, wrote every day, and grew an audience without a publisher, a platform deal, or anyone's permission. Most of that work is recovered and living in the [archive](/posts) here.

**The Art of Being Minimalist** and **Minimalist Business**. Ebooks I wrote and sold directly to readers, back when "sell your own work to your own list" was still a strange idea. The lesson stuck harder than the products did: the list is the asset, and the list should belong to you.

**evbogue.com**. This site — the current desk. Deno and Hono, markdown files on disk, an [RSS feed](/feed.xml), and [a subscriber list that is literally a JSON file](/posts/my-subscriber-list-is-a-json-file). No CMS, no build step, nothing between me and publishing. It is the minimalism argument compiled into a stack. More on how it runs on the [about page](/about).

## The network

Somewhere along the way I stopped trusting the platforms I was publishing on and started building the ones underneath. Same instinct — own the thing, depend on no one — pointed one layer down, at the network itself.

**Decent** (2016). I forked Patchbay into Decent, a client for [Secure Scuttlebutt](https://scuttlebutt.nz) — the peer-to-peer protocol where your feed lives on your own computer and messages gossip between friends with no central server in the middle. It was the first time "own your presence" meant owning the transport, not just the writing.

**Secure-Scuttlebot Classic** ([ssbc](https://github.com/evbogue/ssbc)). The original Scuttlebutt project was discontinued in 2024. I maintain the classic-functionality restoration, which makes me the current maintainer of git-ssb — hosting git repositories over SSB, no GitHub required. You can try it at [decent.evbogue.com](https://decent.evbogue.com/) or the Bluesky-style skin at [ssbski.evbogue.com](https://ssbski.evbogue.com/).

**ANProto** ([anproto.com](https://anproto.com)). SSB taught me that the hard, unmaintainable part was the networking. So I designed a protocol that has none. ANProto — the **A**uthenticated and **N**on-networked protocol — is just an ed25519 signature over a timestamp and a content hash, encoded in base64. That is the whole primitive. It says nothing about how the message reaches you: URL bar, email, USB stick, Bluetooth, LoRa, or slingshot across a river. Bring your own network. There are implementations in JavaScript, Go, Rust, and Python.

**apds** ([apds.anproto.com](https://apds.anproto.com/)). A personal data server for ANProto — a small always-on box that stores and relays your signed messages and wakes your clients with web push when something new arrives. The optional convenience layer for people who want one, not a dependency for people who don't.

**Wiredove** ([wiredove.net](https://wiredove.net/)). The flagship client. A distributed social app that runs entirely in a browser window, built on ANProto for authentication, apds for distribution, and WebRTC for serverless peer-to-peer collaboration. Local-first, no installation, no account to be deleted. This is what the whole stack is for.

## Why these are all the same project

Minimalism was never really about owning fewer things. It was about not being owned — by stuff, by a landlord, by a job, by a platform that can change its terms overnight and take your audience with it.

Decentralization is that same argument, run on the network instead of the closet. Own your words. Own your list. Own your feed. Own the protocol underneath the feed. Keep the stack small enough that one person can hold the whole thing in their head and nobody upstream can switch it off.

Twenty years, one refusal to ask permission. The names keep changing because the platforms keep failing. The work is the same work.

If you want to build git over ANProto, argue with me about any of this, or just say hello — [ev@evbogue.com](mailto:ev@evbogue.com) or [773-510-8601](tel:7735108601).
