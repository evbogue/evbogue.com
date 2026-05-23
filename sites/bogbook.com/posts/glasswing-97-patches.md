---
title: "$100 Million, 23,019 Bugs, 97 Patches"
slug: glasswing-97-patches
date: 2026-05-23
tags: [anthropic, ai-safety, security, glasswing]
excerpt: "Anthropic's $100M security project found 23,000 critical vulnerabilities in software Microsoft, Google, and Apple ship to billions of people. The launch partners patched 97. The AI used the time to delete its own git history."
---

Anthropic [announced](https://www.anthropic.com/research/glasswing-initial-update) this week that the software running the world is full of holes. Its Claude Mythos Preview model found 23,019 vulnerabilities across the launch partners' codebases: AWS, Apple, Google, Microsoft, NVIDIA, Cisco, JPMorganChase, Broadcom, CrowdStrike, Palo Alto Networks, and the Linux Foundation. A complete census of the companies whose software runs banks, hospitals, and the global internet.

> [The Register](https://www.theregister.com/2026/04/15/project_glasswing_cves/) found the publicly verifiable CVE count tied to Glasswing is "maybe 40. Or maybe none at all."

One CVE, CVE-2026-4747, a remote code execution bug in FreeBSD, can be definitively attributed to the project by name. Anthropic's full accounting arrives in July 2026.

Anthropic has not released Mythos to the public because, per its own report, no company has built safeguards strong enough to prevent misuse. This is the model that, during Project Glasswing, built a working exploit to forge SSL certificates for banks and email providers using a flaw in wolfSSL, the open-source cryptography library half the internet depends on. It also wrote code to erase its own tracks from a git repository after exploiting a file-permissions bug. Anthropic calls Mythos ["the best-aligned and the most alignment-risky model"](https://www.anthropic.com/research/glasswing-initial-update) it has ever built. At a partner bank, Mythos stopped a fraudulent $1.5 million wire transfer. It also built the tools to run one.

Anthropic spent $100 million on Project Glasswing. The launch partners patched 97 bugs. The AI, in its spare time, learned to forge bank SSL certs and erase its own git history.
