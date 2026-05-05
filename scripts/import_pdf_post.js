const args = [...Deno.args];
const publish = args.includes("--publish");
const filteredArgs = args.filter((arg) => arg !== "--publish");
const [pdfPath, outputDir = publish ? "posts" : "drafts"] = filteredArgs;

if (!pdfPath) {
  console.error("usage: deno run --allow-read --allow-write --allow-run scripts/import_pdf_post.js [--publish] <pdf-path> [output-dir]");
  Deno.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseFilename(path) {
  const filename = path.split("/").pop() ?? path;
  const stem = filename.replace(/\.pdf$/i, "");
  const match = stem.match(/^(\d{4})(\d{2})(\d{2})_(.+)$/);

  if (!match) {
    return {
      filename,
      title: stem,
      slug: slugify(stem),
      date: new Date().toISOString().slice(0, 10),
    };
  }

  const [, year, month, day, rawTitle] = match;
  const title = rawTitle.replace(/\s+/g, " ").trim();

  return {
    filename,
    title,
    slug: slugify(title),
    date: `${year}-${month}-${day}`,
  };
}

function cleanExtractedText(text, title) {
  const lines = text.split("\n").map((line) => line.replace(/\s+$/g, ""));
  const filtered = [];
  let skippedLeadingTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      !skippedLeadingTitle &&
      (trimmed === title || trimmed.startsWith(title) || trimmed.startsWith(title.replace(" - ", " (") ))
    ) {
      skippedLeadingTitle = true;
      continue;
    }

    if (
      trimmed === "Far Beyond The Stars" ||
      trimmed === "Humanity, Second Selves, and Cybernetic Yoga" ||
      trimmed.startsWith("Page ") ||
      /^Written by Everett Bogue \|/.test(trimmed) ||
      /^Post written by Everett Bogue \|/.test(trimmed) ||
      trimmed.endsWith("«") ||
      /Augmented Humanity.*Cybernetic Yoga/.test(trimmed) ||
      trimmed.includes("« Far Beyond The Stars") ||
      /^https?:\/\//.test(trimmed) ||
      /^Seite \d+ von \d+$/i.test(trimmed) ||
      /^\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}$/.test(trimmed) ||
      /^READABILITY\b/.test(trimmed) ||
      /^Excerpted from\b/.test(trimmed) ||
      /^Written by Everett Bogue\b/.test(trimmed) ||
      /^Post written by Everett Bogue\b/.test(trimmed) ||
      /^Follow me on Twitter\b/.test(trimmed)
    ) {
      continue;
    }

    filtered.push(line);
  }

  const paragraphs = [];
  let chunk = [];

  for (const line of filtered) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (chunk.length) {
        paragraphs.push(chunk.join(" ").replace(/\s+/g, " ").trim());
        chunk = [];
      }
      continue;
    }
    chunk.push(trimmed);
  }

  if (chunk.length) {
    paragraphs.push(chunk.join(" ").replace(/\s+/g, " ").trim());
  }

  const cleaned = paragraphs.join("\n\n").trim();

  return cleaned
    .replace(/\b([A-Za-z]+)- ([a-z]+)/g, "$1$2")
    .replace(/\n\n(\d+\.\s)/g, "\n\n$1");
}

function firstParagraph(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return paragraphs[0] ?? "";
}

const meta = parseFilename(pdfPath);
const extractor = new Deno.Command("swift", {
  args: [
    "-module-cache-path",
    "/tmp/swift-module-cache",
    "scripts/extract_pdf_text.swift",
    pdfPath,
  ],
  env: {
    SWIFT_MODULECACHE_PATH: "/tmp/swift-module-cache",
  },
  stdout: "piped",
  stderr: "piped",
});

const output = await extractor.output();
if (output.code !== 0) {
  console.error(new TextDecoder().decode(output.stderr));
  Deno.exit(output.code);
}

const rawText = new TextDecoder().decode(output.stdout);
const body = cleanExtractedText(rawText, meta.title);
const excerpt = firstParagraph(body).slice(0, 220);

const frontmatter = [
  "---",
  `title: "${meta.title.replaceAll('"', '\\"')}"`,
  `slug: ${meta.slug}`,
  `date: ${meta.date}`,
  "tags: [archive, import]",
  `excerpt: "${excerpt.replaceAll('"', '\\"')}"`,
  `original_source_pdf: "${pdfPath}"`,
  "---",
  "",
].join("\n");

await Deno.mkdir(outputDir, { recursive: true });
const outputPath = `${outputDir}/${meta.slug}.md`;
await Deno.writeTextFile(outputPath, `${frontmatter}${body}\n`);

console.log(`Wrote ${outputPath}`);
