export const REPO_ROOT = new URL("..", import.meta.url).pathname.replace(/\/+$/, "")
export const SITES_DIR = `${REPO_ROOT}/sites`
export const DEFAULT_SITE_ID = "evbogue.com"

function withoutTrailingSlash(value = "") {
  return String(value).replace(/\/+$/, "")
}

function withDerivedPaths(site) {
  const root = `${SITES_DIR}/${site.id}`
  return {
    ...site,
    root,
    postsDir: `${root}/posts`,
    draftsDir: `${root}/drafts`,
    assetsDir: `${root}/assets`,
    aboutFile: `${root}/about.md`,
    subscribersPath: `${root}/${site.subscribersFile || "subscribers.json"}`,
    baseUrl: withoutTrailingSlash(site.baseUrl),
    analyticsNamespace: site.analyticsNamespace || site.id.replace(/[^a-z0-9]+/gi, "-"),
  }
}

export async function loadSites() {
  const sites = new Map()
  const hosts = new Map()

  for await (const entry of Deno.readDir(SITES_DIR)) {
    if (!entry.isDirectory) continue
    const path = `${SITES_DIR}/${entry.name}/site.json`
    const site = withDerivedPaths(JSON.parse(await Deno.readTextFile(path)))
    sites.set(site.id, site)
    for (const host of site.hosts || []) {
      hosts.set(String(host).toLowerCase(), site.id)
    }
  }

  return { sites, hosts }
}

export function siteFromRequest(c, registry) {
  const host = (c.req.header("host") || "").split(":")[0].toLowerCase()
  const envOverride = Deno.env.get("BOGBOOK_DEV_SITE_OVERRIDE") || ""
  // "=1" preserves the legacy ?site= query-param override.
  // "=<site-id>" pins the whole dev session to that site, so subresource
  // requests (CSS, favicon, images) dispatch to the same site without
  // needing the query param threaded into every URL.
  const paramOverride = envOverride === "1"
    ? new URL(c.req.url).searchParams.get("site")
    : null
  const pinnedSite = envOverride && envOverride !== "1" ? envOverride : null
  const id = paramOverride || pinnedSite || registry.hosts.get(host) || DEFAULT_SITE_ID
  return registry.sites.get(id) || registry.sites.get(DEFAULT_SITE_ID)
}

export function siteById(registry, id = DEFAULT_SITE_ID) {
  return registry.sites.get(id) || registry.sites.get(DEFAULT_SITE_ID)
}
