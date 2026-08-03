I have been publishing on the web since 1999. The names and the tools change every few years. The instinct never does.

The question underneath all of it is small and stubborn: can you publish what you make, and reach the people who want it, without asking anyone for permission? Everything below is one long answer to that question, worked out in public, oldest to newest.

I started on a free journal host as a teenager. I spent my twenties inside legacy media learning how the machine actually worked. Then I walked out to do it myself, and I have been building the tools to make that possible ever since.

## Where it started

Born in Chicago, I spent my twenties in New York media, then most of a decade bouncing between the Bay Area and Mexico City before coming home to Chicago. But the publishing started before any of the jobs did.

**LiveJournal and catharsis.org** (1999). I started publishing online in 1999 — as `evbogue` on LiveJournal, and on catharsis.org — back when a personal site was something you hand-coded and a public journal was something you kept before anyone thought to call it blogging. Nobody gave me a column. I just started writing on the open web. That reflex never left.

**NYU** — journalism and dance. I studied journalism at NYU, which meant learning the craft the formal way at exactly the moment the web was quietly making the formal way optional.

**Gawker and New York Magazine.** Then I went inside the machine. I interned at **Gawker** in the middle of the blog era that rewired media, and I was a **photo editor at New York Magazine**. I learned how a real newsroom decides what a story looks like, what a picture is worth, and who gets to hit publish. It was a great education in exactly the gatekeeping I would spend the next fifteen years routing around.

## The writing

In 2009 I left corporate media to publish for myself, and I have not been on a masthead since. Before I wrote a line of protocol code I was a blogger, and the discipline is the one I still run on: publish directly, own the archive, keep the stack small, and let the writing do the damage.

**Far Beyond The Stars** (2009–2011). The minimalism blog I wrote when blogs still felt like they could change your life. I lived out of a bag, wrote every day, and grew an audience without a publisher, a platform deal, or anyone's permission. Most of that work is recovered and living in the [archive](/posts) here.

**The Art of Being Minimalist** and **Minimalist Business**. Ebooks I wrote and sold directly to readers, back when "sell your own work to your own list" was still a strange idea. The lesson stuck harder than the products did: the list is the asset, and the list should belong to you.

**evbogue.com**. This site — the current desk. Deno and Hono, markdown files on disk, an [RSS feed](/feed.xml), and [a subscriber list that is literally a JSON file](/posts/my-subscriber-list-is-a-json-file). No CMS, no build step, nothing between me and publishing. It is the minimalism argument compiled into a stack. More on how it runs on the [about page](/about).

## The network

Somewhere along the way I stopped trusting the platforms I was publishing on and started building the ones underneath. Same instinct — own the thing, depend on no one — pointed one layer down, at the network itself.

**Decent** (2016). I forked Patchbay into Decent, a client for [Secure Scuttlebutt](https://scuttlebutt.nz) — the peer-to-peer protocol where your feed lives on your own computer and messages gossip between friends with no central server in the middle. It was the first time "own your presence" meant owning the transport, not just the writing.

**Bogbook** (2020–2024). After I walked away from building Scuttlebutt clients, I spent four years building my own protocol from scratch, and getting it wrong three times on purpose. Version one had no replication strategy, like Nostr, and I couldn't tell peers which posts I actually wanted. Version two used an append-only log, like SSB, and the initial sync was miserable. Version three hung the hash of your previous post on every message, so clients could sync backwards from the latest post until they hit something they already had — fast, and finally usable. Each version was one more thing removed. Bogbook was the laboratory. It was also a terrible name for marketing materials.

**Secure-Scuttlebot Classic** ([ssbc](https://github.com/evbogue/ssbc)). The original Scuttlebutt project was discontinued in 2024, so I came back to it. I maintain the classic-functionality restoration, which makes me the current maintainer of git-ssb — hosting git repositories over SSB, no GitHub required. Try it at [decent.evbogue.com](https://decent.evbogue.com/) or the Bluesky-style skin at [ssbski.evbogue.com](https://ssbski.evbogue.com/). Maintaining the heavy thing and designing the light thing at the same time is how I know which parts were load-bearing.

**ANProto** ([anproto.com](https://anproto.com)). Bogbook taught me that every version I shipped had smuggled the network into the message format. The backward hash chain was still a replication strategy baked into the data. So I removed that too. ANProto — the **A**uthenticated and **N**on-networked protocol — is just an ed25519 signature over a timestamp and a content hash, encoded in base64. That is the whole primitive. No log, no chain, no ordering, no opinion about how the message reaches you: URL bar, email, USB stick, Bluetooth, LoRa, or slingshot across a river. Bring your own network. Because there is almost nothing to implement, there are implementations in JavaScript, Go, Rust, and Python. It is Bogbook with the last assumption stripped out, wearing a better name.

**apds** ([apds.anproto.com](https://apds.anproto.com/)). A personal data server for ANProto — a small always-on box that stores and relays your signed messages and wakes your clients with web push when something new arrives. The optional convenience layer for people who want one, not a dependency for people who don't.

**Wiredove** ([wiredove.net](https://wiredove.net/)). The flagship client. A distributed social app that runs entirely in a browser window, built on ANProto for authentication, apds for distribution, and WebRTC for serverless peer-to-peer collaboration. Local-first, no installation, no account to be deleted. This is what the whole stack is for.

## Why these are all the same project

Minimalism was never really about owning fewer things. It was about not being owned — by stuff, by a landlord, by a job, by a platform that can change its terms overnight and take your audience with it. The method was always the same: remove everything that isn't load-bearing, then remove one more thing.

That is exactly how ANProto happened. Scuttlebutt, then Bogbook v1, v2, v3, then ANProto — every step threw out a piece of the network that turned out to be optional, until the only thing left was a signed timestamped hash. It's the 100-things list applied to a protocol. Own less so nothing can own you.

Decentralization is that same argument, run on the network instead of the closet. Own your words. Own your list. Own your feed. Own the protocol underneath the feed. Keep the stack small enough that one person can hold the whole thing in their head and nobody upstream can switch it off.

Since 1999, one refusal to ask permission. The names keep changing because the platforms keep failing. The kid posting to LiveJournal, the photo editor at a magazine, and the person designing a protocol that runs off a USB stick are all doing the same thing. The work is the same work.

If you want to build git over ANProto, argue with me about any of this, or just say hello — [ev@evbogue.com](mailto:ev@evbogue.com) or [773-510-8601](tel:7735108601).
