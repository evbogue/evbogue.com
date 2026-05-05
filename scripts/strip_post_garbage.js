import { parseFrontmatter, stringifyFrontmatter } from "./restore_post_from_wayback.js";

const dirs = Deno.args.length ? Deno.args : ["posts", "drafts", "archive/evbogue-drafts"];

function stripGarbage(body) {
  return body
    // Remove share button blocks
    .replace(/<div[^>]*class="sharebuttons"[\s\S]*?<\/div>/gi, "")
    .replace(/<a[^>]*name="fb_share"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<div[^>]*class="really_simple_share[\s\S]*?<\/div>/gi, "")
    // Remove entry footer (View Comments :: RSS/Email)
    .replace(/<div[^>]*class="entry_footer"[\s\S]*?<\/div>/gi, "")
    // Remove everything from the comment section onward
    .replace(/<div[^>]*id="comment"[\s\S]*$/i, "")
    .replace(/<div[^>]*id="disqus_thread"[\s\S]*$/i, "")
    .replace(/<div[^>]*id="dsq-content"[\s\S]*$/i, "")
    // Remove social/share boilerplate paragraphs
    .replace(/<p[^>]*>\s*(?:Share|Tweet|View Comments?)[^<]*<\/p>/gi, "")
    .replace(/<p[^>]*>.*?View Comments.*?Receive free.*?(?:RSS|Email).*?<\/p>/gi, "")
    // Remove feedburner/RSS subscribe nudges
    .replace(/<p[^>]*>.*?feedburner.*?<\/p>/gi, "")
    .replace(/<p[^>]*>.*?Receive free updates.*?<\/p>/gi, "")
    // Remove Google+/Twitter/Facebook follow prompts
    .replace(/<p[^>]*>.*?(?:Follow me on|find me on|connect on)\s*(?:<a[^>]*>)?(?:Google\+?|Twitter|Facebook).*?<\/p>/gi, "")
    // Remove leftover empty spans and double blank lines
    .replace(/<span[^>]*>\s*<\/span>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let cleaned = 0;
let unchanged = 0;

for (const dir of dirs) {
  let entries;
  try { entries = Deno.readDir(dir); } catch { continue; }

  for await (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    const path = `${dir}/${entry.name}`;
    const text = await Deno.readTextFile(path);
    const { data, body } = parseFrontmatter(text);
    const newBody = stripGarbage(body);
    if (newBody === body.trim()) {
      unchanged++;
      continue;
    }
    await Deno.writeTextFile(path, stringifyFrontmatter(data, newBody));
    cleaned++;
    console.log(`Cleaned ${path}`);
  }
}

console.log(`\nCleaned: ${cleaned}`);
console.log(`Unchanged: ${unchanged}`);
