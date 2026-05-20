---
title: "I Built a Dashboard With No Cookies and No Pixels"
slug: i-built-a-dashboard-with-no-cookies-and-no-pixels
date: 2026-05-14
tags: [analytics, blogging, meta]
excerpt: "First-party analytics for evbogue.com. The whole pipeline is one text file, one HTML page, and a salted hash."
---

evbogue.com now has a dashboard. It lives at [/analytics](/analytics). There is no password and no obscured URL. If you find it, you can read it.

What it does not have: a tracker pixel, a cookie, a third-party domain, a JavaScript SDK loaded from someone else's CDN. The default for the past two decades has been to embed someone else's script on every page so they can build a profile of every visitor and then sell the chart back to you. I never installed any of that here. The dashboard is what happens when you ask what the smallest version of this thing looks like if it still answers the question.

The question is: which posts are getting hits this week?

The answer is a text file. When a request lands on a post page, the server appends one line of JSON to `analytics/views.jsonl`: an ISO timestamp, the slug, and a short opaque hash of the client IP. That is the whole event schema. Bot user-agents are dropped before the line ever gets written. The file is gitignored and lives only on the VPS, in the same shape `subscribers.json` does.

The dashboard reads that log at request time, aggregates by slug, and renders an HTML page with three big numbers, a top-ten bar chart in inline SVG, and a per-post list. A tiny inline script polls `/analytics.json` every ten seconds so the page updates without a full reload. There is no client-side framework. The whole pipeline is around 250 lines of Deno.

Uniques are the only place this gets clever, and only barely. To count distinct visitors without setting a cookie, the server hashes the client IP with a server-side salt and stores the first twelve hex characters of the digest. The salt lives in an environment variable, never in the log file itself. Same IP hashes to the same bucket forever. The log is pseudonymous to anyone who reads it without knowing the salt, including future me.

I built this with Claude in an afternoon, and it almost worked. Uniques stayed at zero in production. The reverse proxy in front of the Deno process was reading the real client IP, then throwing it away on the forward. Every visitor reached the backend looking like the proxy itself. Eight lines of patch and a restart later, the dashboard started counting actual people instead of one repeated phantom.

The point of running your own publishing system is that you also get to build your own honest version of every observability tool that came pre-installed everywhere else. You count fewer things. You count the things you care about. You know how the numbers were computed because you wrote the computation.

Open [/analytics](/analytics) and look. If you have a sharper version of this, or you found a bug, tell me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601).
