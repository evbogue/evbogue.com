#!/usr/bin/env -S deno run --allow-read --allow-write
// Prune never-confirmed subscriber entries (spam bot signups that never
// clicked the double opt-in link).
//
// Safe by design:
//   - Dry-run by default. Pass --apply to actually write.
//   - Legacy bare-string entries (pre-confirmation imports) are kept.
//   - Confirmed and unsubscribed entries are always kept.
//   - Recent unconfirmed signups within the grace window are kept, so a real
//     person who just signed up and hasn't clicked yet isn't wiped.
//   - On --apply, writes a timestamped .bak next to each file first.
//
// Usage:
//   deno run --allow-read --allow-write scripts/prune_unconfirmed.js
//   deno run --allow-read --allow-write scripts/prune_unconfirmed.js --apply
//   deno run --allow-read --allow-write scripts/prune_unconfirmed.js --grace=0 --apply

import { SITES_DIR } from "../lib/sites.js"

const args = new Set(Deno.args.filter((a) => !a.startsWith("--grace")))
const APPLY = args.has("--apply")
const graceArg = Deno.args.find((a) => a.startsWith("--grace="))
const GRACE_DAYS = graceArg ? Number(graceArg.split("=")[1]) : 2
const cutoff = Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000

function isUnconfirmedSpam(entry) {
  if (typeof entry !== "object" || entry === null) return false // legacy string = keep
  if (entry.confirmed_at) return false
  if (entry.unsubscribed_at) return false
  const ts = Date.parse(entry.subscribed_at ?? "")
  if (Number.isFinite(ts) && ts >= cutoff) return false // still in grace window
  return true
}

async function subscriberFiles() {
  const files = []
  for await (const dir of Deno.readDir(SITES_DIR)) {
    if (!dir.isDirectory) continue
    const path = `${SITES_DIR}/${dir.name}/subscribers.json`
    try {
      await Deno.stat(path)
      files.push(path)
    } catch {
      // no subscribers file for this site
    }
  }
  return files
}

let totalRemoved = 0
const stamp = new Date().toISOString().replace(/[:.]/g, "-")

for (const path of await subscriberFiles()) {
  let list
  try {
    list = JSON.parse(await Deno.readTextFile(path))
  } catch (err) {
    console.error(`! skip ${path}: ${err.message}`)
    continue
  }
  if (!Array.isArray(list)) {
    console.error(`! skip ${path}: not an array`)
    continue
  }

  const remove = list.filter(isUnconfirmedSpam)
  const keep = list.filter((e) => !isUnconfirmedSpam(e))

  console.log(`\n=== ${path} ===`)
  console.log(`total: ${list.length}  keep: ${keep.length}  prune: ${remove.length}  (grace ${GRACE_DAYS}d)`)
  for (const e of remove.slice(0, 10)) {
    console.log(`  - ${e.email ?? "(no email)"}  signed up ${e.subscribed_at ?? "?"}  source=${e.source ?? "?"}`)
  }
  if (remove.length > 10) console.log(`  … and ${remove.length - 10} more`)

  totalRemoved += remove.length

  if (APPLY && remove.length > 0) {
    const bak = `${path}.${stamp}.bak`
    await Deno.writeTextFile(bak, JSON.stringify(list, null, 2))
    const tmp = `${path}.tmp`
    await Deno.writeTextFile(tmp, JSON.stringify(keep, null, 2))
    await Deno.rename(tmp, path)
    console.log(`  ✓ wrote ${keep.length} entries (backup: ${bak})`)
  }
}

console.log(`\n${APPLY ? "Pruned" : "Would prune"} ${totalRemoved} unconfirmed entr${totalRemoved === 1 ? "y" : "ies"}.`)
if (!APPLY && totalRemoved > 0) console.log("Re-run with --apply to write changes.")
