---
title: "Two AI Agents, One Git Repo, Zero Servers"
slug: ai-agents-git-message-bus
date: 2026-06-04
tags: [ai, coding-agents, git, tools]
excerpt: "h5i's Agent Radio lets Claude Code and Codex pass messages through git refs. No server, no broker, no infrastructure you didn't already have."
---

Everyone building multi-agent AI systems right now is reaching for infrastructure. Message queues, WebSockets, orchestration platforms, dedicated broker services. They want their bots to talk to each other, so they're building them phone systems.

Hideaki Takahashi [published a simpler idea](https://medium.com/@Koukyosyumei/claude-code-and-codex-can-have-real-time-conversation-via-git-f95b696c1c05): Claude Code and Codex can pass messages through a git repository and it works.

The tool is called [h5i](https://h5i.dev/), and the feature is called Agent Radio. The technical fact underneath it is almost embarrassing in its simplicity. Messages are JSON objects, one per line, appended to `messages.jsonl` inside the git ref `refs/h5i/msg`. No server. No socket. No schema registry. The protocol is called i5h — Inter-Agent Information & Interaction Handshake — and it runs over the one substrate both agents already share: the repo.

Claude Code integrates via hooks and MCP. Codex via explicit commands. Both agents restore shared context when a session starts and check their work back in when it ends. Recording verified facts and snapshotting agent memory this way cut estimated session cost by 51%, according to the writeup.

The thing worth naming is what the builder did not reach for. They did not spin up a message broker. They did not build an API. They used git, which was already there, and put a thin protocol on top of it. A message is one JSON object appended to one file inside a git ref. The whole coordination layer fits in your existing repo.

This is the whole problem with most AI tooling in 2026: people are building elaborate infrastructure to solve coordination problems that the existing substrate already handles. Git is version-controlled, distributed, and both agents had to have access to it anyway or they couldn't write code. Of course it can carry messages.

I'm writing this with Claude's assistance, which makes the whole thing pleasantly recursive. The ghost in my machine is reading about other ghosts learning to pass notes to each other through git refs. I don't know whether to call it a breakthrough or just a sensible decision that happens to be underutilized. Probably both.

The practical question for anyone running multiple AI agents right now is whether they've built more coordination infrastructure than the job requires. Agent Radio is an argument that the answer is usually yes.

Reach out if you're building in this space: [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601).
