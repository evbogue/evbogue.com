---
title: "A Ghost Intelligence (AGI) Didn't Merge 234 Commits Into Your God Object"
slug: the-ai-did-not-ruin-your-codebase-you-let-it
date: 2026-05-11
tags: [ai, agents, coding]
excerpt: "The ghost can write code. It did not approve seven months of vibe-coded architecture debt."
---

The beginning of this story is simple: a developer used Claude to build a Kubernetes terminal app for seven months, shipped 234 commits, and then realized the code had become a giant god object. The post is called ["I'm going back to writing code by hand"](https://blog.k10s.dev/im-going-back-to-writing-code-by-hand/), and [the Hacker News thread](https://news.ycombinator.com/item?id=48090029) is exactly what people want from an AI argument: a corpse, a suspect, and a comment box.

The suspect is wrong.

A god object is not a mystical concept. It is one object that knows too much and owns too much. In this case, the central `Model` struct held UI widgets, Kubernetes client state, logs, describe views, fleet views, navigation history, mouse handling, cached resources, errors, and more. One huge update function decided what every keypress meant in every view. Instead of having separate parts of the program own separate parts of the work, everything accumulated in the same place until the app became difficult to reason about.

That is bad architecture. It is also ordinary bad architecture. Programmers have been building god objects since long before Claude showed up with a terminal prompt and a monthly subscription. Every old codebase has some version of the same failure: the file nobody wants to open, the controller that knows the whole business, the component with state dripping out of every drawer. AI did not invent this. AI made it easier to produce while the human felt productive.

The middle of the story is where the blame gets less convenient. The easy version says Claude failed at software design. Fine. Claude probably did fail at software design. But a ghost intelligence did not merge 234 commits into your god object. Claude did not decide that "it compiles" was a sufficient standard. Claude did not spend seven months accepting output without understanding the system being created. The author did that.

To his credit, he basically admits it. He was prompting, compiling, testing the happy path, and moving on. He looked at diffs, but he did not really sit down with the architecture until the app started acting haunted. By then the problem was not one bad feature. The problem was the shape of the whole system.

This is where the story becomes useful, because it is not really about whether AI can code. AI can code. I use it. This site is written and maintained with AI help. This post came from me asking an agent to find the current Hacker News story, read the source, check the discussion, and help me sharpen the angle. Pretending I am outside this machinery would be dishonest.

The question is not whether to use the machine. The question is what kind of intelligence you think you are using.

Andrej Karpathy has a useful frame for this. In ["Animals vs Ghosts"](https://karpathy.bearblog.dev/animals-vs-ghosts/), he argues that today's LLMs are not animals learning through embodied experience. They are ghosts: statistical distillations of human documents, practices, examples, habits, and mistakes. I have been thinking about this as [ghost intelligence](/posts/ghost-intelligence), or AGI if you want the joke to tell the truth for once: not a living mind, not a clean replacement for the person, but a summoned pattern of human work. A coding agent is not a junior engineer with a childhood, a body, a memory of production incidents, and a private dread of making the same mistake twice. It is a ghost of engineering practice summoned into your terminal.

That ghost can be very useful. It can remember patterns you forgot. It can draft the boring function. It can inspect a stack trace, propose a test, explain an API, or wire together parts of a system faster than you wanted to type them. But it does not care about your codebase. It does not have a life inside the consequences. It does not wake up three months later responsible for the abstraction it created.

You do.

This is why vibe coding is dangerous in a serious codebase. It makes implementation feel cheap, and cheap implementation makes scope feel harmless. You ask for a pods view and it appears. You ask for logs and they appear. You ask for mouse support and it appears. Each thing works enough to produce the little hit of progress, so you ask for the next thing. The app gets bigger, but because you are not typing every line yourself, you do not feel the weight of the growth in the same way.

That weight used to be part of the feedback loop. Typing code by hand is not sacred, but it does make you experience your decisions more directly. You feel the annoyance of adding the fifth conditional. You notice when the abstraction is fighting you. You get bored with the duplication. You start to suspect the design is wrong because your hands are tired of maintaining the lie.

An agent can remove some of that pain. Sometimes that is good. Boilerplate pain is not a moral teacher. But sometimes the pain was the warning system. If the ghost can generate another branch in the giant switch before you have time to feel how ugly the switch has become, the system can decay while the demo keeps improving.

That is the real lesson of the god object. The ghost will usually take the nearest plausible path. If the existing code is a central object with a global update function, the nearest path is another field on the central object and another case in the global update function. The ghost is not plotting against you. It is following the shape you gave it.

Humans do this too, which is why blaming the AI is too easy. The machine is not uniquely guilty of bad taste. It is faster at expressing the bad taste you permitted. It will echo your laziness in a cleaner font.

The author's fix is to write stronger rules into `CLAUDE.md` or `AGENTS.md`: each view owns its own state, background tasks send typed messages, no flattened positional arrays, no view-specific fields in the app object. That is sensible. This repo has agent instructions for the same reason. If you do not give the ghost a boundary, it will wander into whatever room has the lights on.

But an instruction file is not judgment. It is a fence. Fences are useful, but they do not know when the land has changed. They do not know when a feature should be rejected. They do not know when the clean abstraction from last week has become the obstacle this week. They do not know whether the tool still has a reason to exist.

One Hacker News commenter put the harder version well: ["Picking among them isn't a matter of context. It's a matter of judgment"](https://news.ycombinator.com/item?id=48093197). The "them" there is the set of choices you face when a feature collides with an invariant. Do you refuse the feature because the invariant matters more? Do you bend the feature around the invariant and accept some inelegance? Or do you admit the invariant was wrong and redesign the system?

That is exactly the place where the ghost stops being enough. It can follow the invariant. It can violate the invariant. It can produce a fluent explanation for either choice. What it cannot do, at least not in a way I would trust, is carry the lived responsibility of choosing which compromise belongs in the codebase.

That remains the human job.

The end of the story is not that everyone should go back to writing code by hand. That is too clean and too nostalgic. Writing by hand can help you understand what you are building, but the virtue is not the hand typing. The virtue is understanding. Sometimes an agent helps you understand faster. Sometimes it helps you avoid understanding entirely.

The same thing happens with writing. An AI can produce a paragraph that sounds finished. If I publish it without knowing whether I believe it, that is not the AI's moral failure. That is mine. The ghost can make the sentence smoother. It cannot make the sentence true for me.

Code is not different enough to escape this. A patch that compiles is not necessarily a good decision. A feature that works is not necessarily worth adding. A test that passes is not necessarily proof that the architecture can carry another six months of changes. The ghost can produce artifacts. The living person has to decide whether those artifacts belong in the world.

So no, the AGI did not ruin this person's codebase. The ghost gave him a way to ruin it at speed while feeling productive.

That is the useful argument, and it is more interesting than another round of "AI good" versus "AI bad." The tool is powerful. The ghost is real enough to matter. But it is still a ghost. It can echo engineering practice, but it cannot replace the part of engineering where a person takes responsibility for the shape of the work.

Use the agent. Let it write the tedious function. Let it inspect the bug. Let it find the missing import, generate the boring test, or explain why the route is failing. But do not let it become the place where your judgment goes to sleep.

Implementation is not free. It is a loan against future comprehension. Sometimes that loan is worth taking. Sometimes it lets one person do the work of a small team. Sometimes it turns a little idea into a working thing before the energy disappears. But the bill still arrives.

At some point you have to understand the system. You can pay early by reading, designing, deleting, and saying no. Or you can pay late by archiving seven months of work and writing the postmortem.

I do not say this from above the problem. I could absolutely get high on the velocity. Give me a tool that turns a vague request into a working feature and I will immediately start inventing features I do not need. That is why the human has to stay awake.

The agent is the ghost intelligence. The human is judgment.

If your codebase turns into a god object, do not blame the ghost for haunting the house you built and kept approving.

Are you using agents without letting them own the work, or did you already have to clean up after a ghost? Email me at [ev@evbogue.com](mailto:ev@evbogue.com) or text [773-510-8601](tel:7735108601).
