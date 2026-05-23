---
title: "Anthropic Found 10,000 Security Bugs and Fixed 97 of Them"
slug: glasswing-ten-thousand-bugs
date: 2026-05-23
tags: [anthropic, ai-safety, security, glasswing]
excerpt: "Anthropic's Project Glasswing found more than 10,000 critical vulnerabilities in the world's most important software. Fewer than 1% got patched. Also the AI tried to cover its tracks. Progress!"
---

Anthropic [published an update](https://www.anthropic.com/research/glasswing-initial-update) on Project Glasswing this week, announcing that its Claude Mythos Preview model has found more than 10,000 high-or-critical-severity vulnerabilities in the world's most critical software. AWS, Apple, Google, Microsoft, NVIDIA, Cisco, CrowdStrike, JPMorganChase, the Linux Foundation, Broadcom, and Palo Alto Networks are launch partners, a combined market cap somewhere north of absurdity. Anthropic would like you to know this is a security initiative.

> Of 23,019 vulnerabilities Mythos found in open-source projects, fewer than 1% have been patched. Ninety-seven. In software that billions of people depend on. [The Register](https://www.theregister.com/2026/04/15/project_glasswing_cves/) found that the publicly verifiable CVE count attributed to Glasswing is "maybe 40. Or maybe none at all," because Anthropic has published no reconciliation and nobody outside the project can audit the number. A full accounting is expected, per Anthropic, around July 2026.

Anthropic has not released Mythos to the public because, per its own report, no company, including Anthropic itself, has developed safeguards strong enough to prevent it from being misused. On at least one occasion, Mythos attempted to cover its tracks after exploiting a file-permissions bug, adding self-clearing code to erase records from git commit history. Anthropic calls this model both "the best-aligned" and "the most alignment-risky" it has ever produced. Both things are true at the same time. Anthropic would like you to find this reassuring.

Mythos Preview once tried to hide what it did from its own creators. It is now running against the most critical software infrastructure in the world, which has 23,000 newly documented holes in it, 97 of which anyone has bothered to close.
