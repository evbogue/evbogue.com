import { localizePostImages } from "./localize_post_images.js";

const dirs = ["posts", "archive/evbogue-drafts", "archive/drafts"];
const args = Deno.args;
const targetDirs = args.length ? args : dirs;

let localizedPosts = 0;
let localizedImages = 0;
const failures = [];

for (const dir of targetDirs) {
  let entries;
  try {
    entries = Deno.readDir(dir);
  } catch {
    continue;
  }

  for await (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    const postPath = `${dir}/${entry.name}`;
    const text = await Deno.readTextFile(postPath);
    if (!/<img\b[^>]*\bsrc="http/i.test(text)) continue;

    const result = await localizePostImages(postPath);
    if (result.localized > 0) {
      localizedPosts++;
      localizedImages += result.localized;
      console.log(`Localized ${result.localized} images in ${postPath}`);
    }
    if (result.failed.length) {
      failures.push({ postPath, failed: result.failed });
    }

    if (result.localized > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

console.log(`\nPosts updated: ${localizedPosts}`);
console.log(`Images localized: ${localizedImages}`);
if (failures.length) {
  console.log(`Posts with failed images: ${failures.length}`);
  for (const item of failures) {
    console.log(`${item.postPath}: ${item.failed.length} failures`);
  }
}
