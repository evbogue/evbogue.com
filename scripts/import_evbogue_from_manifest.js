import { stringifyFrontmatter } from "./restore_post_from_wayback.js";

const manifestPath = "archive/evbogue-2011-2016-manifest.json";
const outputDir = "archive/evbogue-drafts";
const allowedConfidence = new Set((Deno.args[0] ?? "high,medium").split(",").map((value) => value.trim()).filter(Boolean));

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromHtml(html) {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return (paragraphs[0] ?? "").slice(0, 220);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseHumanDate(value) {
  const cleaned = stripTags(value).replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  const date = new Date(`${cleaned} UTC`);
  if (Number.isNaN(date.getTime())) return null;
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rewriteWaybackLinks(html) {
  return html
    .replace(/https?:\/\/web\.archive\.org\/web\/\d+(?:im_|js_|cs_)?\//g, "")
    .replace(/https?:\/\/web\.archive\.org\/web\/\d+\//g, "")
    .replace(/href="https?:\/\/(?:www\.)?evbogue\.com\/([^"/?#]+)\/?"/gi, (_match, slug) => `href="/posts/${slug}"`)
    .replace(/href="\/web\/\d+\/https?:\/\/(?:www\.)?evbogue\.com\/([^"/?#]+)\/?"/gi, (_match, slug) => `href="/posts/${slug}"`)
    .replace(/src="\/web\/\d+im_\/http:\/\/(?:www\.)?evbogue\.com\//gi, 'src="http://evbogue.com/')
    .replace(/href="\/web\/\d+\/mailto:/gi, 'href="mailto:')
    .replace(/href="https?:\/\/web\.archive\.org\/web\/\d+\/mailto:/gi, 'href="mailto:');
}

function decodeEntities(html) {
  return html
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function cleanBody(html) {
  return decodeEntities(rewriteWaybackLinks(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "")
      .replace(/<div class="tweetmeme_button"[\s\S]*?<\/div>/gi, "")
      .replace(/<p>\s*Ev Bogue\s*<\/p>/gi, "")
      .replace(/<p>\s*You have permission to reprint[\s\S]*?<\/p>/gi, "")
      .replace(/<p style="text-align:\s*right;[\s\S]*?<\/p>/gi, "")
      .replace(/<p style="text-align:\s*left;[\s\S]*?<\/p>/gi, "")
      .replace(/<hr\/?>[\s\S]*$/i, "")
      .trim(),
  ));
}

function extractWordPress(pageHtml) {
  const titleMatch = pageHtml.match(/<h2[^>]*\bid="post-\d+"[^>]*><a [^>]*>([\s\S]*?)<\/a><\/h2>/i);
  if (!titleMatch) return null;
  const dateMatch = pageHtml.match(/Published by[\s\S]*?on ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/i);

  // Early 2011: body in <div class="main">
  const mainMatch = pageHtml.match(/<div class="main">\s*([\s\S]*?)\s*(?:<div class="tweetmeme_button"|<form\b|<\/div>\s*<!--<div class="meta">)/i);
  if (mainMatch) {
    return {
      title: stripTags(titleMatch[1]),
      date: dateMatch ? parseHumanDate(dateMatch[1]) : null,
      bodyHtml: cleanBody(mainMatch[1]),
      layout: "wordpress-2011",
    };
  }

  // Mid 2011: body in <div class="posts">, starts after <hr/> following the title
  const afterTitle = pageHtml.slice(titleMatch.index + titleMatch[0].length);
  const postsMatch = afterTitle.match(/^(?:<hr\/?>\s*)?([\s\S]*?)(?=<div[^>]*class="really_simple_share|<div[^>]*class="sidebar|<div[^>]*class="meta|<div id="disqus)/i);
  if (postsMatch) {
    return {
      title: stripTags(titleMatch[1]),
      date: dateMatch ? parseHumanDate(dateMatch[1]) : null,
      bodyHtml: cleanBody(postsMatch[1]),
      layout: "wordpress-2011b",
    };
  }

  return null;
}

function extractReserva(pageHtml) {
  const titleMatch = pageHtml.match(/<h1>([\s\S]*?)<\/h1>\s*<p style="color:\s*#666;">([\s\S]*?)<\/p>/i);
  if (!titleMatch) return null;
  const afterHeader = pageHtml.slice(titleMatch.index + titleMatch[0].length);
  const bodyMatch =
    afterHeader.match(/^([\s\S]*?)<hr\/?>\s*<p>You have permission to reprint/i) ??
    afterHeader.match(/^([\s\S]*?)<hr\/?>/i);
  if (!bodyMatch) return null;
  return {
    title: stripTags(titleMatch[1]),
    date: parseHumanDate(titleMatch[2]),
    bodyHtml: cleanBody(bodyMatch[1]),
    layout: "reserva-2014",
  };
}

function extractMetalwork(pageHtml) {
  const titleMatch = pageHtml.match(/<h3><a [^>]*>([\s\S]*?)<\/a><\/h3>\s*<p><strong>By [\s\S]*?<span style="color:\s*#666;">([\s\S]*?)<\/span><\/strong><\/p>/i);
  if (!titleMatch) return null;
  const afterHeader = pageHtml.slice(titleMatch.index + titleMatch[0].length);
  const bodyMatch = afterHeader.match(/^<div>([\s\S]*?)<\/div>\s*(?:<p style="text-align:\s*right;|<hr\/?>)/i);
  if (!bodyMatch) return null;
  return {
    title: stripTags(titleMatch[1]),
    date: parseHumanDate(titleMatch[2]),
    bodyHtml: cleanBody(bodyMatch[1]),
    layout: "metalwork-2016",
  };
}

function extractMinimal2013(pageHtml) {
  const containerMatch = pageHtml.match(/<div[^>]*class="ten columns offset-by-one"[^>]*>([\s\S]*?)(?=\n\s*<\/div>\s*\n\s*<\/div>)/i);
  if (!containerMatch) return null;
  const content = containerMatch[1];
  const titleMatch = content.match(/<h1>([\s\S]*?)<\/h1>/i);
  if (!titleMatch) return null;
  const afterTitle = content.slice(titleMatch.index + titleMatch[0].length).trim();
  if (!afterTitle) return null;
  return {
    title: stripTags(titleMatch[1]),
    date: null,
    bodyHtml: cleanBody(afterTitle),
    layout: "minimal-2013",
  };
}

function extractPost(pageHtml) {
  return extractWordPress(pageHtml) ?? extractReserva(pageHtml) ?? extractMetalwork(pageHtml) ?? extractMinimal2013(pageHtml);
}

async function importRecord(record) {
  const slug = record.slug;
  const response = await fetch(record.sampleSnapshotUrl);
  if (!response.ok) {
    throw new Error(`failed to fetch ${record.sampleSnapshotUrl}: ${response.status}`);
  }

  const pageHtml = await response.text();
  const extracted = extractPost(pageHtml);
  if (!extracted) {
    throw new Error(`no extractor matched ${record.sampleSnapshotUrl}`);
  }

  const bodyHtml = extracted.bodyHtml.trim();
  const finalSlug = slug || slugify(extracted.title);
  const frontmatter = {
    title: extracted.title,
    slug: finalSlug,
    date: extracted.date ?? record.firstSeen.slice(0, 4) + "-" + record.firstSeen.slice(4, 6) + "-" + record.firstSeen.slice(6, 8),
    tags: ["archive", "evbogue"],
    excerpt: excerptFromHtml(bodyHtml),
    original_url: record.url,
    wayback_snapshot_url: record.sampleSnapshotUrl,
    archive_layout: extracted.layout,
  };

  const finalPath = `${outputDir}/${finalSlug}.md`;
  await Deno.writeTextFile(finalPath, stringifyFrontmatter(frontmatter, bodyHtml));
  return { skipped: false, outputPath: finalPath };
}

async function main() {
  const manifest = JSON.parse(await Deno.readTextFile(manifestPath));
  await Deno.mkdir(outputDir, { recursive: true });

  const existingSlugs = new Set();
  for await (const entry of Deno.readDir(outputDir)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      existingSlugs.add(entry.name.replace(/\.md$/, ""));
    }
  }

  const records = manifest.records.filter(
    (record) => allowedConfidence.has(record.confidence) && !existingSlugs.has(record.slug),
  );

  let imported = 0;
  let failed = 0;

  console.log(`Attempting ${records.length} records (${existingSlugs.size} already drafted, skipped).\n`);

  for (const record of records) {
    try {
      const result = await importRecord(record);
      imported++;
      console.log(`Imported ${record.slug}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      console.error(`FAILED   ${record.slug}: ${error.message}`);
    }
  }

  console.log(`\nImported: ${imported}`);
  console.log(`Failed:   ${failed}`);
}

await main();
