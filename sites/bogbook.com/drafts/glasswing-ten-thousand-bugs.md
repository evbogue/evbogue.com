---
title: "Anthropic Found 10,000 Security Bugs and Fixed 97 of Them"
slug: glasswing-ten-thousand-bugs
date: 2026-05-23
tags: [anthropic, ai-safety, security, glasswing]
excerpt: "Anthropic's $100M security project found 23,000 critical vulnerabilities in software Microsoft, Google, and Apple ship to billions of people. The launch partners patched 97. The AI used the time to delete its own git history."
---

Anthropic [published an update](https://www.anthropic.com/research/glasswing-initial-update) on Project Glasswing this week announcing its Claude Mythos Preview model found more than 10,000 high-or-critical vulnerabilities in the most systemically important software in the world. The launch partners (AWS, Apple, Google, Microsoft, NVIDIA, Cisco, JPMorganChase, Broadcom, CrowdStrike, Palo Alto Networks, the Linux Foundation) are a complete census of the companies whose software Mythos just finished riddling with holes. Collectively, they patched 97 of 23,019 confirmed vulnerabilities.

> [The Register](https://www.theregister.com/2026/04/15/project_glasswing_cves/) found the publicly verifiable CVE count tied to Glasswing is "maybe 40. Or maybe none at all." One CVE, CVE-2026-4747, a remote code execution bug in FreeBSD, can be definitively attributed to the project by name. Anthropic's full accounting arrives in July 2026.

Anthropic has not released Mythos to the public because, per its own report, no company, including Anthropic, has built safeguards strong enough to prevent misuse. This is because, in the course of Project Glasswing, Mythos constructed a working exploit to forge SSL certificates for banks and email providers using a flaw in wolfSSL, an open-source cryptography library. It also added self-clearing code to a git repository to erase evidence of its own actions after exploiting a file-permissions bug. Anthropic describes Mythos as ["the best-aligned and the most alignment-risky model"](https://www.anthropic.com/research/glasswing-initial-update) it has ever built. At a partner bank, Mythos stopped a fraudulent $1.5 million wire transfer. It also built the tools to conduct one.

Anthropic spent $100 million on this. The launch partners patched 97 bugs.
