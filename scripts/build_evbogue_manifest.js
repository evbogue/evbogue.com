const outputPath = "archive/evbogue-2011-2016-manifest.json";
const inputPaths = ["/tmp/evbogue-cdx.json", "/tmp/www-evbogue-cdx.json"];
const startYear = 2011;
const endYear = 2016;

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parsePostFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const data = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, key, value] = kv;
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

async function loadExistingPosts() {
  const map = new Map();

  async function scanDir(dir) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const path = `${dir}/${entry.name}`;
        const text = await Deno.readTextFile(path);
        const frontmatter = parsePostFrontmatter(text);
        const slug = frontmatter.slug ?? entry.name.replace(/\.md$/, "");
        map.set(slug, {
          path,
          title: frontmatter.title ?? entry.name,
          date: frontmatter.date ?? null,
        });
      }
    } catch {
      // dir may not exist yet
    }
  }

  await scanDir("posts");
  await scanDir("archive/evbogue-drafts");

  return map;
}

function defaultPort(protocol) {
  return protocol === "https:" ? "443" : "80";
}

function normalizeOriginalUrl(originalUrl) {
  let url;
  try {
    url = new URL(originalUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "evbogue.com") return null;

  const protocol = url.protocol === "https:" ? "https:" : "http:";
  const pathname = decodeURIComponent(url.pathname)
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "") || "/";
  const port = url.port && url.port !== defaultPort(protocol) ? `:${url.port}` : "";
  const query = url.search ? url.search : "";

  return `${protocol}//${host}${port}${pathname}${query}`;
}

const SECTION_SLUGS = new Set([
  "books", "interviews", "timeline", "notablog", "cities", "people",
  "experiments", "testimonials", "next10000", "farbeyondthestars",
  "resources", "hire", "work", "speaking", "press", "newsletter",
  "subscribe", "unsubscribe", "sitemap", "privacy", "terms",
]);

function classifyPath(pathname, search) {
  const path = pathname.toLowerCase();
  const segments = path.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "";

  if (search) return { type: "exclude", reason: "query-string-alias" };
  if (path === "/") return { type: "exclude", reason: "homepage" };
  if (!segments.length) return { type: "exclude", reason: "homepage" };
  if (SECTION_SLUGS.has(last)) return { type: "exclude", reason: "section-page" };

  if (/\.(?:jpg|jpeg|png|gif|webp|svg|ico|css|js|ttf|woff|woff2|pdf|xml|txt)$/i.test(path)) {
    return { type: "exclude", reason: "asset" };
  }

  if (
    /^\/(?:wp-content|wp-admin|wp-includes)(?:\/|$)/.test(path) ||
    /^\/(?:feed|rss|atom)(?:\/|$)/.test(path) ||
    /^\/(?:archive|archives)(?:\/|$)/.test(path) ||
    /^\/(?:about|contact)(?:\/|$)/.test(path) ||
    /^\/(?:category|tag|author|comments?)(?:\/|$)/.test(path) ||
    /^\/(?:page|search)(?:\/|$)/.test(path)
  ) {
    return { type: "exclude", reason: "non-post-route" };
  }

  if (last === "feed") return { type: "exclude", reason: "feed-endpoint" };
  if (/^\/\d{4}(?:\/\d{2})?(?:\/\d{2})?$/.test(path)) {
    return { type: "exclude", reason: "date-archive" };
  }

  if (/^\/\?p=\d+$/i.test(`${pathname}${search}`)) {
    return { type: "ambiguous", reason: "wordpress-id-alias" };
  }

  if (segments.length > 1) {
    return { type: "ambiguous", reason: "nested-path" };
  }

  if (/^\d+$/.test(last)) {
    return { type: "medium", reason: "numeric-slug" };
  }

  if (/^\d{4}-\d{2}-\d{2}(?:-.+)?$/.test(last)) {
    return { type: "medium", reason: "date-like-slug" };
  }

  return { type: "high", reason: "single-slug" };
}

function pickSnapshot(timestamps) {
  return timestamps[Math.floor(timestamps.length / 2)] ?? null;
}

async function loadRows() {
  const rows = [];
  for (const path of inputPaths) {
    try {
      const json = JSON.parse(await Deno.readTextFile(path));
      rows.push(...json.slice(1));
    } catch {
      // Ignore missing temp files and use whatever is present.
    }
  }
  return rows;
}

async function main() {
  const rows = await loadRows();
  if (!rows.length) {
    throw new Error(`No CDX input found in ${inputPaths.join(", ")}`);
  }

  const existingPosts = await loadExistingPosts();
  const grouped = new Map();
  let scannedRows = 0;
  let excludedRows = 0;

  for (const row of rows) {
    const [timestamp, original, statusCode, mimeType] = row;
    scannedRows++;

    const year = Number(String(timestamp).slice(0, 4));
    if (year < startYear || year > endYear) {
      excludedRows++;
      continue;
    }
    if (statusCode !== "200" || mimeType !== "text/html") {
      excludedRows++;
      continue;
    }

    const normalized = normalizeOriginalUrl(original);
    if (!normalized) {
      excludedRows++;
      continue;
    }

    const parsed = new URL(normalized);
    const classification = classifyPath(parsed.pathname, parsed.search);
    if (classification.type === "exclude") {
      excludedRows++;
      continue;
    }

    const key = `${parsed.host}${parsed.pathname.replace(/\/$/, "") || "/"}`;
    const slug = slugify(parsed.pathname.split("/").filter(Boolean).at(-1) ?? "");
    const record = grouped.get(key) ?? {
      url: `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, "") || "/"}`,
      slug,
      path: parsed.pathname.replace(/\/$/, "") || "/",
      firstSeen: timestamp,
      lastSeen: timestamp,
      timestamps: [],
      years: new Set(),
      variants: new Set(),
      sourceUrls: new Set(),
      confidence: classification.type,
      reason: classification.reason,
    };

    record.firstSeen = record.firstSeen < timestamp ? record.firstSeen : timestamp;
    record.lastSeen = record.lastSeen > timestamp ? record.lastSeen : timestamp;
    record.timestamps.push(timestamp);
    record.years.add(year);
    record.variants.add(original);
    record.sourceUrls.add(normalized);

    if (record.confidence !== "high" && classification.type === "high") {
      record.confidence = "high";
      record.reason = classification.reason;
    }

    grouped.set(key, record);
  }

  const records = [...grouped.values()].map((record) => {
    record.timestamps.sort();
    const sampleTimestamp = pickSnapshot(record.timestamps);
    const snapshotUrl = sampleTimestamp
      ? `https://web.archive.org/web/${sampleTimestamp}/${record.url}`
      : null;
    const existing = existingPosts.get(record.slug);
    return {
      url: record.url,
      slug: record.slug,
      path: record.path,
      confidence: record.confidence,
      reason: record.reason,
      firstSeen: record.firstSeen,
      lastSeen: record.lastSeen,
      captureCount: record.timestamps.length,
      years: [...record.years].sort(),
      sampleTimestamp,
      sampleSnapshotUrl: snapshotUrl,
      variants: [...record.variants].sort(),
      alreadyImported: Boolean(existing),
      existingPostPath: existing?.path ?? null,
    };
  }).sort((a, b) => {
    const byConfidence = ["high", "medium", "ambiguous"];
    const confidenceDelta = byConfidence.indexOf(a.confidence) - byConfidence.indexOf(b.confidence);
    if (confidenceDelta !== 0) return confidenceDelta;
    return `${a.firstSeen} ${a.slug}`.localeCompare(`${b.firstSeen} ${b.slug}`);
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      type: "wayback-cdx",
      inputs: inputPaths,
      years: [startYear, endYear],
    },
    scannedRows,
    excludedRows,
    candidateCount: records.length,
    highConfidenceCount: records.filter((record) => record.confidence === "high").length,
    mediumConfidenceCount: records.filter((record) => record.confidence === "medium").length,
    ambiguousCount: records.filter((record) => record.confidence === "ambiguous").length,
    alreadyImportedCount: records.filter((record) => record.alreadyImported).length,
    records,
  };

  await Deno.mkdir("archive", { recursive: true });
  await Deno.writeTextFile(outputPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`Wrote ${outputPath}`);
  console.log(`Scanned rows: ${manifest.scannedRows}`);
  console.log(`Candidates: ${manifest.candidateCount}`);
  console.log(`High confidence: ${manifest.highConfidenceCount}`);
  console.log(`Medium confidence: ${manifest.mediumConfidenceCount}`);
  console.log(`Ambiguous: ${manifest.ambiguousCount}`);
  console.log(`Already imported: ${manifest.alreadyImportedCount}`);
}

await main();
