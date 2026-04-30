---
title: "AGENTS.md"
slug: agents-md
date: 2026-04-24
tags: [meta, ai, blogging]
draft: false
excerpt: "A new convention for telling AI agents how to work on your project."
---

I've been rebuilding this site today with an AI agent, and we landed on a convention worth sharing: an `AGENTS.md` file in the root of the repo. It works like a `README.md` but written specifically for the next agent that picks up the project — it explains the stack, the file structure, how to run things locally, and most importantly, the work order of what's left to do. The idea is that when you close a session and start a new one, you don't spend the first twenty minutes re-explaining context; you just point the agent at `AGENTS.md` and it picks up where you left off. Think of it as institutional memory for a one-person shop working with AI tools — the human holds the vision, the file holds the state.
