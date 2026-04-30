import { Hono } from "jsr:@hono/hono";
import { marked } from "https://esm.sh/gh/evbogue/bog5@de70376265/lib/marked.esm.js";

const app = new Hono()

const head = await Deno.readTextFile('./head.html')
const foot = await Deno.readTextFile('./foot.html')

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
  for await (const entry of Deno.readDir('./posts')) {
    if (!entry.isFile || !entry.name.endsWith('.md')) continue
    const text = await Deno.readTextFile(`./posts/${entry.name}`)
    const { data, body } = parseFrontmatter(text)
    if (data.draft) continue
    posts.push({ ...data, body })
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function filterPosts(posts, query) {
  if (!query) return posts
  const q = query.toLowerCase()
  return posts.filter((post) =>
    (post.title ?? "").toLowerCase().includes(q) ||
    (post.excerpt ?? "").toLowerCase().includes(q) ||
    (post.body ?? "").toLowerCase().includes(q)
  )
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

const page = (bodyHtml) => head + bodyHtml + foot

function postEntry(post) {
  return `
    <article class="entry">
      <h2><a href="/posts/${post.slug}">${post.title}</a></h2>
      <div class="meta">${post.date}</div>
      <p>${post.excerpt || excerptFromBody(post.body)}</p>
      <p><a class="more-link" href="/posts/${post.slug}">Continue reading</a></p>
    </article>
  `
}

function introHtml() {
  return `
    <aside class="intro">
      <img src="/assets/ev.png" alt="Everett Bogue">
      <div>
        <p>I'm Ev in Chicago. I write here about the web, small publishing, independence, and recovered work from Far Beyond The Stars.</p>
        <form class="sidebar-subscribe" action="/subscribe" method="POST">
          <label>
            Subscribe
            <input type="email" name="email" placeholder="you@example.com" required>
          </label>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </aside>
  `
}

app.get('/assets/*', async (c) => {
  const assetPath = c.req.path.replace(/^\/assets\//, '')
  const normalized = assetPath
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/')
  const path = `./assets/${normalized}`
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
  const allPosts = await loadPosts()
  const posts = query ? filterPosts(allPosts, query) : allPosts.slice(0, 3)
  const summary = query
    ? `<p class="search-summary">Showing ${posts.length} result${posts.length === 1 ? '' : 's'} for “${query}”. <a href="/">Clear search</a></p>`
    : ''
  const list = posts.map(postEntry).join('')
  const archiveLink = query ? '' : '<p><a href="/posts">All posts</a></p>'
  return c.html(page(`
    <div class="home-layout">
      ${introHtml()}
      <section class="home-posts">
        ${summary}
        ${list || '<p class="empty-state">No posts matched that search.</p>'}
        ${archiveLink}
      </section>
    </div>
  `))
})

app.get('/posts', async (c) => {
  const posts = await loadPosts()
  const list = posts.map((post) => `
    <li>
      <a href="/posts/${post.slug}">${post.title}</a>
      <time datetime="${post.date}">${post.date}</time>
    </li>
  `).join('')
  return c.html(page(`
    <article>
      <h1>Posts</h1>
      <ul class="archive-list">
        ${list}
      </ul>
    </article>
  `))
})

app.get('/posts/:slug', async (c) => {
  const slug = c.req.param('slug')
  const posts = await loadPosts()
  const post = posts.find(p => p.slug === slug)
  if (!post) return c.notFound()
  const html = `
    <article class="post">
      <h1>${post.title}</h1>
      <div class="meta">${post.date}</div>
      <div class="post-body">
        ${marked(post.body)}
      </div>
    </article>
  `
  return c.html(page(html))
})

app.get('/about', async (c) => {
  const doc = await Deno.readTextFile('./about.md')
  return c.html(page(`<article class="about-page">${marked(doc)}${ntfyWidget}</article>`))
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


app.post('/subscribe', async (c) => {
  const form = await c.req.formData()
  const email = form.get('email')?.toString().trim().toLowerCase()
  if (!email || !email.includes('@')) return c.redirect('/?error=invalid')

  let subscribers = []
  try {
    subscribers = JSON.parse(await Deno.readTextFile('./subscribers.json'))
  } catch { /* file doesn't exist yet */ }

  if (!subscribers.includes(email)) {
    subscribers.push(email)
    await Deno.writeTextFile('./subscribers.json', JSON.stringify(subscribers, null, 2))
  }

  return c.redirect('/?subscribed=1')
})

export default app
