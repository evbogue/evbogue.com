# evbogue.com — Claude Code instructions

## Agent roles

Specialized role files live in `Agents/`. When the user asks you to bring up or use a specific agent, read the corresponding file before starting work.

| When the user says... | Read this file |
|---|---|
| writer agent, write a post, pitch topics | `Agents/WRITER.md` |
| editor agent, sharpen this, edit this | `Agents/EDITOR.md` |
| archivist agent, archive work | `Agents/ARCHIVIST.md` |
| restorationist agent, restore drafts | `Agents/RESTORATIONIST.md` |
| designer agent, design, layout | `Agents/DESIGNER.md` |
| coder agent, implement, build | `Agents/CODER.md` |
| devops agent, deploy, server, VPS | `Agents/DEVOPS.md` |
| social media agent, distribute, tweet, post | `Agents/SOCIAL-MEDIA-MANAGER.md` |
| account manager, subscribers, replies | `Agents/ACCOUNT-MANAGER.md` |
| product manager, roadmap, priorities | `Agents/PRODUCT-MANAGER.md` |

When no specific agent is named, default to reading `AGENTS.md` for project context.

## Project summary

Minimal blog for Ev Bogue (ev@evbogue.com). Deno/Hono server, markdown posts in `posts/`, no build step. Editorial voice: direct, punchy, brutally honest — Gawker-era filtered through Ev's 2010 minimalism blog. See `AGENTS.md` for full stack, routes, and work order.
