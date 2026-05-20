import { activeSubscribers, loadSubscribers, saveSubscribers } from "./lib/subscribers.js";
import { sendReconfirmation } from "./lib/mailer.js";
import { loadSites, siteById } from "./lib/sites.js";

const args = Deno.args.filter((a) => !a.startsWith("--"));
const flags = new Set(Deno.args.filter((a) => a.startsWith("--")));
const siteId = Deno.args.find((a) => a.startsWith("--site="))?.slice("--site=".length) || "evbogue.com";
const site = siteById(await loadSites(), siteId);
const targetEmail = args[0]?.trim().toLowerCase();
const dryRun = flags.has("--dry-run");

const SMTP_PASS = Deno.env.get("SMTP_PASS");
if (!SMTP_PASS && !dryRun) {
  console.error("SMTP_PASS not set in env.");
  Deno.exit(1);
}

const subscribers = await loadSubscribers(site.subscribersPath);
const candidates = activeSubscribers(subscribers);

const targets = targetEmail
  ? candidates.filter((s) => s.email === targetEmail)
  : candidates;

if (targetEmail && !targets.length) {
  console.error(`No active subscriber matching ${targetEmail}.`);
  Deno.exit(1);
}

if (!targets.length) {
  console.log("No active subscribers to reconfirm. Nothing to do.");
  Deno.exit(0);
}

console.log(`Site: ${site.id}`);
console.log(`Reconfirming ${targets.length} subscriber(s)${targetEmail ? "" : " (all active)"}:`);
for (const s of targets) console.log(`  - ${s.email}`);

if (dryRun) {
  console.log("\n[--dry-run] not resetting confirmed_at, not sending.");
  Deno.exit(0);
}

let sent = 0, failed = 0;
for (const entry of targets) {
  try {
    await sendReconfirmation(entry, site);
    entry.confirmed_at = null;
    await saveSubscribers(site.subscribersPath, subscribers);
    console.log(`  ok   ${entry.email}`);
    sent++;
  } catch (err) {
    console.error(`  fail ${entry.email} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. Reconfirmation emails — sent: ${sent}, failed: ${failed}.`);
if (failed) Deno.exit(1);
