import nodemailer from "npm:nodemailer";
import { hashClient, recordEvent } from "./lib/analytics.js";
import { excerptFromBody, loadPost } from "./lib/posts.js";
import { activeSubscribers, loadSubscribers, unsubscribeUrl } from "./lib/subscribers.js";

const ROOT = import.meta.dirname;

const args = Deno.args.filter((a) => !a.startsWith("--"));
const flags = new Set(Deno.args.filter((a) => a.startsWith("--")));
const slug = args[0];
const dryRun = flags.has("--dry-run");

if (!slug) {
  console.error("usage: deno run --allow-net --allow-read --allow-write --allow-env send-post.js <slug> [--dry-run]");
  Deno.exit(1);
}

let post;
try {
  post = await loadPost(ROOT, slug);
} catch {
  console.error(`Post not found: posts/${slug}.md`);
  Deno.exit(1);
}

const title = post.title || slug;
const excerpt = post.excerpt || excerptFromBody(post.body);
const url = `https://evbogue.com/posts/${slug}`;

const subscribers = activeSubscribers(await loadSubscribers(ROOT));

if (!subscribers.length) {
  console.log("No active subscribers. Nothing to send.");
  Deno.exit(0);
}

const SMTP_USER = Deno.env.get("SMTP_USER") || "ev@evbogue.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS");
if (!SMTP_PASS && !dryRun) {
  console.error("SMTP_PASS not set in env.");
  Deno.exit(1);
}

const ANALYTICS_SALT = Deno.env.get("ANALYTICS_SALT") || "evbogue-click";
const SITE_URL = "https://evbogue.com";

function wrapLinks(html, subHash, campaign) {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, rawUrl) => {
    if (rawUrl.includes("/unsubscribe")) return match;
    return `href="${SITE_URL}/c/${campaign}/${subHash}/${encodeURIComponent(rawUrl)}"`;
  });
}

function buildText(unsubUrl) {
  return `${title}

${excerpt}

Read it: ${url}

Best,
Ev
ev@evbogue.com | 773-510-8601

Unsubscribe: ${unsubUrl}`;
}

function buildHtml(unsubUrl) {
  return `<p style="font-size:1.1rem;"><strong>${title}</strong></p>
<p>${excerpt}</p>
<p><a href="${url}">Read it on evbogue.com</a></p>
<p>Best,<br>Ev<br><a href="mailto:ev@evbogue.com">ev@evbogue.com</a> | <a href="tel:7735108601">773-510-8601</a></p>
<p style="color:#888;font-size:12px;">Don't want these? <a href="${unsubUrl}">Unsubscribe</a>.</p>`;
}

console.log(`Post:    ${title}`);
console.log(`URL:     ${url}`);
console.log(`Sending: ${subscribers.length} subscriber(s)`);
if (dryRun) {
  console.log("\n[--dry-run] not sending. Subscribers:");
  for (const s of subscribers) console.log(`  - ${s.email}`);
  Deno.exit(0);
}

const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 587,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

await transporter.verify();

let sent = 0, failed = 0;
for (const sub of subscribers) {
  const unsubUrl = unsubscribeUrl(sub.token);
  const subHash = await hashClient(sub.token, ANALYTICS_SALT) ?? sub.token.slice(0, 12);
  try {
    await transporter.sendMail({
      from: `Ev Bogue <${SMTP_USER}>`,
      to: sub.email,
      subject: title,
      text: buildText(unsubUrl),
      html: wrapLinks(buildHtml(unsubUrl), subHash, slug),
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>, <mailto:${SMTP_USER}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    console.log(`  ok   ${sub.email}`);
    sent++;
  } catch (err) {
    console.error(`  fail ${sub.email} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. Sent: ${sent}. Failed: ${failed}.`);
if (sent > 0) {
  await recordEvent(ROOT, { kind: "send", slug, recipient_count: sent });
}
if (failed) Deno.exit(1);
