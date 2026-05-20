import { aggregateDailyViews, aggregateFunnelEvents, loadViews, renderBarChart, renderLineChart } from "../lib/analytics.js"
import { loadPosts } from "../lib/posts.js"
import { sendWeeklyReport } from "../lib/mailer.js"
import { loadSites, siteById } from "../lib/sites.js"

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/+$/, "")

// --- CLI ---
const weekArg = Deno.args.find((a) => a.startsWith("--week="))?.slice("--week=".length)
const siteId = Deno.args.find((a) => a.startsWith("--site="))?.slice("--site=".length) || "evbogue.com"
const doEmail = Deno.args.includes("--email")
const site = siteById(await loadSites(), siteId)

// --- ISO week helpers ---

function getISOWeek(date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function getWeekBounds(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1))
  const monday = new Date(week1Mon)
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return { start: monday.getTime(), end: sunday.getTime() }
}

function lastCompletedWeek() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() || 7
  const lastSunday = new Date(now)
  lastSunday.setUTCDate(now.getUTCDate() - dayOfWeek)
  lastSunday.setUTCHours(12, 0, 0, 0)
  return getISOWeek(lastSunday)
}

function parseWeekArg(s) {
  const m = s.match(/^(\d{4})-W?(\d{1,2})$/)
  if (!m) throw new Error(`Invalid week format: ${s}. Use YYYY-Www or YYYY-W.`)
  return { year: parseInt(m[1]), week: parseInt(m[2]) }
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
  })
}

function delta(curr, prev) {
  const d = curr - prev
  if (d === 0) return "flat"
  return `${d > 0 ? "+" : ""}${d} vs prev week`
}

// --- Setup ---

const { year, week } = weekArg ? parseWeekArg(weekArg) : lastCompletedWeek()
const weekLabel = `${year}-W${String(week).padStart(2, "0")}`
const { start, end } = getWeekBounds(year, week)
const prev = week === 1 ? { year: year - 1, week: 52 } : { year, week: week - 1 }
const prevBounds = getWeekBounds(prev.year, prev.week)

const [allViews, posts] = await Promise.all([loadViews(ROOT, site.analyticsNamespace), loadPosts(site.root)])

const weekViews = allViews.filter((v) => { const t = Date.parse(v.t); return t >= start && t <= end })
const prevViews = allViews.filter((v) => { const t = Date.parse(v.t); return t >= prevBounds.start && t <= prevBounds.end })

const weekPostViews = weekViews.filter((v) => v.kind === "view" && v.slug)
const prevPostViews = prevViews.filter((v) => v.kind === "view" && v.slug)
const weekRssViews = weekViews.filter((v) => v.kind === "rss")

// Unique visitors this week
const uniqWeek = new Set(weekPostViews.filter((v) => v.h).map((v) => v.h)).size
const uniqPrev = new Set(prevPostViews.filter((v) => v.h).map((v) => v.h)).size

// Top posts this week
const bySlug = new Map()
for (const v of weekPostViews) bySlug.set(v.slug, (bySlug.get(v.slug) || 0) + 1)
const topPosts = [...bySlug.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([slug, views]) => ({ slug, views, title: posts.find((p) => p.slug === slug)?.title || slug }))

// Top post share (this week vs prev)
const topShare = weekPostViews.length > 0 && topPosts.length > 0
  ? Math.round((topPosts[0].views / weekPostViews.length) * 100)
  : 0
const prevBySlug = new Map()
for (const v of prevPostViews) prevBySlug.set(v.slug, (prevBySlug.get(v.slug) || 0) + 1)
const prevTopCount = Math.max(0, ...[...prevBySlug.values()])
const prevTopShare = prevPostViews.length > 0 && prevTopCount > 0
  ? Math.round((prevTopCount / prevPostViews.length) * 100)
  : 0

// Archive vs new (90 days before end of target week)
const cutoff = end - 90 * 24 * 60 * 60 * 1000
const newPostViews = weekPostViews.filter((v) => {
  const post = posts.find((p) => p.slug === v.slug)
  return post?.date && new Date(post.date + "T00:00:00Z").getTime() >= cutoff
})
const archivePct = weekPostViews.length > 0
  ? Math.round(((weekPostViews.length - newPostViews.length) / weekPostViews.length) * 100)
  : null

// Funnel
const funnel = aggregateFunnelEvents(weekViews)
const prevFunnel = aggregateFunnelEvents(prevViews)
const convPct = funnel.attempts > 0 ? Math.round((funnel.confirms / funnel.attempts) * 100) : null

// Bar chart (top 10)
const chart = renderBarChart(topPosts.map((r) => ({ label: r.title.slice(0, 40), value: r.views })))

// Daily hits line chart
const dailyRows = aggregateDailyViews(weekPostViews)
const lineChart = renderLineChart(dailyRows)

// --- Headline ---
let headline = "No post views recorded this week."
if (topPosts.length > 0) {
  headline = `"${topPosts[0].title}" led with ${topPosts[0].views} view${topPosts[0].views === 1 ? "" : "s"} — ${weekPostViews.length} total, ${uniqWeek} unique visitors.`
}

// --- Build report ---
const generatedAt = new Date().toLocaleString("en-US", {
  timeZone: "America/Chicago",
  dateStyle: "medium",
  timeStyle: "short",
})

const lines = [
  `# Weekly report: ${site.title} ${weekLabel}`,
  ``,
  `${fmtDate(start)} – ${fmtDate(end)} · Generated ${generatedAt} Chicago`,
  ``,
  `## Headline`,
  ``,
  headline,
  ``,
  `## Top posts`,
  ``,
]

if (topPosts.length === 0) {
  lines.push("No post views this week.")
} else {
  lines.push("| # | Post | Views |", "|---|---|---|")
  for (const [i, p] of topPosts.entries()) lines.push(`| ${i + 1} | ${p.title} | ${p.views} |`)
  if (chart) lines.push(``, chart)
}

if (lineChart) lines.push(``, `## Daily hits`, ``, lineChart)

lines.push(
  ``,
  `## Subscriber funnel`,
  ``,
  `| Event | Count |`,
  `|---|---|`,
  `| Subscribe attempts | ${funnel.attempts} |`,
  `| Confirmed | ${funnel.confirms} |`,
  `| Unsubscribed | ${funnel.unsubs} |`,
)
if (convPct !== null) lines.push(`| Form → confirm rate | ${convPct}% |`)

lines.push(``, `## Archive vs new`, ``)
if (archivePct !== null) {
  lines.push(`${archivePct}% of post views landed on archive posts (older than 90 days). ${weekPostViews.length - newPostViews.length} archive / ${newPostViews.length} recent out of ${weekPostViews.length} total.`)
} else {
  lines.push("No post views to analyze.")
}

lines.push(
  ``,
  `## Week over week`,
  ``,
  `- Post views: ${weekPostViews.length} (${delta(weekPostViews.length, prevPostViews.length)})`,
  `- Unique visitors: ${uniqWeek} (${delta(uniqWeek, uniqPrev)})`,
  `- Confirmed signups: ${funnel.confirms} (${delta(funnel.confirms, prevFunnel.confirms)})`,
  `- Top post share: ${topShare}% (${delta(topShare, prevTopShare)})`,
  ``,
  `## RSS`,
  ``,
  `${weekRssViews.length} RSS fetches this week (${allViews.filter((v) => v.kind === "rss").length} all time).`,
  ``,
)

const report = lines.join("\n")

// --- Write ---
const reportDir = `${ROOT}/analytics/reports/${site.analyticsNamespace}`
const reportPath = `${reportDir}/${weekLabel}.md`
await Deno.mkdir(reportDir, { recursive: true })
await Deno.writeTextFile(reportPath, report)
console.log(`Report written: ${reportPath}`)

if (doEmail) {
  await sendWeeklyReport(weekLabel, report, site)
  console.log(`Report emailed for ${weekLabel}`)
}
