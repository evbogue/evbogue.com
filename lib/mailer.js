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

function fromFor(site) {
  return site?.emailFrom || `Ev Bogue <${SMTP_USER}>`;
}

function replyToFor(site) {
  return site?.emailReplyTo || SMTP_USER;
}

function signatureFor(site) {
  return site?.emailSignature || "Ev\nev@evbogue.com | 773-510-8601";
}

function signatureHtml(site) {
  return signatureFor(site)
    .split("\n")
    .map((line) => line.replace(/ev@evbogue\.com/g, '<a href="mailto:ev@evbogue.com">ev@evbogue.com</a>'))
    .join("<br>");
}

export async function sendConfirmation(entry, site) {
  const t = transporter();
  if (!t) {
    console.warn(`SMTP not configured; skipping confirmation for ${entry.email}`);
    return;
  }
  const confirm = confirmUrl(site, entry.token);
  const unsub = unsubscribeUrl(site, entry.token);
  const siteTitle = site?.title || "evbogue.com";
  await t.sendMail({
    from: fromFor(site),
    replyTo: replyToFor(site),
    to: entry.email,
    subject: `Confirm your subscription to ${siteTitle}`,
    text: `One click to confirm:

${confirm}

If you didn't subscribe, ignore this email.

Best,
${signatureFor(site)}

Unsubscribe: ${unsub}`,
    html: `<p>One click to confirm your subscription to ${siteTitle}:</p>
<p><a href="${confirm}">${confirm}</a></p>
<p>If you didn't subscribe, ignore this email.</p>
<p>Best,<br>${signatureHtml(site)}</p>
<p style="color:#888;font-size:12px;">Don't want these? <a href="${unsub}">Unsubscribe</a>.</p>`,
    headers: {
      "List-Unsubscribe": `<${unsub}>, <mailto:${SMTP_USER}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

const ADMIN_VERB = {
  new: "signed up",
  resubscribed: "re-subscribed",
  confirm: "confirmed",
  unsubscribe: "unsubscribed",
};

export async function sendAdminNotification(event, entry, site) {
  const t = transporter();
  if (!t) {
    console.warn(`SMTP not configured; skipping admin notification (${event}) for ${entry.email}`);
    return;
  }
  const verb = ADMIN_VERB[event] ?? event;
  const siteTitle = site?.title || "evbogue.com";
  const lines = [`${entry.email} ${verb}.`, ""];
  lines.push(`Subscribed:   ${entry.subscribed_at}`);
  if (entry.confirmed_at) lines.push(`Confirmed:    ${entry.confirmed_at}`);
  if (entry.unsubscribed_at) lines.push(`Unsubscribed: ${entry.unsubscribed_at}`);
  lines.push(`Source:       ${entry.source}`);
  await t.sendMail({
    from: fromFor(site),
    to: SMTP_USER,
    subject: `[${siteTitle}] ${verb}: ${entry.email}`,
    text: lines.join("\n"),
  });
}

export async function sendWeeklyReport(weekLabel, markdownContent, site) {
  const t = transporter();
  if (!t) {
    console.warn("SMTP not configured; skipping weekly report email.");
    return;
  }
  const siteTitle = site?.title || "evbogue.com";
  await t.sendMail({
    from: fromFor(site),
    to: SMTP_USER,
    subject: `[${siteTitle}] weekly report: ${weekLabel}`,
    text: markdownContent,
  });
}

export async function sendReconfirmation(entry, site) {
  const t = transporter();
  if (!t) {
    console.warn(`SMTP not configured; skipping reconfirmation for ${entry.email}`);
    return;
  }
  const confirm = confirmUrl(site, entry.token);
  const unsub = unsubscribeUrl(site, entry.token);
  const siteTitle = site?.title || "evbogue.com";
  await t.sendMail({
    from: fromFor(site),
    replyTo: replyToFor(site),
    to: entry.email,
    subject: `Stay subscribed to ${siteTitle}`,
    text: `Hey —

I just rolled out a confirmation step for ${siteTitle} subscribers. To keep getting dispatches, click the link below:

${confirm}

If you don't click, you'll quietly stop receiving them. No follow-up.

Best,
${signatureFor(site)}

Unsubscribe: ${unsub}`,
    html: `<p>Hey —</p>
<p>I just rolled out a confirmation step for ${siteTitle} subscribers. To keep getting dispatches, click the link below:</p>
<p><a href="${confirm}">${confirm}</a></p>
<p>If you don't click, you'll quietly stop receiving them. No follow-up.</p>
<p>Best,<br>${signatureHtml(site)}</p>
<p style="color:#888;font-size:12px;">Don't want these? <a href="${unsub}">Unsubscribe</a>.</p>`,
    headers: {
      "List-Unsubscribe": `<${unsub}>, <mailto:${SMTP_USER}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
