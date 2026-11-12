// Capture project screenshots for the /projects portfolio.
//
// Reads sites/<site>/projects.json and writes one PNG per project that has a
// public `url` into sites/<site>/assets/projects/<slug>.png. The portfolio
// page picks these up automatically on the next request; any project without
// a shot falls back to a rendered browser-frame placeholder, so this is safe
// to run partially or not at all.
//
//   deno task screenshots
//   deno task screenshots --site=evbogue.com --only=wiredove,anproto
//
// Requires Playwright's Chromium and a network that can actually reach the
// live sites. In this repo's cloud sessions Chromium is pre-installed at
// $PLAYWRIGHT_BROWSERS_PATH; on a fresh machine run `npx playwright install
// chromium` once first.
import { chromium } from "npm:playwright"
import { loadSites, siteById } from "../lib/sites.js"

const arg = (name) => Deno.args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)

const siteId = arg("site") || "evbogue.com"
const only = arg("only")?.split(",").map((s) => s.trim()).filter(Boolean)

const site = siteById(await loadSites(), siteId)
const projectsFile = `${site.root}/projects.json`
const data = JSON.parse(await Deno.readTextFile(projectsFile))
const { projects = [] } = data

const targets = projects
  .filter((p) => /^https?:\/\//i.test(p.url || ""))
  .filter((p) => !only || only.includes(p.slug))

if (!targets.length) {
  console.log("Nothing to capture (no projects with a public url matched).")
  Deno.exit(0)
}

const outDir = `${site.assetsDir}/projects`
await Deno.mkdir(outDir, { recursive: true })

// In a Claude Code container Chromium is preinstalled at $PLAYWRIGHT_BROWSERS_PATH
// and must be launched by explicit path (Playwright's version-matched auto-
// discovery won't find it). Everywhere else, let Playwright find its own browser.
const pwPath = Deno.env.get("PLAYWRIGHT_BROWSERS_PATH")
const preinstalled = pwPath ? `${pwPath}/chromium` : ""
const usePreinstalled = preinstalled && await Deno.stat(preinstalled).then(() => true, () => false)
const browser = await chromium.launch(usePreinstalled ? { executablePath: preinstalled } : {})
let ok = 0
for (const project of targets) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
    colorScheme: "light", serviceWorkers: "block",
  })
  const out = `${outDir}/${project.slug}.png`
  try {
    const page = await context.newPage()
    const response = await page.goto(project.screenshotUrl || project.url, { waitUntil: "domcontentloaded", timeout: 45000 })
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`)
    // A successful HTTP response can still be an empty application shell.
    await page.waitForFunction(() => document.body.innerText.trim().length > 200, null, { timeout: 120000 })
    await page.evaluate(() => document.fonts.ready)
    if (project.screenshotContentSelector) {
      await page.locator(project.screenshotContentSelector).first().waitFor({ state: "visible", timeout: 60000 })
    }
    if (project.screenshotReadySelector) {
      await page.locator(project.screenshotReadySelector).waitFor({ state: "visible", timeout: 60000 })
    }
    // Allow asynchronous profiles to replace initial identicons, then require
    // all visible images (including avatar photos) to finish decoding.
    await page.waitForTimeout(15000)
    await page.waitForFunction(() => [...document.images].filter(image => {
      const r = image.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
    }).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 60000 })
    await page.evaluate(async () => {
      const visible = [...document.images].filter(image => {
        const r = image.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
      })
      await Promise.all(visible.map(image => image.decode()))
    })
    await page.screenshot({ path: out })
    project.screenshotDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date())
    project.screenshotVersion = String(Date.now())
    delete project.screenshotNote
    ok++
    console.log(`✓ ${project.slug} → ${out}`)
  } catch (err) {
    console.error(`✗ ${project.slug} (${project.url}): ${err.message}`)
  } finally {
    await context.close()
  }
}
await browser.close()
await Deno.writeTextFile(projectsFile, JSON.stringify(data, null, 2) + "\n")
console.log(`\nCaptured ${ok}/${targets.length}. Review the PNGs before committing.`)
if (ok !== targets.length) Deno.exitCode = 1
