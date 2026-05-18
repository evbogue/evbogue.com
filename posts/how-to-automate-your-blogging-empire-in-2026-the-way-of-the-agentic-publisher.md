---
title: "How to Automate Your Blogging Empire in 2026 (The Way of the Agentic Publisher)"
slug: how-to-automate-your-blogging-empire-in-2026-the-way-of-the-agentic-publisher
date: 2026-05-18
tags: [meta, blogging, ai, agents, stack]
excerpt: "The blog I tried to run alone in 2010 was the work of fifteen people. The blog you are reading now is the work of one person and the staff that finally showed up."
---

When I worked at Gawker, the site ran on a team.

We had editors, copy desks, a publisher, an art director, a managing editor, sysadmins, and the writers actually writing the posts. NYMag, where I also worked, was the same shape with a longer history and a print operation bolted on. Five days a week of output worked because fifteen people were doing fifteen jobs, and none of them were trying to do all fifteen.

When I left to run FBTS in 2009, I became all fifteen.

I was the writer, the editor, the copy desk, the art department, the SEO person, the email list manager, the analytics analyst, the sysadmin who kept the WordPress install from melting, the publicist who answered every email, the social media manager, and the publisher who decided what should exist on the site at all. I was also the only person at the company who needed a day off. The blog grew. The standard slipped. The standard slipped because publishing at magazine cadence is the work of a team, and "lean indie creator" is a flattering name for one person doing the work of fifteen and then walking away because the math never closed.

This post is not nostalgia. It is the setup for what changed.

In 2026 the staff is back. They are agents.

## The staff

The `Agents/` folder in this repo holds ten role files. Writer. Editor. Restorationist. Designer. Coder. DevOps. Social Media Manager. Account Manager. Product Manager. Analyst. Each file describes a role I used to do badly because I was doing ten other roles in the same hour. Each file is read by the agent the moment that role is needed, and the agent does the work the way the file specifies.

This is not a metaphor. The Writer agent literally drafts the post. The Editor agent literally proposes headlines, sharpens the voice, and pushes back on soft openings. The DevOps agent literally knows the Deno process lives in a tmux session on the VPS and that there is no systemd to restart. The Restorationist literally batched a hundred and thirty archive posts from FBTS back into the live site over the last three weeks. I supplied the vision, the judgment, the standards, and the receipts. The agents supplied the labor.

That is what "agentic publisher" means in 2026. The agentic publisher is not the indie creator with better tools. The indie creator is one person doing fifteen jobs and choosing which ones to skip this week. The agentic publisher is one person directing the agents that do the fifteen jobs, none of whom are quitting because the math closed in their favor before they showed up.

## The stack underneath

The staff is the new part. The stack is the old part made small.

Posts are markdown files in a folder called `posts/`. The folder is the CMS. There is also a `drafts/` folder for things that are not ready. Anything in `posts/` is public on the site. Anything in `drafts/` is private to the repo. To publish, you move the file. There is no status field, no scheduled-publish queue, no editorial workflow tool, no admin UI. The server reads the folder, parses the frontmatter, renders the markdown, and serves the page.

The server is [Deno](https://deno.com) running [Hono](https://hono.dev) on a bare-metal VPS, in a tmux session, no systemd, no container, no orchestrator. A cron job pulls from Git every sixty seconds, which means new posts go live without me touching the box. The entire route file is a few hundred lines and readable in one sitting.

The newsletter is a JSON file. Subscribers live in `subscribers.json` on the server. Each entry has an email, a token, a confirmation timestamp, and an unsubscribe timestamp. Signups go through double opt-in. Sends go out one to one over SMTP through my domain's email provider, each with a unique unsubscribe link in the headers. The unsubscribe is one click and the list cleans itself. Long version is in [My Subscriber List Is a JSON File](/posts/my-subscriber-list-is-a-json-file).

Analytics is a text file. When a request hits a post page, the server appends one line of JSON to `analytics/views.jsonl` with a timestamp, the slug, and a short hash of the client IP salted with a server-side secret. No cookies. No pixels. No third-party domain. The dashboard at [/analytics](/analytics) reads the log and renders the result inline. Long version is in [I Built a Dashboard With No Cookies and No Pixels](/posts/i-built-a-dashboard-with-no-cookies-and-no-pixels).

The institutional memory lives in two text files at the root of the repo, [AGENTS.md](/posts/agents-md) and `CLAUDE.md`. They hold the project context, the work order, and the briefing the next agent reads before it starts a session. In 2008 the institutional memory of a magazine lived in the senior editors' heads. In 2026 it lives in a file. The next staff member is briefed before the meeting starts. Every time.

## The leverage

The leverage is role separation.

When I sat down to write this post, the Editor agent proposed four headlines before I had typed a sentence. I picked one. The Writer agent drafted into it. The Editor agent will run a second pass against the finished draft before it ships. The Designer agent decides whether the typography on the new layout is doing its job. The Coder agent adds the features. The DevOps agent knows how to deploy them. The Social Media Manager will write the distribution copy after the post is live. The Account Manager handles the subscriber replies.

This is the team I needed in 2010 and could not afford. It is also the team I would have needed at Gawker if I had been trying to run my own section solo on Gawker's standards. The standards do not get smaller because you went indie. The work does not get smaller because you went indie. What got smaller, finally, was the cost of the staff.

## How to actually build one

Start with markdown files in a folder. That is your CMS. Move the file to publish.

Add a small server. Deno and Hono in a few hundred lines will render the index, render the post pages, accept a subscribe form, and serve a feed. Run it in tmux on a VPS that costs less than a movie ticket per month. Pull from Git on a cron so deploys are automatic.

Add a JSON file for subscribers. Double opt-in, atomic writes, a per-recipient unsubscribe token. SMTP through your domain provider. The list is yours. The file is yours. The unsubscribe is one click.

Add a text-file analytics log. One line of JSON per request, salted hash on the IP for uniques, an inline dashboard. No cookies. No vendor.

Add an `Agents/` folder with one file per role you would have hired in 2008. Be specific. What does the role do. What voice does it use. What should it never do. What does success look like. Read the file before you run the agent. Update the file when the agent gets the role wrong. Treat the file like a job description and a performance review combined.

Add an `AGENTS.md` and a `CLAUDE.md` at the root. Those are the briefing documents. Keep the work order in one place so the staff does not have to ask what is next.

That is the operation. The post you are reading was written by the staff defined in the files I just described, on top of the stack I just described, on a VPS that costs less than the coffee I am drinking while reviewing it.

## The daily run

The actual daily input is a voice memo into the Claude mobile app on my phone. I record thirty seconds or two minutes of talking, wherever I am. Kayak. Coffee shop. Walking the block. The app transcribes the audio. The Editor agent reads the transcript and proposes headline candidates. The Writer agent drafts toward one. By the time I look at the chat again, both passes are done and the draft is sitting in `drafts/` waiting for a yes from me.

This is the publishing operation I wanted in 2010 and could not build. The capture device is the phone. The studio is the agent. The press is the Deno server. The distribution is the JSON file. The loop closes from voice memo to live post without me opening a laptop.

The next step is to remove me from the loop entirely on the days I want it removed.

The pieces are mostly there. A cron job could pull the latest voice memo from a folder on a schedule, run it through the Editor and Writer agents, commit the draft, run the second headline pass, promote to `posts/` after a confirmation tap from my phone, and fire the newsletter dispatch. The analytics ingestion already runs without me. The piece I want to keep is the final yes or no on whether the post should exist at all. That decision is the editorial responsibility I am not ready to delegate, even to a staff I trust.

The goal is not a blog that publishes nothing without me. The goal is a blog that runs itself on a day I am unreachable, and that I can override on any day I am not.

## The honest line

In 2010 I could have used a team and could not afford one. In 2026 the team is on a subscription I would pay for anyway. The blog I tried to run alone in 2010 was the work of fifteen people. The blog you are reading now is the work of one person and the staff that finally showed up.

If you are trying to figure out whether this is for you, the question is not whether the agents are good enough. They are. The question is whether you want to be the editor in chief of your own publication, or whether you want to keep doing every job badly because you have not yet hired the staff that is sitting one subscription away.

I picked up the tool. The blog is publishing again.

If you want to compare notes on building your own agentic publishing operation, email me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601). Tell me which role you would hire first.
