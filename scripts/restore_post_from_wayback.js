export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: text };
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
    } else if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }
    data[key] = value;
  }
  return { data, body: match[2] };
}

export function stringifyFrontmatter(data, body) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(", ")}]`);
      continue;
    }
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
      continue;
    }
    lines.push(`${key}: "${String(value).replaceAll('"', '\\"')}"`);
  }
  lines.push("---", "", body.trim(), "");
  return lines.join("\n");
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&#038;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtmlBody(html, originalUrl) {
  let cleaned = html
    .replace(/<div class="tweetmeme_button"[\s\S]*?<\/div>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/span><span style="float: left; margin-right: 15px">[\s\S]*?<\/span>/gi, "")
    .replace(/<p><em>Written by Everett Bogue[\s\S]*?<\/p>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/https:\/\/web\.archive\.org\/web\/\d+(?:im_|js_|cs_)?\//g, "")
    .replace(/https?:\/\/web\.archive\.org\/web\/\d+\//g, "")
    .replace(/(?:<\/div>\s*)+$/i, "")
    .trim();

  if (originalUrl) {
    const slug = originalUrl.split("/").filter(Boolean).pop();
    if (slug) {
      cleaned = cleaned.replace(
        new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        `/posts/${slug}`,
      );
    }
  }

  return cleaned;
}

function excerptFromHtml(html) {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return (paragraphs[0] ?? "").slice(0, 220);
}

function slugFromOriginalUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

async function extractOriginalUrl(pdfPath) {
  const command = new Deno.Command("swift", {
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
  const result = await command.output();
  if (result.code !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  const text = new TextDecoder().decode(result.stdout);
  const urls = [...text.matchAll(/http:\/\/(?:www\.)?(?:farbeyondthestars|evbogue)\.com\/[^\s)"]+/g)].map((m) => m[0]);
  return urls.find((url) => /\/[^/]+\/?$/.test(url));
}

async function fetchClosestSnapshot(originalUrl, date) {
  const year = Number(date.slice(0, 4));
  const target = Number(date.replaceAll("-", ""));
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(originalUrl)}` +
    `&from=${year - 1}0101&to=${year + 1}1231&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=50`;
  const rows = await fetch(cdxUrl).then((res) => res.json());
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const candidates = rows.slice(1).map(([timestamp]) => ({ timestamp, score: Math.abs(Number(timestamp.slice(0, 8)) - target) }));
  candidates.sort((a, b) => a.score - b.score);
  const closest = candidates[0];
  return closest ? `https://web.archive.org/web/${closest.timestamp}/${originalUrl}` : null;
}

function extractEntryHtml(pageHtml) {
  const mainMatch = pageHtml.match(/<div class="entry">([\s\S]*?)<\/div><!-- \/main -->/i);
  if (!mainMatch) return null;
  let entry = mainMatch[1];
  const titleMatch = entry.match(/<h2 class="entrytitle"><a [^>]*>([\s\S]*?)<\/a><\/h2>/i);
  if (!titleMatch) return null;
  entry = entry.replace(/^[\s\S]*?<\/p>/i, "");
  return {
    title: stripTags(titleMatch[1]),
    bodyHtml: entry.trim(),
  };
}

export async function restorePost(postPath) {
  const postText = await Deno.readTextFile(postPath);
  const { data } = parseFrontmatter(postText);
  if (!data.original_source_pdf) {
    throw new Error(`missing original_source_pdf in ${postPath}`);
  }

  const originalUrl = data.original_url || await extractOriginalUrl(data.original_source_pdf);
  if (!originalUrl) {
    throw new Error(`no original url found for ${postPath}`);
  }

  const snapshotUrl = await fetchClosestSnapshot(originalUrl, data.date);
  if (!snapshotUrl) {
    throw new Error(`no wayback snapshot found for ${originalUrl}`);
  }

  const pageHtml = await fetch(snapshotUrl).then((res) => res.text());
  const extracted = extractEntryHtml(pageHtml);
  if (!extracted) {
    throw new Error(`could not extract entry html from ${snapshotUrl}`);
  }

  const originalSlug = slugFromOriginalUrl(originalUrl);
  const bodyHtml = cleanHtmlBody(extracted.bodyHtml, originalUrl)
    .replace(new RegExp(`href="${originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"), `href="/posts/${data.slug}"`)
    .replace(new RegExp(`href="http://www\\.farbeyondthestars\\.com/${originalSlug}/"`, "g"), `href="/posts/${data.slug}"`);

  const updated = {
    ...data,
    title: extracted.title,
    excerpt: excerptFromHtml(bodyHtml),
    original_url: originalUrl,
    wayback_snapshot_url: snapshotUrl,
  };

  await Deno.writeTextFile(postPath, stringifyFrontmatter(updated, bodyHtml));
  return { postPath, originalUrl, snapshotUrl };
}

if (import.meta.main) {
  const [postPath] = Deno.args;
  if (!postPath) {
    console.error("usage: deno run --allow-read --allow-write --allow-run --allow-net scripts/restore_post_from_wayback.js <post-path>");
    Deno.exit(1);
  }

  try {
    await restorePost(postPath);
    console.log(`Restored ${postPath}`);
  } catch (error) {
    console.error(error.message);
    Deno.exit(1);
  }
}
