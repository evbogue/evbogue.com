import nodemailer from "npm:nodemailer";
import { confirmUrl, unsubscribeUrl } from "./subscribers.js";

const SMTP_USER = Deno.env.get("SMTP_USER") || "ev@evbogue.com";

let cached = null;

function transporter() {
  if (cached) return cached;
  const pass = Deno.env.get("SMTP_PASS");
  if (!pass) return null;
  cached = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass },
  });
  return cached;
}

export async function sendConfirmation(entry) {
  const t = transporter();
  if (!t) {
    console.warn(`SMTP not configured; skipping confirmation for ${entry.email}`);
    return;
  }
  const confirm = confirmUrl(entry.token);
  const unsub = unsubscribeUrl(entry.token);
  await t.sendMail({
    from: `Ev Bogue <${SMTP_USER}>`,
    to: entry.email,
    subject: "Confirm your subscription to evbogue.com",
    text: `One click to confirm:

${confirm}

If you didn't subscribe, ignore this email.

—Ev
evbogue.com

Unsubscribe: ${unsub}`,
    html: `<p>One click to confirm your subscription to evbogue.com:</p>
<p><a href="${confirm}">${confirm}</a></p>
<p>If you didn't subscribe, ignore this email.</p>
<p>—Ev<br>evbogue.com</p>
<p style="color:#888;font-size:12px;">Don't want these? <a href="${unsub}">Unsubscribe</a>.</p>`,
    headers: {
      "List-Unsubscribe": `<${unsub}>, <mailto:${SMTP_USER}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
