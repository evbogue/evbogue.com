import { Hono } from "jsr:@hono/hono";
import { marked } from "https://esm.sh/gh/evbogue/bog5@de70376265/lib/marked.esm.js";
import { excerptFromBody, loadPosts as readPosts } from "./lib/posts.js";
import { addSubscriber, confirmByToken, findByToken, unsubscribeByToken } from "./lib/subscribers.js";
import { sendAdminNotification, sendConfirmation } from "./lib/mailer.js";
import { aggregateDailyViews, aggregateViews, loadViews, recordEvent, recordView, renderBarChart, renderLineChart } from "./lib/analytics.js";
import { loadSites, REPO_ROOT, siteFromRequest } from "./lib/sites.js";

const ANALYTICS_SALT = Deno.env.get("ANALYTICS_SALT") ?? ""
if (!ANALYTICS_SALT) {
  console.warn("ANALYTICS_SALT not set — unique visitor counts will stay at 0.")
}

function clientIp(c) {
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return c.req.header('x-real-ip') ?? c.req.header('cf-connecting-ip') ?? ""
}

const app = new Hono()

const ROOT = REPO_ROOT
const SITE_REGISTRY = await loadSites()

async function loadPosts(site) {
  return readPosts(site.root)
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
  if (tags.includes("archive") || tags.includes("evbogue") || tags.includes("fbts")) return "Archive"
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

function wordmarkHtml(site) {
  const wordmark = site.wordmark || site.title
  if (wordmark.endsWith(".com")) {
    return `${escapeHtml(wordmark.slice(0, -4))}<span>.</span>com`
  }
  return escapeHtml(wordmark)
}

function sitePage(site, { title = site.title, description = site.description, body }) {
  const fullTitle = title === site.title ? site.title : `${title} - ${site.title}`
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  })
  const dateRibbon = site.id === "evbogue.com"
    ? `${escapeHtml(now)} &nbsp;&middot;&nbsp; Augmented publishing by <a href="/about" class="date-ribbon-byline"><img src="/assets/ev-profile.jpg" alt="Ev Bogue" class="date-ribbon-avatar">Ev Bogue</a>`
    : `${escapeHtml(now)} &nbsp;&middot;&nbsp; ${escapeHtml(site.tagline || site.description)}`

  return `<!doctype html>
<html lang="en">
  <head>
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="description" content="${escapeHtml(description)}">
    ${site.noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
    <link rel="icon" href="/${escapeHtml(site.favicon || "assets/ev.png")}">
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="/feed.xml">
    <link rel="stylesheet" href="/${escapeHtml(site.cssFile)}?v=20260514c">
  </head>
  <body>
    <header>
      <div class="header-inner">
        <a href="/" class="wordmark">${wordmarkHtml(site)}</a>
        <nav>
          <a href="/about">About</a>
          <a href="/posts" class="nav-priority">${escapeHtml(site.archiveLabel || "Archive")}</a>
          <a href="/feed.xml">RSS</a>
          <a href="#subscribe-dialog" class="subscribe-btn" data-open-subscribe>Subscribe</a>
        </nav>
      </div>
    </header>

    <dialog id="subscribe-dialog" class="subscribe-dialog" aria-labelledby="subscribe-dialog-title">
      <form method="dialog" class="subscribe-dialog-close-form">
        <button class="subscribe-dialog-close" aria-label="Close">&times;</button>
      </form>
      <div class="subscribe-dialog-body">
        <h3 id="subscribe-dialog-title">${escapeHtml(site.subscribeTitle || `Get ${site.title} in your inbox.`)}</h3>
        <p>${escapeHtml(site.subscribeDek || "Dispatches by email.")}</p>
        <form class="newsletter-form" action="/subscribe" method="POST">
          <input type="email" name="email" placeholder="you@example.com" required autocomplete="email">
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </dialog>

    <div class="date-ribbon">${dateRibbon}</div>

    ${body}

    <footer>
      <div class="footer-inner">
        <a href="/" class="wordmark">${wordmarkHtml(site)}</a>
        <div class="footer-links">
          <a href="/about">About</a>
          <a href="/posts">Archive</a>
          <a href="/feed.xml">RSS</a>
        </div>
        <span class="footer-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(site.footerCopy || site.title)}</span>
      </div>
    </footer>
    <script>
      (function () {
        var dlg = document.getElementById('subscribe-dialog')
        if (!dlg || typeof dlg.showModal !== 'function') return
        document.querySelectorAll('[data-open-subscribe]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            e.preventDefault()
            dlg.showModal()
            var input = dlg.querySelector('input[name="email"]')
            if (input) input.focus()
          })
        })
        dlg.addEventListener('click', function (e) {
          if (e.target === dlg) dlg.close()
        })
      })()
    </script>
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
  const site = siteFromRequest(c, SITE_REGISTRY)
  const assetPath = c.req.path.replace(/^\/assets\//, '')
  const normalized = assetPath
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/')
  const path = `${site.assetsDir}/${normalized}`
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
  const site = siteFromRequest(c, SITE_REGISTRY)
  const query = c.req.query('q')?.trim() ?? ''
  const subscribeStatus = c.req.query('subscribe') ?? ''
  const allPosts = await loadPosts(site)
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
  return c.html(sitePage(site, {
    title: site.title,
    description: site.tagline || site.description,
    body: subscribeBanner(subscribeStatus) + main,
  }))
})

app.get('/posts', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const posts = await loadPosts(site)
  return c.html(sitePage(site, {
    title: "Archive",
    description: `The full ${site.title} archive.`,
    body: signalArchiveHtml(posts),
  }))
})

app.get('/posts/:slug', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const slug = c.req.param('slug')
  const posts = await loadPosts(site)
  const post = posts.find(p => p.slug === slug)
  if (!post) return c.notFound()
  recordView(ROOT, { slug: post.slug, userAgent: c.req.header('user-agent') ?? "", ip: clientIp(c), salt: ANALYTICS_SALT }, site.analyticsNamespace)
  return c.html(sitePage(site, {
    title: post.title,
    description: descriptionFor(post),
    body: signalPostHtml(post),
  }))
})

app.get('/about', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const doc = await Deno.readTextFile(site.aboutFile)
  return c.html(sitePage(site, {
    title: "About",
    description: `About ${site.title}.`,
    body: `
      <article>
        <div class="post-header">
          <span class="tag">About</span>
          <h1 class="hero-title">About ${escapeHtml(site.wordmark || site.title)}</h1>
        </div>
        <hr class="post-divider">
        <div class="post-body about-body">
          ${site.aboutPortrait ? `<img class="about-portrait" src="/${escapeHtml(site.aboutPortrait)}" alt="${escapeHtml(site.aboutPortraitAlt || site.title)}">` : ""}
          ${marked(doc)}
          ${ntfyWidget}
        </div>
      </article>
    `,
  }))
})

app.get('/tag/:tag', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const tagSlug = c.req.param('tag')
  const posts = postsForTag(await loadPosts(site), tagSlug)
  const label = labelForTag(posts, tagSlug)
  return c.html(sitePage(site, {
    title: label,
    description: `Posts tagged ${label} on ${site.title}.`,
    body: signalTagHtml(posts, label),
  }))
})

app.get('/feed.xml', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  recordView(ROOT, { kind: "rss", userAgent: c.req.header('user-agent') ?? "", ip: clientIp(c), salt: ANALYTICS_SALT }, site.analyticsNamespace)
  const posts = await loadPosts(site)
  const items = posts.slice(0, 50).map((post) => {
    const description = post.excerpt || excerptFromBody(post.body)
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${escapeXml(site.baseUrl)}/posts/${escapeXml(post.slug)}</link>
        <guid>${escapeXml(site.baseUrl)}/posts/${escapeXml(post.slug)}</guid>
        <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
        <description>${escapeXml(description)}</description>
      </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(site.baseUrl)}/</link>
    <description>${escapeXml(site.description)}</description>
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
  const site = siteFromRequest(c, SITE_REGISTRY)
  try {
    const form = await c.req.formData()
    const email = form.get('email')?.toString() ?? ''
    const result = await addSubscriber(site.subscribersPath, email)
    if (!result) {
      recordEvent(ROOT, { kind: "subscribe_attempt", outcome: "invalid" }, site.analyticsNamespace).catch(() => {})
      return c.redirect('/?subscribe=invalid', 303)
    }
    recordEvent(ROOT, { kind: "subscribe_attempt", outcome: result.status }, site.analyticsNamespace).catch(() => {})
    if (result.status === 'new' || result.status === 'pending' || result.status === 'resubscribed') {
      sendConfirmation(result.entry, site).catch((err) => {
        console.error('confirmation send failed:', err)
      })
    }
    if (result.status === 'new' || result.status === 'resubscribed') {
      sendAdminNotification(result.status, result.entry, site).catch((err) => {
        console.error('admin notification failed:', err)
      })
    }
    return c.redirect(`/?subscribe=${result.status}`, 303)
  } catch (err) {
    console.error('subscribe error:', err)
    recordEvent(ROOT, { kind: "subscribe_attempt", outcome: "error" }, site.analyticsNamespace).catch(() => {})
    return c.redirect('/?subscribe=error', 303)
  }
})

function unsubscribePage(site, { heading, message, confirmToken }) {
  const form = confirmToken
    ? `
      <form method="POST" action="/unsubscribe" class="newsletter-form" style="margin-top:1.5rem">
        <input type="hidden" name="token" value="${escapeHtml(confirmToken)}">
        <button type="submit">Confirm unsubscribe</button>
      </form>
    `
    : `<p style="margin-top:1.5rem"><a href="/">Back to evbogue.com</a></p>`
  return sitePage(site, {
    title: "Unsubscribe",
    description: `Unsubscribe from ${site.title}.`,
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
  const site = siteFromRequest(c, SITE_REGISTRY)
  const token = c.req.query('token')
  const entry = await findByToken(site.subscribersPath, token)
  if (!entry) {
    return c.html(unsubscribePage(site, {
      heading: "Link not found",
      message: `That unsubscribe link is missing or expired. Email ${site.emailReplyTo} and I'll take you off the list by hand.`,
    }), 404)
  }
  if (entry.unsubscribed_at) {
    return c.html(unsubscribePage(site, {
      heading: "Already unsubscribed",
      message: `${entry.email} is no longer on the list.`,
    }))
  }
  return c.html(unsubscribePage(site, {
    heading: "Unsubscribe?",
    message: `Click below to remove ${entry.email} from the list.`,
    confirmToken: entry.token,
  }))
})

app.post('/unsubscribe', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const form = await c.req.formData().catch(() => null)
  const token = form?.get('token')?.toString() ?? c.req.query('token')
  const result = await unsubscribeByToken(site.subscribersPath, token)
  if (!result) {
    return c.html(unsubscribePage(site, {
      heading: "Link not found",
      message: `That unsubscribe link is missing or expired. Email ${site.emailReplyTo} and I'll take you off the list by hand.`,
    }), 404)
  }
  if (result.status === 'fresh') {
    recordEvent(ROOT, { kind: "unsubscribe" }, site.analyticsNamespace).catch(() => {})
    sendAdminNotification('unsubscribe', result.entry, site).catch((err) => {
      console.error('admin notification failed:', err)
    })
  }
  return c.html(unsubscribePage(site, {
    heading: "Unsubscribed",
    message: `${result.entry.email} has been removed from the list.`,
  }))
})

function formatChicagoDateTime(ts) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function dashboardData(stats, views, generatedAt, { saltSet = true } = {}) {
  const topTen = stats.top.slice(0, 10)
  const chart = renderBarChart(topTen.map((r) => ({ label: r.title, value: r.all })))
  const lineChart = renderLineChart(aggregateDailyViews(views))
  const rows = stats.top.map((row, i) => `
    <div class="archive-row">
      <div class="archive-row-main">
        <span class="tag">${String(i + 1).padStart(2, '0')}</span>
        <span class="archive-row-title">${escapeHtml(row.title)}</span>
      </div>
      <time>${row.all} views · ${row.uniqAll} unique · last ${escapeHtml(formatChicagoDateTime(row.last))}</time>
    </div>
  `).join('')
  const since = stats.firstSeen
    ? new Date(stats.firstSeen).toLocaleDateString("en-US", { timeZone: "America/Chicago", year: "numeric", month: "long", day: "numeric" })
    : "—"
  const dek = `First-party view counts. Bots filtered. Generated ${formatChicagoDateTime(generatedAt)} America/Chicago. Tracking since ${since}.`
  const rssLine = `${stats.rss.day} today · ${stats.rss.week} this week · ${stats.rss.all} all time`
  return {
    totals: stats.totals,
    rss: stats.rss,
    chart,
    lineChart,
    rows,
    dek,
    rssLine,
    saltSet,
    hasViews: stats.top.length > 0,
  }
}

function dashboardBody(data) {
  return `
    <article>
      <div class="post-header">
        <span class="tag">Dashboard</span>
        <h1 class="hero-title">Post hits</h1>
        <p class="hero-dek" id="dash-dek">${escapeHtml(data.dek)}</p>
      </div>
      <hr class="post-divider">
      <div class="post-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2rem;">
          <div>
            <div style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;opacity:0.6;">Today</div>
            <div style="font-size:2.5rem;font-family:'Playfair Display',serif;" id="dash-day">${data.totals.day}</div>
            <div style="font-size:0.85rem;opacity:0.6;font-family:'DM Mono',ui-monospace,monospace;" id="dash-uniq-day">${data.totals.uniqDay} unique</div>
          </div>
          <div>
            <div style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;opacity:0.6;">Last 7 days</div>
            <div style="font-size:2.5rem;font-family:'Playfair Display',serif;" id="dash-week">${data.totals.week}</div>
            <div style="font-size:0.85rem;opacity:0.6;font-family:'DM Mono',ui-monospace,monospace;" id="dash-uniq-week">${data.totals.uniqWeek} unique</div>
          </div>
          <div>
            <div style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;opacity:0.6;">All time</div>
            <div style="font-size:2.5rem;font-family:'Playfair Display',serif;" id="dash-all">${data.totals.all}</div>
            <div style="font-size:0.85rem;opacity:0.6;font-family:'DM Mono',ui-monospace,monospace;" id="dash-uniq-all">${data.totals.uniqAll} unique</div>
          </div>
        </div>

        <div class="section-header"><span class="section-label">Daily hits</span><div class="section-rule"></div></div>
        <div id="dash-line" style="margin:1rem 0 2.5rem;">${data.lineChart || '<p class="empty-state">No daily data yet.</p>'}</div>

        <div class="section-header"><span class="section-label">Top 10 posts</span><div class="section-rule"></div></div>
        <div id="dash-chart" style="margin:1rem 0 2.5rem;">${data.chart || '<p class="empty-state">No post views recorded yet.</p>'}</div>

        <div class="section-header"><span class="section-label">All posts with hits</span><div class="section-rule"></div></div>
        <div id="dash-rows" class="archive-list-signal">${data.rows}</div>

        <div class="section-header" style="margin-top:2.5rem;"><span class="section-label">RSS</span><div class="section-rule"></div></div>
        <p id="dash-rss" style="margin:0.5rem 0 2rem;font-family:'DM Mono',ui-monospace,monospace;font-size:0.9rem;">${escapeHtml(data.rssLine)}</p>

        <p style="opacity:0.6;font-size:0.85rem;margin-top:2rem;">Raw events live in the site analytics JSONL file on the VPS. Gitignored. Not backed up automatically. This page polls <code>/analytics.json</code> every 10s. Uniques are distinct salted-hash buckets of client IP; one IP = one unique, no cookies.${data.saltSet ? "" : " <strong>ANALYTICS_SALT is not set on the server — uniques will stay at 0.</strong>"}</p>
      </div>
      <script>
        (function () {
          var setText = function (id, value) {
            var el = document.getElementById(id)
            if (el && el.textContent !== String(value)) el.textContent = value
          }
          var setHtml = function (id, value) {
            var el = document.getElementById(id)
            if (el && el.innerHTML !== value) el.innerHTML = value
          }
          var tick = function () {
            fetch('/analytics.json', { cache: 'no-store' })
              .then(function (r) { return r.ok ? r.json() : null })
              .then(function (d) {
                if (!d) return
                setText('dash-day', d.totals.day)
                setText('dash-week', d.totals.week)
                setText('dash-all', d.totals.all)
                setText('dash-uniq-day', d.totals.uniqDay + ' unique')
                setText('dash-uniq-week', d.totals.uniqWeek + ' unique')
                setText('dash-uniq-all', d.totals.uniqAll + ' unique')
                setText('dash-rss', d.rssLine)
                setText('dash-dek', d.dek)
                setHtml('dash-chart', d.chart || '<p class="empty-state">No post views recorded yet.</p>')
                setHtml('dash-line', d.lineChart || '<p class="empty-state">No daily data yet.</p>')
                setHtml('dash-rows', d.rows)
              })
              .catch(function () {})
          }
          setInterval(tick, 10000)
        })()
      </script>
    </article>
  `
}

app.get('/c/:campaign/:sub/:url', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const { campaign, sub, url } = c.req.param()
  let dest
  try { dest = decodeURIComponent(url) } catch { return c.redirect('/') }
  if (!dest.startsWith('http://') && !dest.startsWith('https://')) return c.redirect('/')
  await recordEvent(ROOT, { kind: 'email_click', sub, campaign, url: dest }, site.analyticsNamespace)
  return c.redirect(dest, 302)
})

app.get('/analytics', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const [views, posts] = await Promise.all([loadViews(ROOT, site.analyticsNamespace), loadPosts(site)])
  const stats = aggregateViews(views, posts)
  const data = dashboardData(stats, views, Date.now(), { saltSet: ANALYTICS_SALT !== "" })
  return c.html(sitePage(site, {
    title: "Analytics",
    description: `${site.title} analytics`,
    body: dashboardBody(data),
  }), 200, {
    "Cache-Control": "no-store",
  })
})

app.get('/analytics.json', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const [views, posts] = await Promise.all([loadViews(ROOT, site.analyticsNamespace), loadPosts(site)])
  const stats = aggregateViews(views, posts)
  const data = dashboardData(stats, views, Date.now(), { saltSet: ANALYTICS_SALT !== "" })
  return c.json(data, 200, { "Cache-Control": "no-store" })
})

app.get('/confirm', async (c) => {
  const site = siteFromRequest(c, SITE_REGISTRY)
  const token = c.req.query('token')
  const result = await confirmByToken(site.subscribersPath, token)
  if (!result) {
    return c.html(unsubscribePage(site, {
      heading: "Link not found",
      message: "That confirmation link is missing, expired, or already unsubscribed. Try subscribing again.",
    }), 404)
  }
  if (result.status === 'fresh') {
    recordEvent(ROOT, { kind: "confirm" }, site.analyticsNamespace).catch(() => {})
    sendAdminNotification('confirm', result.entry, site).catch((err) => {
      console.error('admin notification failed:', err)
    })
  }
  return c.redirect('/?subscribe=confirmed', 303)
})

export default app
