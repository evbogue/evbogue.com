import { Hono } from "jsr:@hono/hono";
import { marked } from "https://esm.sh/gh/evbogue/bog5@de70376265/lib/marked.esm.js";
import { excerptFromBody, loadPosts as readPosts } from "./lib/posts.js";
import { addSubscriber, confirmByToken, findByToken, unsubscribeByToken } from "./lib/subscribers.js";
import { sendAdminNotification, sendConfirmation } from "./lib/mailer.js";

const app = new Hono()

const ROOT = import.meta.dirname

async function loadPosts() {
  return readPosts(ROOT)
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

function signalPage({ title = "evbogue.com", description = "Writing by Everett Bogue.", body }) {
  const fullTitle = title === "evbogue.com" ? "evbogue.com" : `${title} - evbogue.com`
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
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
    <link rel="stylesheet" href="/assets/signal.css?v=20260505b">
  </head>
  <body>
    <header>
      <div class="header-inner">
        <a href="/" class="wordmark">evbogue<span>.</span>com</a>
        <nav>
          <a href="/about">About</a>
          <a href="/posts" class="nav-priority">Archive</a>
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
        <a href="/" class="wordmark">evbogue<span>.</span>com</a>
        <div class="footer-links">
          <a href="/about">About</a>
          <a href="/posts">Archive</a>
          <a href="/feed.xml">RSS</a>
        </div>
        <span class="footer-copy">&copy; ${new Date().getFullYear()} Everett Bogue</span>
      </div>
    </footer>
  </body>
</html>`
}

const SUBSCRIBE_BANNERS = {
  new: { tone: "ok", label: "Check your inbox", text: "Click the confirmation link to start receiving dispatches." },
  pending: { tone: "ok", label: "We resent it", text: "Still waiting on confirmation — a fresh link is on its way." },
  resubscribed: { tone: "ok", label: "Welcome back", text: "Confirm the link in your inbox to reactivate." },
  existing: { tone: "ok", label: "Already on the list", text: "You're already subscribed. Nothing to do." },
  invalid: { tone: "warn", label: "Check the address", text: "That email didn't parse. Try it again." },
  error: { tone: "error", label: "Something broke", text: "Couldn't save that on our end. Try again in a minute." },
  unsubscribed: { tone: "ok", label: "Unsubscribed", text: "You're off the list. No hard feelings." },
  confirmed: { tone: "ok", label: "Confirmed", text: "You're on the list for real now. Next dispatch heads out from Chicago." },
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

function signalPostHref(post) {
  return `/posts/${encodeURIComponent(post.slug)}`
}

function signalTagHref(tag) {
  return `/tag/${encodeURIComponent(tagSlugFor(tag))}`
}

function signalMeta(post, { className = "", dateStyle = "short" } = {}) {
  const classes = ["story-meta", className].filter(Boolean).join(" ")

  return `
    <div class="${escapeHtml(classes)}">
      <span class="author">${escapeHtml(authorFor(post))}</span>
      <span class="dot">&middot;</span>
      <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDisplayDate(post.date, dateStyle))}</time>
      <span class="dot">&middot;</span>
      <span>${readTimeFor(post)} min read</span>
    </div>
  `
}

function signalCard(post) {
  const tag = signalTagFor(post)
  const image = imageFor(post)
  return `
    <a href="${signalPostHref(post)}" class="card">
      ${image ? `<div class="card-img"><img src="${escapeHtml(image)}" alt=""></div>` : ''}
      <span class="tag">${escapeHtml(tag)}</span>
      <div class="card-title">${escapeHtml(post.title)}</div>
      <p class="card-dek">${escapeHtml(descriptionFor(post))}</p>
      ${signalMeta(post, { className: "card-meta" })}
    </a>
  `
}

function signalHomeHtml(posts) {
  const [hero, ...rest] = posts
  const sideStories = rest.slice(0, 3)
  const gridPosts = rest.slice(3, 6)
  const morePosts = rest.slice(6, 9)
  const featured = posts.find((post) => signalTagFor(post) === "Essay" && post.slug !== hero?.slug)
  const heroTag = hero ? signalTagFor(hero) : ""

  return hero ? `
    <section class="hero">
      <a href="${signalPostHref(hero)}" class="hero-main">
        <span class="tag">${escapeHtml(heroTag)}</span>
        <div class="hero-title">${escapeHtml(hero.title)}</div>
        <p class="hero-dek">${escapeHtml(descriptionFor(hero))}</p>
        ${signalMeta(hero, { className: "hero-meta" })}
      </a>
      <div class="hero-side">
        ${sideStories.map((post) => {
          const tag = signalTagFor(post)
          return `
            <a href="${signalPostHref(post)}" class="side-story">
              <span class="tag">${escapeHtml(tag)}</span>
              <div class="side-title">${escapeHtml(post.title)}</div>
              <p class="side-dek">${escapeHtml(descriptionFor(post))}</p>
              ${signalMeta(post, { className: "side-meta" })}
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
        ${gridPosts.map((post) => signalCard(post)).join('')}
      </div>
    ` : ''}

    ${featured ? `
      <div class="essay-band">
        <div class="essay-inner">
          <div class="essay-eyebrow">Featured Essay</div>
          <h2 class="essay-title">${escapeHtml(featured.title)}</h2>
          <div class="essay-body"><p>${escapeHtml(descriptionFor(featured))}</p></div>
          <a href="${signalPostHref(featured)}" class="read-more">Continue Reading</a>
        </div>
      </div>
    ` : ''}

    ${morePosts.length ? `
      <div class="section-header">
        <span class="section-label">More Stories</span>
        <div class="section-rule"></div>
      </div>
      <div class="article-grid">
        ${morePosts.map((post) => signalCard(post)).join('')}
      </div>
    ` : ''}
  ` : '<p class="empty-state">No posts are published yet.</p>'
}

function signalPostHtml(post) {
  const tag = signalTagFor(post)
  return `
    <article>
      <div class="post-header">
        <a href="${signalTagHref(tag)}" class="tag">${escapeHtml(tag)}</a>
        <h1 class="hero-title">${escapeHtml(post.title)}</h1>
        <p class="hero-dek">${escapeHtml(descriptionFor(post))}</p>
        ${signalMeta(post, { className: "hero-meta", dateStyle: "long" })}
      </div>

      <hr class="post-divider">

      <div class="post-body">
        ${marked(post.body)}
      </div>
    </article>
  `
}

function signalArchiveHtml(posts) {
  const list = posts.map((post) => {
    const tag = signalTagFor(post)
    return `
      <a href="${signalPostHref(post)}" class="archive-row">
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

function signalTagHtml(posts, label) {
  return `
    <div class="section-header" style="padding-top:3rem">
      <span class="section-label">${escapeHtml(label)}</span>
      <div class="section-rule"></div>
    </div>
    ${posts.length ? `
      <div class="article-grid">
        ${posts.map((post) => signalCard(post)).join('')}
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
  const searchResults = query ? filterPosts(allPosts, query) : []
  const main = query ? `
    <div class="section-header" style="padding-top:3rem">
      <span class="section-label">Search</span>
      <div class="section-rule"></div>
    </div>
    <p class="empty-state">Showing ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${escapeHtml(query)}". <a href="/">Clear search</a></p>
    <div class="article-grid">
      ${searchResults.map((post) => signalCard(post)).join('')}
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
    const email = form.get('email')?.toString() ?? ''
    const result = await addSubscriber(ROOT, email)
    if (!result) return c.redirect('/?subscribe=invalid', 303)
    if (result.status === 'new' || result.status === 'pending' || result.status === 'resubscribed') {
      sendConfirmation(result.entry).catch((err) => {
        console.error('confirmation send failed:', err)
      })
    }
    if (result.status === 'new' || result.status === 'resubscribed') {
      sendAdminNotification(result.status, result.entry).catch((err) => {
        console.error('admin notification failed:', err)
      })
    }
    return c.redirect(`/?subscribe=${result.status}`, 303)
  } catch (err) {
    console.error('subscribe error:', err)
    return c.redirect('/?subscribe=error', 303)
  }
})

function unsubscribePage({ heading, message, confirmToken }) {
  const form = confirmToken
    ? `
      <form method="POST" action="/unsubscribe" class="newsletter-form" style="margin-top:1.5rem">
        <input type="hidden" name="token" value="${escapeHtml(confirmToken)}">
        <button type="submit">Confirm unsubscribe</button>
      </form>
    `
    : `<p style="margin-top:1.5rem"><a href="/">Back to evbogue.com</a></p>`
  return signalPage({
    title: "Unsubscribe",
    description: "Unsubscribe from evbogue.com.",
    body: `
      <article>
        <div class="post-header">
          <span class="tag">Unsubscribe</span>
          <h1 class="hero-title">${escapeHtml(heading)}</h1>
          <p class="hero-dek">${escapeHtml(message)}</p>
        </div>
        <hr class="post-divider">
        <div class="post-body">${form}</div>
      </article>
    `,
  })
}

app.get('/unsubscribe', async (c) => {
  const token = c.req.query('token')
  const entry = await findByToken(ROOT, token)
  if (!entry) {
    return c.html(unsubscribePage({
      heading: "Link not found",
      message: "That unsubscribe link is missing or expired. Email ev@evbogue.com and I'll take you off the list by hand.",
    }), 404)
  }
  if (entry.unsubscribed_at) {
    return c.html(unsubscribePage({
      heading: "Already unsubscribed",
      message: `${entry.email} is no longer on the list.`,
    }))
  }
  return c.html(unsubscribePage({
    heading: "Unsubscribe?",
    message: `Click below to remove ${entry.email} from the list.`,
    confirmToken: entry.token,
  }))
})

app.post('/unsubscribe', async (c) => {
  const form = await c.req.formData().catch(() => null)
  const token = form?.get('token')?.toString() ?? c.req.query('token')
  const result = await unsubscribeByToken(ROOT, token)
  if (!result) {
    return c.html(unsubscribePage({
      heading: "Link not found",
      message: "That unsubscribe link is missing or expired. Email ev@evbogue.com and I'll take you off the list by hand.",
    }), 404)
  }
  if (result.status === 'fresh') {
    sendAdminNotification('unsubscribe', result.entry).catch((err) => {
      console.error('admin notification failed:', err)
    })
  }
  return c.html(unsubscribePage({
    heading: "Unsubscribed",
    message: `${result.entry.email} has been removed from the list.`,
  }))
})

app.get('/confirm', async (c) => {
  const token = c.req.query('token')
  const result = await confirmByToken(ROOT, token)
  if (!result) {
    return c.html(unsubscribePage({
      heading: "Link not found",
      message: "That confirmation link is missing, expired, or already unsubscribed. Try subscribing again.",
    }), 404)
  }
  if (result.status === 'fresh') {
    sendAdminNotification('confirm', result.entry).catch((err) => {
      console.error('admin notification failed:', err)
    })
  }
  return c.redirect('/?subscribe=confirmed', 303)
})

export default app
