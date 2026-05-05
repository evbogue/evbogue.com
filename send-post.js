import nodemailer from "npm:nodemailer";
import { excerptFromBody, loadPost } from "./lib/posts.js";

const ROOT = import.meta.dirname;

const args = Deno.args.filter((a) => !a.startsWith("--"));
const flags = new Set(Deno.args.filter((a) => a.startsWith("--")));
const slug = args[0];
const dryRun = flags.has("--dry-run");

if (!slug) {
  console.error("usage: deno run --allow-net --allow-read --allow-env send-post.js <slug> [--dry-run]");
  Deno.exit(1);
}

let post;
try {
  post = await loadPost(ROOT, slug);
} catch {
  console.error(`Post not found: posts/${slug}.md`);
  Deno.exit(1);
}

if (post.draft) {
  console.error(`Refusing to send: ${slug} is a draft.`);
  Deno.exit(1);
}

const title = post.title || slug;
const excerpt = post.excerpt || excerptFromBody(post.body);
const url = `https://evbogue.com/posts/${slug}`;

let subscribers = [];
try {
  const parsed = JSON.parse(await Deno.readTextFile(`${ROOT}/subscribers.json`));
  if (Array.isArray(parsed)) subscribers = parsed;
} catch {
  console.error("subscribers.json missing or unreadable.");
  Deno.exit(1);
}

if (!subscribers.length) {
  console.log("No subscribers. Nothing to send.");
  Deno.exit(0);
}

const SMTP_USER = Deno.env.get("SMTP_USER") || "ev@evbogue.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS");
if (!SMTP_PASS && !dryRun) {
  console.error("SMTP_PASS not set in env.");
  Deno.exit(1);
}

const text = `${title}

${excerpt}

Read it: ${url}

—Ev
evbogue.com

Reply with "unsubscribe" to be removed from this list.`;

const html = `<p style="font-size:1.1rem;"><strong>${title}</strong></p>
<p>${excerpt}</p>
<p><a href="${url}">Read it on evbogue.com</a></p>
<p>—Ev<br>evbogue.com</p>
<p style="color:#888;font-size:12px;">Reply with "unsubscribe" to be removed from this list.</p>`;

console.log(`Post:    ${title}`);
console.log(`URL:     ${url}`);
console.log(`Sending: ${subscribers.length} subscriber(s)`);
if (dryRun) {
  console.log("\n[--dry-run] not sending. Subscribers:");
  for (const email of subscribers) console.log(`  - ${email}`);
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
for (const email of subscribers) {
  try {
    await transporter.sendMail({
      from: `Ev Bogue <${SMTP_USER}>`,
      to: email,
      subject: title,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    console.log(`  ok   ${email}`);
    sent++;
  } catch (err) {
    console.error(`  fail ${email} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. Sent: ${sent}. Failed: ${failed}.`);
if (failed) Deno.exit(1);
