const archiveDir = "fbts_evbogue_mnml";
const postsDir = "posts";
const outputPath = "archive/pdf-manifest.json";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function inferRecord(relativePath) {
  const filename = relativePath.split("/").pop() ?? relativePath;
  const stem = filename.replace(/\.pdf$/i, "");
  const match = stem.match(/^(\d{4})(\d{2})(\d{2})_(.+)$/);

  if (!match) {
    return {
      path: relativePath,
      filename,
      title: stem,
      slug: slugify(stem),
      date: null,
      source: relativePath.includes("/_evs_free_eBooks/") ? "ebook" : "pdf",
      inferred: false,
    };
  }

  const [, year, month, day, rawTitle] = match;
  const title = rawTitle.replace(/\s+/g, " ").trim();

  return {
    path: relativePath,
    filename,
    title,
    slug: slugify(title),
    date: `${year}-${month}-${day}`,
    source: relativePath.includes("/_evs_free_eBooks/") ? "ebook" : "pdf",
    inferred: true,
  };
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

  for await (const entry of Deno.readDir(postsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    const path = `${postsDir}/${entry.name}`;
    const text = await Deno.readTextFile(path);
    const frontmatter = parsePostFrontmatter(text);
    if (!frontmatter.slug) continue;
    map.set(frontmatter.slug, {
      path,
      title: frontmatter.title ?? entry.name,
      date: frontmatter.date ?? null,
    });
  }

  return map;
}

async function walk(dir, prefix = dir) {
  const files = [];
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      files.push(...await walk(path, prefix));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith(".pdf")) continue;
    files.push(path.slice(prefix.length + 1));
  }
  return files;
}

async function main() {
  const existingPosts = await loadExistingPosts();
  const pdfs = await walk(archiveDir);
  const records = pdfs.map(inferRecord).sort((a, b) => {
    const aKey = `${a.date ?? "9999-99-99"} ${a.title}`;
    const bKey = `${b.date ?? "9999-99-99"} ${b.title}`;
    return aKey.localeCompare(bKey);
  }).map((record) => {
    const existing = existingPosts.get(record.slug);
    return {
      ...record,
      alreadyImported: Boolean(existing),
      existingPostPath: existing?.path ?? null,
    };
  });

  const datedRecords = records.filter((record) => record.date);
  const duplicateSlugs = Object.entries(
    records.reduce((acc, record) => {
      acc[record.slug] = (acc[record.slug] ?? 0) + 1;
      return acc;
    }, {}),
  ).filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: archiveDir,
    totalPdfs: records.length,
    datedPdfs: datedRecords.length,
    firstDate: datedRecords[0]?.date ?? null,
    lastDate: datedRecords[datedRecords.length - 1]?.date ?? null,
    alreadyImportedCount: records.filter((record) => record.alreadyImported).length,
    duplicateSlugCount: duplicateSlugs.length,
    duplicateSlugs,
    records,
  };

  await Deno.mkdir("archive", { recursive: true });
  await Deno.writeTextFile(outputPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`Wrote ${outputPath}`);
  console.log(`PDFs: ${manifest.totalPdfs}`);
  console.log(`Date range: ${manifest.firstDate ?? "unknown"} to ${manifest.lastDate ?? "unknown"}`);
  console.log(`Already imported: ${manifest.alreadyImportedCount}`);
  console.log(`Duplicate slugs: ${manifest.duplicateSlugCount}`);
}

await main();
