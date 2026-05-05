const pdfDir = "fbts_evbogue_mnml";
const publish = Deno.args.includes("--publish");

async function walk(dir) {
  const files = [];
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      files.push(...await walk(path));
      continue;
    }
    if (entry.name.toLowerCase().endsWith(".pdf")) files.push(path);
  }
  return files;
}

async function loadExistingSlugs() {
  const slugs = new Set();
  for (const dir of ["posts", "drafts"]) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        slugs.add(entry.name.replace(/\.md$/, ""));
      }
    } catch {
      // ignore
    }
  }
  return slugs;
}

function inferSlug(path) {
  const filename = path.split("/").pop() ?? path;
  const stem = filename.replace(/\.pdf$/i, "");
  const match = stem.match(/^\d{8}_(.+)$/);
  const raw = match ? match[1] : stem;
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const existingSlugs = await loadExistingSlugs();
const pdfs = (await walk(pdfDir))
  .filter((path) => !path.includes("/_evs_free_eBooks/"))
  .sort();

let imported = 0;
let skipped = 0;

for (const pdfPath of pdfs) {
  const slug = inferSlug(pdfPath);
  if (existingSlugs.has(slug)) {
    skipped++;
    continue;
  }

  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "scripts/import_pdf_post.js",
      ...(publish ? ["--publish"] : []),
      pdfPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await command.output();
  if (result.code !== 0) {
    console.error(new TextDecoder().decode(result.stderr));
    Deno.exit(result.code);
  }

  imported++;
  existingSlugs.add(slug);
  console.log(new TextDecoder().decode(result.stdout).trim());
}

console.log(`Imported: ${imported}`);
console.log(`Skipped: ${skipped}`);
