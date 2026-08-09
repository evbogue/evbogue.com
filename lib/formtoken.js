// Signed, time-boxed token embedded in the subscribe form.
//
// It proves a POST to /subscribe came from a page this server actually rendered,
// and it measures how long the form was on screen before submission. The
// timestamp travels inside the token and is HMAC-signed with a per-process
// secret, so nothing is stored server-side. Invisible to humans, needs no
// JavaScript, and adds no third-party dependency (no CAPTCHA).
//
// What it stops: subscription-bomb bots that POST straight at the endpoint
// (they have no valid token) and bots that fetch the page and submit inhumanly
// fast. IP rotation doesn't help them here — the token check is IP-independent.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

// Stable across restarts when FORM_SECRET is set in the env (recommended in
// production, alongside SMTP_PASS). Otherwise a fresh per-process secret, which
// simply invalidates tokens issued before a restart — a page reload mints a new
// one, so the only cost is a dropped submit from a tab left open across a
// deploy.
const SECRET = Deno.env.get("FORM_SECRET") || randomBytes(32).toString("hex");
if (!Deno.env.get("FORM_SECRET")) {
  console.warn(
    "FORM_SECRET not set — subscribe form tokens reset on restart. Set it to keep tokens valid across deploys.",
  );
}

// Faster than this and it isn't a human: network round-trip + render + reading +
// typing an email + submit never completes in under ~1.5s on a freshly rendered
// form. Kept conservative so real people are never caught.
const MIN_AGE_MS = 1500;
// Older than this and the token is stale. Generous, so a long-open tab still
// works; a reload always issues a fresh token.
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

function sign(ts) {
  return createHmac("sha256", SECRET).update(ts).digest("hex").slice(0, 32);
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Mint a token to embed in a rendered form. Base36 millisecond timestamp, a dot,
// then a truncated HMAC of that timestamp.
export function issueFormToken(now = Date.now()) {
  const ts = now.toString(36);
  return `${ts}.${sign(ts)}`;
}

// Verify a submitted token. Returns one of:
//   "ok" | "missing" | "bad" | "too_fast" | "expired"
export function verifyFormToken(token, now = Date.now()) {
  if (!token || typeof token !== "string") return "missing";
  const dot = token.indexOf(".");
  if (dot < 1) return "bad";
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sign(ts), sig)) return "bad";
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued)) return "bad";
  const age = now - issued;
  if (age < MIN_AGE_MS) return "too_fast";
  if (age > MAX_AGE_MS) return "expired";
  return "ok";
}
