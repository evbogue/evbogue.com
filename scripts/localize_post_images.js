import { parseFrontmatter, stringifyFrontmatter } from "./restore_post_from_wayback.js";

function extFromUrl(url) {
  const clean = url.split("?")[0].split("#")[0];
  const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function extFromContentType(contentType) {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

async function fetchImage(url, timestamp) {
  const candidates = [];
  if (timestamp) {
    candidates.push(`https://web.archive.org/web/${timestamp}im_/${url}`);
  }
  candidates.push(url);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      return {
        bytes,
        contentType: res.headers.get("content-type") ?? "",
      };
    } catch {
      // try next
    }
  }

  return null;
}

export async function localizePostImages(postPath) {
  const text = await Deno.readTextFile(postPath);
  const { data, body } = parseFrontmatter(text);
  const matches = [...body.matchAll(/<img\b[^>]*\bsrc="(http[^"]+)"[^>]*>/gi)];

  if (!matches.length) {
    return { postPath, localized: 0, failed: [] };
  }

  const timestamp = (data.wayback_snapshot_url ?? "").match(/\/web\/(\d+)\//)?.[1] ?? null;
  const slug = data.slug ?? postPath.split("/").pop()?.replace(/\.md$/, "");
  let updatedBody = body;

  await Deno.mkdir("assets/posts", { recursive: true });

  let index = 0;
  const failed = [];
  let localized = 0;

  for (const match of matches) {
    index++;
    const src = match[1];
    if (src.startsWith("/assets/")) continue;
    const downloaded = await fetchImage(src, timestamp);
    if (!downloaded) {
      failed.push(src);
      continue;
    }

    const ext = extFromUrl(src) || extFromContentType(downloaded.contentType);
    const localName = `${slug}-img${index}${ext}`;
    const localPath = `assets/posts/${localName}`;
    await Deno.writeFile(localPath, downloaded.bytes);

    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    updatedBody = updatedBody.replace(new RegExp(`src="${escapedSrc}"`, "g"), `src="/assets/posts/${localName}"`);
    updatedBody = updatedBody.replace(new RegExp(`href="${escapedSrc}"`, "g"), `href="/assets/posts/${localName}"`);
    localized++;
  }

  if (localized > 0) {
    await Deno.writeTextFile(postPath, stringifyFrontmatter(data, updatedBody));
  }

  return { postPath, localized, failed };
}

if (import.meta.main) {
  const [postPath] = Deno.args;
  if (!postPath) {
    console.error("usage: deno run --allow-read --allow-write --allow-net scripts/localize_post_images.js <post-path>");
    Deno.exit(1);
  }

  const result = await localizePostImages(postPath);
  if (result.failed.length) {
    console.error(`Failed image sources for ${postPath}:`);
    for (const src of result.failed) console.error(src);
  }
  console.log(`Localized ${result.localized} images in ${postPath}`);
}
