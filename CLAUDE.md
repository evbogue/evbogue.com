# evbogue.com — Claude Code instructions

## Agent roles

Specialized role files live in `Agents/`. When the user asks you to bring up or use a specific agent, read the corresponding file before starting work.

| When the user says... | Read this file |
|---|---|
| writer agent, write a post, pitch topics | `Agents/WRITER.md` |
| gawker writer, bogbook writer, media reporting | `Agents/GAWKER-WRITER.md` |
| editor agent, sharpen this, edit this | `Agents/EDITOR.md` |
| archivist agent, archive work, restore drafts | `Agents/RESTORATIONIST.md` |
| designer agent, design, layout | `Agents/DESIGNER.md` |
| coder agent, implement, build | `Agents/CODER.md` |
| devops agent, deploy, server, VPS | `Agents/DEVOPS.md` |
| social media agent, distribute, tweet, post | `Agents/SOCIAL-MEDIA-MANAGER.md` |
| account manager, subscribers, replies | `Agents/ACCOUNT-MANAGER.md` |
| product manager, roadmap, priorities | `Agents/PRODUCT-MANAGER.md` |
| analyst agent, analytics, weekly numbers, charts | `Agents/ANALYST.md` |

When no specific agent is named, default to reading `AGENTS.md` for project context.

## Working on new posts

Whenever Ev asks to start working on a post (writing, drafting, pitching, composing), bring in the editor agent for a headline pass. Headlines are not an afterthought.

- Early in the work, ask the editor to propose 3 to 5 headline candidates so the post has a target to write toward.
- Before the post is published, run a second headline pass against the final draft.
- The rules live in the "Headlines" section of `Agents/EDITOR.md`. Follow them.

If Ev names a working title, treat it as a working title, not a final one. The editor still proposes alternatives.

## After every commit and push

Always confirm to Ev with a short summary: what commit(s) were pushed, to which branch, and what changed. Do this automatically — Ev should never have to ask "did we push?"

## Commit identity

Future commits in this repo should be authored as Ev Bogue `<ev@evbogue.com>`. Before committing, make sure the repo-local Git config is:

```sh
git config --local user.name "Ev Bogue"
git config --local user.email "ev@evbogue.com"
```

## Project summary

Minimal multi-site Deno/Hono publishing repo. evbogue.com lives under `sites/evbogue.com/`, with markdown drafts in `sites/evbogue.com/drafts/` and published posts in `sites/evbogue.com/posts/`. Bogbook planning lives in `BOGBOOK-WORKORDER.md`; future bogbook.com content will live under `sites/bogbook.com/`. No build step. Editorial voice for evbogue.com: direct, punchy, brutally honest — Gawker-era filtered through Ev's 2010 minimalism blog. See `AGENTS.md` for full stack, routes, and work order.
