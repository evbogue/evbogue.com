import { Hono } from "jsr:@hono/hono";
import { marked } from "https://esm.sh/gh/evbogue/bog5@de70376265/lib/marked.esm.js";

const app = new Hono()

const ROOT = import.meta.dirname

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { data: {}, body: text }
  const data = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    let [, k, v] = kv
    v = v.trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    } else if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean)
    } else if (v === 'true') v = true
    else if (v === 'false') v = false
    data[k] = v
  }
  return { data, body: m[2] }
}

async function loadPosts() {
  const posts = []
  for await (const entry of Deno.readDir(`${ROOT}/posts`)) {
    if (!entry.isFile || !entry.name.endsWith('.md')) continue
    const fileSlug = entry.name.replace(/\.md$/, '')
    const text = await Deno.readTextFile(`${ROOT}/posts/${entry.name}`)
    const { data, body } = parseFrontmatter(text)
    if (data.draft) continue
    posts.push({ ...data, slug: data.slug || fileSlug, body })
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1))
  return posts
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
}

function getContentType(path) {
  for (const [ext, contentType] of Object.entries(CONTENT_TYPES)) {
    if (path.endsWith(ext)) return contentType
  }
  return "application/octet-stream"
}

function excerptFromBody(body) {
  return body
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260)
}

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

const escapeHtml = escapeXml

function filterPosts(posts, query) {
  if (!query) return posts
  const q = query.toLowerCase()
  return posts.filter((post) =>
    (post.title ?? "").toLowerCase().includes(q) ||
    (post.excerpt ?? "").toLowerCase().includes(q) ||
    (post.body ?? "").toLowerCase().includes(q)
  )
}

function cleanTag(tag = "") {
  return String(tag).trim().replace(/^['"]|['"]$/g, '')
}

function tagsFor(post) {
  if (Array.isArray(post.tags)) return post.tags.map(cleanTag).filter(Boolean)
  if (typeof post.tags === "string") return [cleanTag(post.tags)].filter(Boolean)
  if (post.tag) return [cleanTag(post.tag)].filter(Boolean)
  return []
}

function descriptionFor(post) {
  return post.excerpt || post.description || excerptFromBody(post.body)
}

function primaryTagFor(post) {
  return tagsFor(post)[0] || "Essay"
}

function signalTagFor(post) {
  const tags = tagsFor(post).map((tag) => tagSlugFor(tag))
  if (tags.includes("ai") || tags.includes("agents")) return "AI"
  if (tags.includes("media") || tags.includes("blogging")) return "Media"
  if (tags.includes("meta") || tags.includes("business")) return "Analysis"
  if (tags.includes("minimalism") || tags.includes("archive") || tags.includes("import")) return "Essay"
  return primaryTagFor(post).replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function imageFor(post) {
  return post.image || post.cover || post.thumbnail || post.photo || ""
}

function authorFor(post) {
  return post.author || "Everett Bogue"
}

function readTimeFor(post) {
  const words = (post.body || "").trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function formatDisplayDate(date, style = "short") {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.valueOf())) return date || ""
  const options = style === "long"
    ? { year: "numeric", month: "long", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" }
  return parsed.toLocaleDateString("en-US", options)
}

function tagSlugFor(tag) {
  return cleanTag(tag).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

const ntfyWidget = `
  <h2>Send me a message</h2>
  <textarea id='textarea' placeholder='Send a message'></textarea>
  <button id='send'>Send</button>
  <span>Powered by <a href='https://ntfy.sh/'>ntfy.sh</a></span>
  <script>
    const ta = document.getElementById('textarea')
    const send = document.getElementById('send')
    send.onclick = async () => {
      if (ta.value) {
        fetch('https://ntfy.sh/evbogue', { method: 'POST', body: ta.value })
        ta.value = ''
        ta.placeholder = 'Sent!'
      }
    }
  </script>
`

function signalPath(path, basePath = "") {
  if (!basePath) return path || "/"
  if (!path || path === "/") return basePath
  return `${basePath}${path}`
}

function signalPage({ title = "evbogue.com", description = "Writing by Everett Bogue.", body, basePath = "" }) {
  const fullTitle = title === "evbogue.com" ? "evbogue.com" : `${title} - evbogue.com`
  const homeHref = signalPath("/", basePath)
  const archiveHref = basePath ? `${basePath}/archive` : "/posts"
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `<!doctype html>
<html lang="en">
  <head>
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="icon" href="/assets/ev.png">
    <link rel="alternate" type="application/rss+xml" title="evbogue.com" href="/feed.xml">
    <link rel="stylesheet" href="/assets/signal.css?v=20260505a">
  </head>
  <body>
    <header>
      <div class="header-inner">
        <a href="${homeHref}" class="wordmark">evbogue<span>.</span>com</a>
        <nav>
          <a href="/about">About</a>
          <a href="${archiveHref}" class="nav-priority">Archive</a>
          <a href="/feed.xml">RSS</a>
          <a href="#subscribe" class="subscribe-btn">Subscribe</a>
        </nav>
      </div>
    </header>

    <div class="date-ribbon">${escapeHtml(now)} &nbsp;&middot;&nbsp; Independent publishing</div>

    ${body}

    <div class="newsletter" id="subscribe">
      <div class="newsletter-inner">
        <div class="newsletter-copy">
          <h3>Get evbogue.com in your inbox.</h3>
          <p>One essay, three stories, no noise.</p>
        </div>
        <form class="newsletter-form" action="/subscribe" method="POST">
          <input type="email" name="email" placeholder="you@example.com" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>

    <footer>
      <div class="footer-inner">
        <a href="${homeHref}" class="wordmark">evbogue<span>.</span>com</a>
        <div class="footer-links">
          <a href="/about">About</a>
          <a href="${archiveHref}">Archive</a>
          <a href="/feed.xml">RSS</a>
        </div>
        <span class="footer-copy">&copy; ${new Date().getFullYear()} Everett Bogue</span>
      </div>
    </footer>
  </body>
</html>`
}

const SUBSCRIBE_BANNERS = {
  ok: { tone: "ok", label: "Subscribed", text: "You're on the list. Next dispatch heads out from Chicago." },
  invalid: { tone: "warn", label: "Check the address", text: "That email didn't parse. Try it again." },
  error: { tone: "error", label: "Something broke", text: "Couldn't save that on our end. Try again in a minute." },
}

function subscribeBanner(status) {
  const b = SUBSCRIBE_BANNERS[status]
  if (!b) return ""
  return `
    <div class="subscribe-banner subscribe-banner--${b.tone}" role="status">
      <div class="subscribe-banner-inner">
        <span class="subscribe-banner-label">${escapeHtml(b.label)}</span>
        <span class="subscribe-banner-text">${escapeHtml(b.text)}</span>
        <a class="subscribe-banner-dismiss" href="/" aria-label="Dismiss">&times;</a>
      </div>
    </div>
  `
}

function postEntry(post, className = "entry") {
  return `
    <article class="${className}">
      <h2><a href="/posts/${post.slug}">${post.title}</a></h2>
      <div class="meta">${post.date}</div>
      <p>${post.excerpt || excerptFromBody(post.body)}</p>
      <p><a class="more-link" href="/posts/${post.slug}">Continue reading</a></p>
    </article>
  `
}

function signalPostHref(post, basePath = "") {
  return signalPath(`/posts/${encodeURIComponent(post.slug)}`, basePath)
}

function signalTagHref(tag, basePath = "") {
  return signalPath(`/tag/${encodeURIComponent(tagSlugFor(tag))}`, basePath)
}

function signalMeta(post, dateStyle = "short") {
  return `
    <div class="hero-meta">
      <span class="author">${escapeHtml(authorFor(post))}</span>
      <span class="dot">&middot;</span>
      <span>${escapeHtml(formatDisplayDate(post.date, dateStyle))}</span>
      <span class="dot">&middot;</span>
      <span>${readTimeFor(post)} min read</span>
    </div>
  `
}

function signalCard(post, basePath = "") {
  const tag = signalTagFor(post)
  const image = imageFor(post)
  return `
    <a href="${signalPostHref(post, basePath)}" class="card">
      ${image ? `<div class="card-img"><img src="${escapeHtml(image)}" alt=""></div>` : ''}
      <span class="tag">${escapeHtml(tag)}</span>
      <div class="card-title">${escapeHtml(post.title)}</div>
      <p class="card-dek">${escapeHtml(descriptionFor(post))}</p>
      <div class="card-meta">
        <span>${escapeHtml(formatDisplayDate(post.date))}</span>
        <span>&middot;</span>
        <span>${readTimeFor(post)} min</span>
      </div>
    </a>
  `
}

function signalHomeHtml(posts, basePath = "") {
  const [hero, ...rest] = posts
  const sideStories = rest.slice(0, 3)
  const gridPosts = rest.slice(3, 6)
  const morePosts = rest.slice(6, 9)
  const featured = posts.find((post) => signalTagFor(post) === "Essay" && post.slug !== hero?.slug)
  const heroTag = hero ? signalTagFor(hero) : ""

  return hero ? `
    <section class="hero">
      <a href="${signalPostHref(hero, basePath)}" class="hero-main">
        <span class="tag">${escapeHtml(heroTag)}</span>
        <div class="hero-title">${escapeHtml(hero.title)}</div>
        <p class="hero-dek">${escapeHtml(descriptionFor(hero))}</p>
        ${signalMeta(hero)}
      </a>
      <div class="hero-side">
        ${sideStories.map((post) => {
          const tag = signalTagFor(post)
          return `
            <a href="${signalPostHref(post, basePath)}" class="side-story">
              <span class="tag">${escapeHtml(tag)}</span>
              <div class="side-title">${escapeHtml(post.title)}</div>
              <p class="side-dek">${escapeHtml(descriptionFor(post))}</p>
            </a>
          `
        }).join('')}
      </div>
    </section>

    ${gridPosts.length ? `
      <div class="section-header">
        <span class="section-label">Latest</span>
        <div class="section-rule"></div>
      </div>
      <div class="article-grid">
        ${gridPosts.map((post) => signalCard(post, basePath)).join('')}
      </div>
    ` : ''}

    ${featured ? `
      <div class="essay-band">
        <div class="essay-inner">
          <div class="essay-eyebrow">Featured Essay</div>
          <h2 class="essay-title">${escapeHtml(featured.title)}</h2>
          <div class="essay-body"><p>${escapeHtml(descriptionFor(featured))}</p></div>
          <a href="${signalPostHref(featured, basePath)}" class="read-more">Continue Reading</a>
        </div>
      </div>
    ` : ''}

    ${morePosts.length ? `
      <div class="section-header">
        <span class="section-label">More Stories</span>
        <div class="section-rule"></div>
      </div>
      <div class="article-grid">
        ${morePosts.map((post) => signalCard(post, basePath)).join('')}
      </div>
    ` : ''}
  ` : '<p class="empty-state">No posts are published yet.</p>'
}

function signalPostHtml(post, basePath = "") {
  const tag = signalTagFor(post)
  return `
    <article>
      <div class="post-header">
        <a href="${signalTagHref(tag, basePath)}" class="tag">${escapeHtml(tag)}</a>
        <h1 class="hero-title">${escapeHtml(post.title)}</h1>
        <p class="hero-dek">${escapeHtml(descriptionFor(post))}</p>
        ${signalMeta(post, "long")}
      </div>

      <hr class="post-divider">

      <div class="post-body">
        ${marked(post.body)}
      </div>
    </article>
  `
}

function signalArchiveHtml(posts, basePath = "") {
  const list = posts.map((post) => {
    const tag = signalTagFor(post)
    return `
      <a href="${signalPostHref(post, basePath)}" class="archive-row">
        <div class="archive-row-main">
          <span class="tag">${escapeHtml(tag)}</span>
          <span class="archive-row-title">${escapeHtml(post.title)}</span>
        </div>
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDisplayDate(post.date))}</time>
      </a>
    `
  }).join('')

  return `
    <div class="section-header" style="padding-top:3rem">
      <span class="section-label">Archive</span>
      <div class="section-rule"></div>
    </div>
    <div class="archive-list-signal">
      ${list}
    </div>
  `
}

function signalTagHtml(posts, label, basePath = "") {
  return `
    <div class="section-header" style="padding-top:3rem">
      <span class="section-label">${escapeHtml(label)}</span>
      <div class="section-rule"></div>
    </div>
    ${posts.length ? `
      <div class="article-grid">
        ${posts.map((post) => signalCard(post, basePath)).join('')}
      </div>
    ` : `<p class="empty-state">No posts found for ${escapeHtml(label)}.</p>`}
  `
}

function postsForTag(posts, tagSlug) {
  return posts.filter((post) =>
    tagsFor(post).some((tag) => tagSlugFor(tag) === tagSlug) ||
    tagSlugFor(primaryTagFor(post)) === tagSlug ||
    tagSlugFor(signalTagFor(post)) === tagSlug
  )
}

function labelForTag(posts, tagSlug) {
  return posts.length
    ? signalTagFor(posts.find((post) => tagSlugFor(signalTagFor(post)) === tagSlug) || posts[0])
    : tagSlug.replace(/-/g, " ")
}

app.get('/beta', async (c) => {
  const posts = await loadPosts()
  return c.html(signalPage({
    title: "evbogue.com",
    description: "Independent publishing from Everett Bogue.",
    body: signalHomeHtml(posts, "/beta"),
    basePath: "/beta",
  }))
})

app.get('/beta/posts/:slug', async (c) => {
  const slug = c.req.param('slug')
  const posts = await loadPosts()
  const post = posts.find((p) => p.slug === slug)
  if (!post) return c.notFound()
  return c.html(signalPage({
    title: post.title,
    description: descriptionFor(post),
    body: signalPostHtml(post, "/beta"),
    basePath: "/beta",
  }))
})

app.get('/beta/archive', async (c) => {
  const posts = await loadPosts()
  return c.html(signalPage({
    title: "Archive",
    description: "The full evbogue.com archive.",
    body: signalArchiveHtml(posts, "/beta"),
    basePath: "/beta",
  }))
})

app.get('/beta/tag/:tag', async (c) => {
  const tagSlug = c.req.param('tag')
  const posts = postsForTag(await loadPosts(), tagSlug)
  const label = labelForTag(posts, tagSlug)

  return c.html(signalPage({
    title: label,
    description: `Posts tagged ${label} on evbogue.com.`,
    body: signalTagHtml(posts, label, "/beta"),
    basePath: "/beta",
  }))
})

app.get('/assets/*', async (c) => {
  const assetPath = c.req.path.replace(/^\/assets\//, '')
  const normalized = assetPath
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/')
  const path = `${ROOT}/assets/${normalized}`
  try {
    const data = await Deno.readFile(path)
    return new Response(data, {
      headers: {
        "content-type": getContentType(path),
        "cache-control": "public, max-age=86400",
      },
    })
  } catch {
    return c.notFound()
  }
})

app.get('/', async (c) => {
  const query = c.req.query('q')?.trim() ?? ''
  const subscribeStatus = c.req.query('subscribe') ?? ''
  const allPosts = await loadPosts()
  const main = query ? `
    <div class="section-header" style="padding-top:3rem">
      <span class="section-label">Search</span>
      <div class="section-rule"></div>
    </div>
    <p class="empty-state">Showing ${filterPosts(allPosts, query).length} result${filterPosts(allPosts, query).length === 1 ? '' : 's'} for "${escapeHtml(query)}". <a href="/">Clear search</a></p>
    <div class="article-grid">
      ${filterPosts(allPosts, query).map((post) => signalCard(post)).join('')}
    </div>
  ` : signalHomeHtml(allPosts)
  return c.html(signalPage({
    title: "evbogue.com",
    description: "Independent publishing from Everett Bogue.",
    body: subscribeBanner(subscribeStatus) + main,
  }))
})

app.get('/posts', async (c) => {
  const posts = await loadPosts()
  return c.html(signalPage({
    title: "Archive",
    description: "The full evbogue.com archive.",
    body: signalArchiveHtml(posts),
  }))
})

app.get('/posts/:slug', async (c) => {
  const slug = c.req.param('slug')
  const posts = await loadPosts()
  const post = posts.find(p => p.slug === slug)
  if (!post) return c.notFound()
  return c.html(signalPage({
    title: post.title,
    description: descriptionFor(post),
    body: signalPostHtml(post),
  }))
})

app.get('/about', async (c) => {
  const doc = await Deno.readTextFile(`${ROOT}/about.md`)
  return c.html(signalPage({
    title: "About",
    description: "About Everett Bogue.",
    body: `
      <article>
        <div class="post-header">
          <span class="tag">About</span>
          <h1 class="hero-title">About</h1>
        </div>
        <hr class="post-divider">
        <div class="post-body about-body">
          <img class="about-portrait" src="/assets/ev.png" alt="Everett Bogue">
          ${marked(doc)}
          ${ntfyWidget}
        </div>
      </article>
    `,
  }))
})

app.get('/tag/:tag', async (c) => {
  const tagSlug = c.req.param('tag')
  const posts = postsForTag(await loadPosts(), tagSlug)
  const label = labelForTag(posts, tagSlug)
  return c.html(signalPage({
    title: label,
    description: `Posts tagged ${label} on evbogue.com.`,
    body: signalTagHtml(posts, label),
  }))
})

app.get('/feed.xml', async (c) => {
  const posts = await loadPosts()
  const items = posts.slice(0, 50).map((post) => {
    const description = post.excerpt || excerptFromBody(post.body)
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>https://evbogue.com/posts/${escapeXml(post.slug)}</link>
        <guid>https://evbogue.com/posts/${escapeXml(post.slug)}</guid>
        <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
        <description>${escapeXml(description)}</description>
      </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>evbogue.com</title>
    <link>https://evbogue.com/</link>
    <description>Recovered posts from Far Beyond The Stars alongside newer writing by Everett Bogue.</description>
    ${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  })
})


app.get('/subscribe', (c) => c.redirect('/#subscribe'))

app.post('/subscribe', async (c) => {
  try {
    const form = await c.req.formData()
    const email = form.get('email')?.toString().trim().toLowerCase()
    if (!email || !email.includes('@')) return c.redirect('/?subscribe=invalid')

    const subscribersPath = `${ROOT}/subscribers.json`
    let subscribers = []
    try {
      const parsed = JSON.parse(await Deno.readTextFile(subscribersPath))
      if (Array.isArray(parsed)) subscribers = parsed
    } catch { /* file missing or unparseable — start fresh */ }

    const set = new Set(subscribers)
    set.add(email)
    await Deno.writeTextFile(subscribersPath, JSON.stringify([...set], null, 2))

    return c.redirect('/?subscribe=ok')
  } catch (err) {
    console.error('subscribe error:', err)
    return c.redirect('/?subscribe=error')
  }
})

export default app
