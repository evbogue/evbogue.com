#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "fs";

// --- frontmatter helpers (ported from restore_post_from_wayback.js) ---

function parseFrontmatter(text) {
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

function stringifyFrontmatter(data, body) {
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

// --- conversion ---

const ENTITY_MAP = [
  ["&#8217;", "'"], ["&#8216;", "'"],
  ["&#8220;", '"'], ["&#8221;", '"'],
  ["&#8211;", "-"], ["&#8212;", "--"],
  ["&#8230;", "..."], ["&#038;", "&"],
  ["&#39;", "'"], ["&amp;", "&"],
  ["&lt;", "<"], ["&gt;", ">"],
  ["&nbsp;", " "], ["&ndash;", "-"],
  ["&mdash;", "--"], ["&hellip;", "..."],
  ["&quot;", '"'], ["&apos;", "'"],
];

function decodeEntities(text) {
  for (const [entity, char] of ENTITY_MAP) {
    text = text.replaceAll(entity, char);
  }
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  return text;
}

function isHtml(body) {
  return /<[a-z][^>]*>/i.test(body);
}

function htmlToMarkdown(html) {
  let md = html;

  // 1. Remove dead embedded media
  md = md.replace(/<object[\s\S]*?<\/object>/gi, "");
  md = md.replace(/<embed[^>]*\/?>/gi, "");
  md = md.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  md = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  md = md.replace(/<form[\s\S]*?<\/form>/gi, "");
  md = md.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // 2. Remove dead social/share infrastructure
  md = md.replace(/<div[^>]*class="[^"]*(?:sharebuttons|really_simple_share|entry_footer)[^"]*"[\s\S]*?<\/div>/gi, "");
  md = md.replace(/<div[^>]*id="(?:comment|disqus_thread|dsq-content)[^"]*"[\s\S]*/gi, "");

  // 3. WordPress image div with caption → Markdown image
  md = md.replace(
    /<div[^>]*class="[^"]*wp-caption[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, content) => {
      const imgMatch = content.match(/<img([^>]*)>/i);
      const captionMatch = content.match(/<p[^>]*class="wp-caption-text"[^>]*>([\s\S]*?)<\/p>/i);
      if (!imgMatch) return "";
      const srcMatch = imgMatch[1].match(/src="([^"]+)"/);
      const altMatch = imgMatch[1].match(/alt="([^"]+)"/);
      const src = srcMatch ? srcMatch[1] : "";
      const captionText = captionMatch ? decodeEntities(captionMatch[1]).replace(/<[^>]+>/g, "").trim() : "";
      const alt = altMatch ? decodeEntities(altMatch[1]) : captionText;
      if (!src || !src.startsWith("/assets/")) return "";
      return `\n![${alt}](${src})\n\n`;
    }
  );

  // 4. Standalone img tags
  md = md.replace(/<img([^>]*)>/gi, (_, attrs) => {
    const srcMatch = attrs.match(/src="([^"]+)"/);
    const altMatch = attrs.match(/alt="([^"]+)"/);
    const src = srcMatch ? decodeEntities(srcMatch[1]) : "";
    const alt = altMatch ? decodeEntities(altMatch[1]) : "";
    if (!src || !src.startsWith("/assets/")) return "";
    return `![${alt}](${src})`;
  });

  // 5. Strip div tags (keep content)
  md = md.replace(/<div[^>]*>/gi, "");
  md = md.replace(/<\/div>/gi, "\n");

  // 6. Headings
  for (let i = 6; i >= 1; i--) {
    const hashes = "#".repeat(i);
    md = md.replace(
      new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
      (_, content) => `\n${hashes} ${content.trim()}\n\n`
    );
  }

  // 7. Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content.trim().split("\n")
      .map((l) => `> ${l.trim()}`)
      .filter((l) => l !== "> ")
      .join("\n");
    return `\n${lines}\n\n`;
  });

  // 8. Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let i = 1;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, item) => `${i++}. ${item.trim()}\n`);
    return `\n${items.trim()}\n\n`;
  });

  // 9. Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, item) => `- ${item.trim()}\n`);
    return `\n${items.trim()}\n\n`;
  });

  // 10. Inline: del, strong, em, anchors (unlink), br, span
  md = md.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, "~~$1~~");
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  md = md.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<span[^>]*>/gi, "");
  md = md.replace(/<\/span>/gi, "");

  // 11. Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const trimmed = content.trim();
    if (!trimmed) return "";
    return `${trimmed}\n\n`;
  });

  // 12. Decode entities
  md = decodeEntities(md);

  // 13. Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // 14. Clean up empty markers (only ** ** and ~~ ~~, never single * which would eat bold pairs)
  md = md.replace(/\*\*[ \t]*\*\*/g, "");
  md = md.replace(/~~[ \t]*~~/g, "");

  // 15. Whitespace
  md = md.replace(/[ \t]+$/gm, "");
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}

// --- main ---

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["posts"];

let restored = 0;
let alreadyClean = 0;
let skipped = 0;

for (const dir of dirs) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(`Cannot read dir: ${dir}`);
    continue;
  }

  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const path = `${dir}/${name}`;

    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      console.error(`Cannot read: ${path}`);
      continue;
    }

    const { data, body } = parseFrontmatter(text);

    if (!isHtml(body)) {
      alreadyClean++;
      continue;
    }

    const mdBody = htmlToMarkdown(body);

    if (!mdBody.trim()) {
      console.warn(`WARN: ${path} — empty body after conversion, skipping`);
      skipped++;
      continue;
    }

    data.archive_status = "restored";
    data.restored_on = "2026-05-03";
    data.restoration_note = "Mechanical cleanup only; original essay preserved.";

    writeFileSync(path, stringifyFrontmatter(data, mdBody), "utf8");
    restored++;
    console.log(`Restored ${path}`);
  }
}

console.log(`\nRestored:      ${restored}`);
console.log(`Already clean: ${alreadyClean}`);
console.log(`Skipped:       ${skipped}`);
