import nodemailer from "npm:nodemailer";

const ROOT = import.meta.dirname;

const args = Deno.args.filter((a) => !a.startsWith("--"));
const flags = new Set(Deno.args.filter((a) => a.startsWith("--")));
const slug = args[0];
const dryRun = flags.has("--dry-run");

if (!slug) {
  console.error("usage: deno run --allow-net --allow-read --allow-env send-post.js <slug> [--dry-run]");
  Deno.exit(1);
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else if (v === "true") v = true;
    else if (v === "false") v = false;
    data[k] = v;
  }
  return { data, body: m[2] };
}

let raw;
try {
  raw = await Deno.readTextFile(`${ROOT}/posts/${slug}.md`);
} catch {
  console.error(`Post not found: posts/${slug}.md`);
  Deno.exit(1);
}

const { data, body } = parseFrontmatter(raw);
if (data.draft) {
  console.error(`Refusing to send: ${slug} is a draft.`);
  Deno.exit(1);
}

const title = data.title || slug;
const excerpt = data.excerpt || body.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 260);
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
