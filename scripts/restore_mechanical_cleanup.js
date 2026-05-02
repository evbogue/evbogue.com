import { parseFrontmatter, stringifyFrontmatter } from "./restore_post_from_wayback.js";

const paths = Deno.args;

if (!paths.length) {
  console.error("usage: deno run --allow-read --allow-write scripts/restore_mechanical_cleanup.js <post.md> [...]");
  Deno.exit(1);
}

const entityMap = new Map([
  ["&#8217;", "'"],
  ["&#8216;", "'"],
  ["&#8220;", '"'],
  ["&#8221;", '"'],
  ["&#8211;", "-"],
  ["&#8212;", "--"],
  ["&#8230;", "..."],
  ["&#038;", "&"],
]);

function decodeEntitiesOutsideAttrs(body) {
  return body
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) return part;
      for (const [from, to] of entityMap) part = part.replaceAll(from, to);
      return part;
    })
    .join("");
}

function stripApprovedDeadFurniture(body) {
  return body
    .replace(/\n?<p>\s*(?:&#8211;|&ndash;|–|-|--)\s*<\/p>\s*$/gi, "\n")
    .replace(/\n?<p>\s*You might have noticed that I don(?:&#8217;|'|’)t have comments\.[\s\S]*?twitter!<\/a><\/p>\s*$/i, "\n")
    .replace(/\n?<p>\s*If you liked this story,[\s\S]*?tweet about it!<\/a><\/p>\s*$/i, "\n")
    .replace(/\n?<p>\s*Let me know how you(?:&#8217;|'|’)re tackling clutter in the comments![\s\S]*?<\/p>\s*$/i, "\n");
}

function stripDeadPlatformLinks(body) {
  return body
    .replace(/<a\b[^>]*href=["']https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

function fixObviousImportDamage(body) {
  return body
    .replace(/<br\/>\n2They\b/g, "<br/>\n2, They")
    .replace(/<br\/>\n3, They\b/g, "<br/>\n3, They")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let changed = 0;

for (const path of paths) {
  const text = await Deno.readTextFile(path);
  const { data, body } = parseFrontmatter(text);
  let nextBody = body;

  nextBody = stripApprovedDeadFurniture(nextBody);
  nextBody = stripDeadPlatformLinks(nextBody);
  nextBody = decodeEntitiesOutsideAttrs(nextBody);
  nextBody = stripApprovedDeadFurniture(nextBody);
  nextBody = stripDeadPlatformLinks(nextBody);
  nextBody = fixObviousImportDamage(nextBody);

  if (nextBody === body.trim()) {
    console.log(`Unchanged ${path}`);
    continue;
  }

  data.archive_status = "restored";
  data.restored_on = new Date().toISOString().slice(0, 10);
  data.restoration_note = "Mechanical cleanup only; original essay preserved.";

  await Deno.writeTextFile(path, stringifyFrontmatter(data, nextBody));
  changed++;
  console.log(`Restored ${path}`);
}

console.log(`\nRestored: ${changed}`);
