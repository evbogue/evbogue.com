const ANALYTICS_DIR = "analytics"
const VIEWS_FILE = "views.jsonl"
const BOT_RE = /bot|crawl|spider|preview|monitor|fetch|wget|curl|python-requests|scrapy|headless|http-client|googleusercontent/i

export function isBot(userAgent = "") {
  return BOT_RE.test(userAgent)
}

export async function hashClient(ip, salt) {
  if (!ip || !salt) return null
  const data = new TextEncoder().encode(String(ip) + String(salt))
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function recordView(root, { slug, kind = "view", userAgent = "", ip = "", salt = "" }) {
  if (isBot(userAgent)) return
  if (kind === "view" && !slug) return
  const hash = await hashClient(ip, salt)
  const row = { t: new Date().toISOString(), kind }
  if (slug) row.slug = slug
  if (hash) row.h = hash
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
      row = {
        slug: v.slug,
        all: 0, week: 0, day: 0, last: 0,
        uniqAll: new Set(), uniqWeek: new Set(), uniqDay: new Set(),
      }
      bySlug.set(v.slug, row)
    }
    row.all++
    if (v.ts >= weekAgo) row.week++
    if (v.ts >= dayAgo) row.day++
    if (v.ts > row.last) row.last = v.ts
    if (v.h) {
      row.uniqAll.add(v.h)
      if (v.ts >= weekAgo) row.uniqWeek.add(v.h)
      if (v.ts >= dayAgo) row.uniqDay.add(v.h)
    }
  }

  const allHashes = new Set()
  const weekHashes = new Set()
  const dayHashes = new Set()
  for (const v of postViews) {
    if (!v.h) continue
    allHashes.add(v.h)
    if (v.ts >= weekAgo) weekHashes.add(v.h)
    if (v.ts >= dayAgo) dayHashes.add(v.h)
  }

  const titleBySlug = new Map(posts.map((p) => [p.slug, p.title]))
  const dateBySlug = new Map(posts.map((p) => [p.slug, p.date]))
  const top = [...bySlug.values()]
    .map((r) => ({
      slug: r.slug,
      all: r.all, week: r.week, day: r.day, last: r.last,
      uniqAll: r.uniqAll.size, uniqWeek: r.uniqWeek.size, uniqDay: r.uniqDay.size,
      title: titleBySlug.get(r.slug) || r.slug,
      date: dateBySlug.get(r.slug) || "",
    }))
    .sort((a, b) => b.all - a.all)

  return {
    totals: {
      day: postViews.filter((v) => v.ts >= dayAgo).length,
      week: postViews.filter((v) => v.ts >= weekAgo).length,
      all: postViews.length,
      uniqDay: dayHashes.size,
      uniqWeek: weekHashes.size,
      uniqAll: allHashes.size,
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

export async function recordEvent(root, { kind, ...fields }) {
  const row = { t: new Date().toISOString(), kind, ...fields }
  const dir = `${root}/${ANALYTICS_DIR}`
  const path = `${dir}/${VIEWS_FILE}`
  try {
    await Deno.mkdir(dir, { recursive: true })
    await Deno.writeTextFile(path, JSON.stringify(row) + "\n", { append: true })
  } catch (err) {
    console.error("analytics write failed:", err)
  }
}

export function aggregateFunnelEvents(views, { start = 0, end = Infinity } = {}) {
  const inRange = views.filter((v) => {
    const t = Date.parse(v.t)
    return !isNaN(t) && t >= start && t <= end
  })
  return {
    attempts: inRange.filter((v) => v.kind === "subscribe_attempt").length,
    confirms: inRange.filter((v) => v.kind === "confirm").length,
    unsubs: inRange.filter((v) => v.kind === "unsubscribe").length,
  }
}

export function aggregateDailyViews(views) {
  const byDay = new Map()
  for (const v of views) {
    if (v.kind !== "view" || !v.slug) continue
    const t = Date.parse(v.t)
    if (isNaN(t)) continue
    const day = new Date(t).toISOString().slice(0, 10)
    let row = byDay.get(day)
    if (!row) { row = { date: day, total: 0, hashes: new Set() }; byDay.set(day, row) }
    row.total++
    if (v.h) row.hashes.add(v.h)
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, r]) => ({ date, total: r.total, uniq: r.hashes.size }))
}

export function renderLineChart(rows, { width = 600, height = 200 } = {}) {
  if (!rows.length) return ""
  const padL = 36, padR = 12, padT = 14, padB = 50
  const W = width - padL - padR
  const H = height - padT - padB
  const peak = Math.max(...rows.map((r) => Math.max(r.total, r.uniq)), 1)

  const xOf = (i) => padL + (rows.length < 2 ? W / 2 : (i / (rows.length - 1)) * W)
  const yOf = (v) => padT + H - Math.round((v / peak) * H)

  const totalPts = rows.map((r, i) => `${xOf(i)},${yOf(r.total)}`).join(" ")
  const uniqPts = rows.map((r, i) => `${xOf(i)},${yOf(r.uniq)}`).join(" ")

  let labelIndices
  if (rows.length <= 7) {
    labelIndices = rows.map((_, i) => i)
  } else {
    const step = Math.ceil(rows.length / 6)
    labelIndices = []
    for (let i = 0; i < rows.length; i += step) labelIndices.push(i)
    if (labelIndices[labelIndices.length - 1] !== rows.length - 1) labelIndices.push(rows.length - 1)
  }

  const mono = "DM Mono, ui-monospace, monospace"
  const xLabels = labelIndices.map((i) => {
    const mmdd = rows[i].date.slice(5).replace("-", "/")
    return `<text x="${xOf(i)}" y="${padT + H + 18}" text-anchor="middle" font-size="11" font-family="${mono}" fill="#555">${escapeSvg(mmdd)}</text>`
  }).join("")

  const yPeak = `<text x="${padL - 4}" y="${padT + 5}" text-anchor="end" font-size="11" font-family="${mono}" fill="#555">${peak}</text>`
  const yZero = `<text x="${padL - 4}" y="${padT + H}" text-anchor="end" font-size="11" font-family="${mono}" fill="#555">0</text>`

  const legY = padT + H + 36
  const legend = [
    `<line x1="${padL}" y1="${legY}" x2="${padL + 18}" y2="${legY}" stroke="#1a1a1a" stroke-width="2"/>`,
    `<text x="${padL + 22}" y="${legY + 4}" font-size="11" font-family="${mono}" fill="#1a1a1a">total</text>`,
    `<line x1="${padL + 74}" y1="${legY}" x2="${padL + 92}" y2="${legY}" stroke="#1a1a1a" stroke-width="2" stroke-dasharray="4,3"/>`,
    `<text x="${padL + 96}" y="${legY + 4}" font-size="11" font-family="${mono}" fill="#1a1a1a">uniques</text>`,
  ].join("")

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Daily hits: total and unique visitors">
  <line x1="${padL}" y1="${padT}" x2="${padL + W}" y2="${padT}" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="${padL}" y1="${padT + H}" x2="${padL + W}" y2="${padT + H}" stroke="#ccc" stroke-width="1"/>
  <polyline points="${totalPts}" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linejoin="round"/>
  <polyline points="${uniqPts}" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-dasharray="4,3" stroke-linejoin="round"/>
  ${xLabels}${yPeak}${yZero}${legend}
</svg>`
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
