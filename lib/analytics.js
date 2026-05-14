const ANALYTICS_DIR = "analytics"
const VIEWS_FILE = "views.jsonl"
const BOT_RE = /bot|crawl|spider|preview|monitor|fetch|wget|curl|python-requests|scrapy|headless|http-client|googleusercontent/i

export function isBot(userAgent = "") {
  return BOT_RE.test(userAgent)
}

export async function recordView(root, { slug, kind = "view", userAgent = "" }) {
  if (isBot(userAgent)) return
  if (kind === "view" && !slug) return
  const row = { t: new Date().toISOString(), kind }
  if (slug) row.slug = slug
  const dir = `${root}/${ANALYTICS_DIR}`
  const path = `${dir}/${VIEWS_FILE}`
  try {
    await Deno.mkdir(dir, { recursive: true })
    await Deno.writeTextFile(path, JSON.stringify(row) + "\n", { append: true })
  } catch (err) {
    console.error("analytics write failed:", err)
  }
}

export async function loadViews(root) {
  const path = `${root}/${ANALYTICS_DIR}/${VIEWS_FILE}`
  try {
    const text = await Deno.readTextFile(path)
    return text.split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
  } catch {
    return []
  }
}

export function aggregateViews(views, posts = []) {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000

  const postViews = []
  const rssViews = []
  for (const v of views) {
    const t = Date.parse(v.t)
    if (Number.isNaN(t)) continue
    const row = { ...v, ts: t }
    if (v.kind === "view" && v.slug) postViews.push(row)
    else if (v.kind === "rss") rssViews.push(row)
  }

  const bySlug = new Map()
  for (const v of postViews) {
    let row = bySlug.get(v.slug)
    if (!row) {
      row = { slug: v.slug, all: 0, week: 0, day: 0, last: 0 }
      bySlug.set(v.slug, row)
    }
    row.all++
    if (v.ts >= weekAgo) row.week++
    if (v.ts >= dayAgo) row.day++
    if (v.ts > row.last) row.last = v.ts
  }

  const titleBySlug = new Map(posts.map((p) => [p.slug, p.title]))
  const dateBySlug = new Map(posts.map((p) => [p.slug, p.date]))
  const top = [...bySlug.values()]
    .map((r) => ({
      ...r,
      title: titleBySlug.get(r.slug) || r.slug,
      date: dateBySlug.get(r.slug) || "",
    }))
    .sort((a, b) => b.all - a.all)

  return {
    totals: {
      day: postViews.filter((v) => v.ts >= dayAgo).length,
      week: postViews.filter((v) => v.ts >= weekAgo).length,
      all: postViews.length,
    },
    rss: {
      day: rssViews.filter((v) => v.ts >= dayAgo).length,
      week: rssViews.filter((v) => v.ts >= weekAgo).length,
      all: rssViews.length,
    },
    top,
    firstSeen: views.length
      ? Math.min(...postViews.concat(rssViews).map((v) => v.ts).filter(Number.isFinite))
      : null,
  }
}

function escapeSvg(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function renderBarChart(rows, { width = 600, barHeight = 22, gap = 8 } = {}) {
  if (!rows.length) return ""
  const peak = Math.max(...rows.map((r) => r.value))
  if (peak <= 0) return ""
  const labelWidth = 240
  const valueWidth = 48
  const chartWidth = width - labelWidth - valueWidth
  const height = rows.length * (barHeight + gap)
  const bars = rows.map((row, i) => {
    const y = i * (barHeight + gap)
    const w = Math.max(2, Math.round((row.value / peak) * chartWidth))
    const label = (row.label || "").slice(0, 42)
    return `
      <text x="0" y="${y + barHeight - 6}" font-size="13" font-family="DM Mono, ui-monospace, monospace" fill="#1a1a1a">${escapeSvg(label)}</text>
      <rect x="${labelWidth}" y="${y}" width="${w}" height="${barHeight}" fill="#1a1a1a"></rect>
      <text x="${labelWidth + w + 8}" y="${y + barHeight - 6}" font-size="13" font-family="DM Mono, ui-monospace, monospace" fill="#1a1a1a">${row.value}</text>
    `
  }).join("")
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Top posts by views">${bars}</svg>`
}
