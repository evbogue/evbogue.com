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
const { projects = [] } = JSON.parse(await Deno.readTextFile(`${site.root}/projects.json`))

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
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
})

let ok = 0
for (const project of targets) {
  const out = `${outDir}/${project.slug}.png`
  try {
    const page = await context.newPage()
    await page.goto(project.url, { waitUntil: "networkidle", timeout: 45000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: out })
    await page.close()
    ok++
    console.log(`✓ ${project.slug} → ${out}`)
  } catch (err) {
    console.error(`✗ ${project.slug} (${project.url}): ${err.message}`)
  }
}

await browser.close()
console.log(`\nCaptured ${ok}/${targets.length}. Commit the PNGs in ${outDir} to publish them.`)
