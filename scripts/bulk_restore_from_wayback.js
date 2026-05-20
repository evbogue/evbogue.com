import { restorePost } from "./restore_post_from_wayback.js";

const allPosts = [];
for await (const entry of Deno.readDir("sites/evbogue.com/posts")) {
  if (entry.isFile && entry.name.endsWith(".md")) allPosts.push(`sites/evbogue.com/posts/${entry.name}`);
}
allPosts.sort();

const posts = [];
for (const postPath of allPosts) {
  const text = await Deno.readTextFile(postPath);
  if (text.includes("original_source_pdf:")) posts.push(postPath);
}

const concurrency = 6;
let cursor = 0;
let restored = 0;
let skipped = 0;

async function worker() {
  while (cursor < posts.length) {
    const index = cursor++;
    const postPath = posts[index];
    try {
      await restorePost(postPath);
      restored++;
      console.log(`Restored ${postPath}`);
    } catch (error) {
      skipped++;
      console.error(`${postPath}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, posts.length) }, () => worker()));

console.log(`Restored: ${restored}`);
console.log(`Skipped: ${skipped}`);
