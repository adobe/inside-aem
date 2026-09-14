# Goal 4 — Transcript rename + annotation mapping

Derived 2026-09-04 by matching the real files in `Shared Documents/content/en/aicoc/transcripts/` against the real write-ups in `Shared Documents/content/en/aicoc/`, by title similarity (SharePoint search, not the live `/en/aicoc-index.json` — that endpoint requires an Adobe SSO session I don't have from here, so slugs below are **derived from filenames, not confirmed against the live published URL**).

**For each row below, in SharePoint:**
1. Rename the transcript file to the "New filename" column.
2. Open it and add the "Annotation line to add" text near the top of the document.

**⚠️ Rows marked "TBD" or "LOW confidence" — check these by hand before renaming.** Either the matching write-up hasn't been slugified yet itself (so I can't know its real URL), or the title match is weaker than the others. Don't blindly trust those slugs.

---

## High-confidence matches (slug taken directly from an already-published write-up's filename)

| # | Current transcript filename | New filename | Annotation line to add |
|---|---|---|---|
| 1 | `[AI CoC Assisted Coding Brownbag] - Integration and Troubleshooting with Cursor.docx` | `integration-and-troubleshooting-with-cursor-transcript.docx` | `Source session write-up: https://culture-tecture.adobe.com/en/aicoc/integration-and-troubleshooting-with-cursor` |
| 2 | `[AI CoC Assisted Coding Brownbag] Running the Gauntlet & Understanding Transformer Architecture.docx` | `running-the-gauntlet-understanding-transformer-architecture-transcript.docx` | `.../en/aicoc/running-the-gauntlet-understanding-transformer-architecture` |
| 3 | `[AI CoC Show & Tell] - Code with Confidence_ Securing the AI-Assisted Coding Era.docx` | `code-with-confidence-securing-the-ai-assisted-coding-era-transcript.docx` | `.../en/aicoc/code-with-confidence-securing-the-ai-assisted-coding-era` |
| 4 | `[AI CoC Show & Tell] — Firefly Models Gateway_ Scaling Third-Party AI Model Integration Across Adobe.docx` | `firefly-models-gateway-scaling-third-party-ai-model-integration-across-adobe-transcript.docx` | `.../en/aicoc/firefly-models-gateway-scaling-third-party-ai-model-integration-across-adobe` |
| 5 | `[AI CoC Show & Tell] — glaas.ai_ Globalization GenAI Platform for Governed, Scalable AI Systems.docx` | `glaas-ai-globalization-genai-platform-for-governed-scalable-ai-systems-transcript.docx` | `.../en/aicoc/glaas-ai-globalization-genai-platform-for-governed-scalable-ai-systems` |
| 6 | `[AI CoC Show & Tell] - The Adobe AI Registry - Agents & MCPs - for building cross-app workflows.pdf` | `the-adobe-ai-registry-agents-mcps-for-building-cross-app-workflows-transcript.pdf` | `.../en/aicoc/the-adobe-ai-registry-agents-mcps-for-building-cross-app-workflows` |
| 7 | `[AI CoC Show & Tell] - Thunderclap V2_ GenAI-Powered Metrics Generator Demo & Architecture.pdf` | `thunderclap-v2-genai-powered-metrics-generator-demo-architecture-transcript.pdf` | `.../en/aicoc/thunderclap-v2-genai-powered-metrics-generator-demo-architecture` |
| 8 | `[AI CoC Show & Tell] Genie_ RAG-Powered Support System Behind Jarvis Chatbot .docx` | `genie-rag-powered-support-system-behind-jarvis-chatbot-transcript.docx` | `.../en/aicoc/genie-rag-powered-support-system-behind-jarvis-chatbot` |
| 9 | `[AI CoC Show & Tell] Training Data is the new "IP".docx` | `training-data-is-the-new-ip-transcript.docx` | `.../en/aicoc/training-data-is-the-new-ip` |
| 10 | `[AI CoC] [AI CoC] Show & Exchange - MCP Builders & Agents Deep Dive - Follow up to - Implementing Remote MCP Servers (August 14th).docx` | `mcp-builders-agents-deep-dive-transcript.docx` | `.../en/aicoc/mcp-builders-agents-deep-dive` *(this session is described as a follow-up to "Implementing Remote MCP Servers" too — double check which write-up this transcript should really point to)* |
| 11 | `[AI CoC] AI Assisted Coding Brownbag with Giving Agents Skills & EasyMCP.docx` | `giving-agents-skills-easymcp-transcript.docx` | `.../en/aicoc/giving-agents-skills-easymcp` |
| 12 | `[AI CoC] AI Assisted Coding Brownbag_ The Dark Software Factory & Collapsing the Product Workflow with AI.docx` | `the-dark-software-factory-collapsing-the-product-workflow-with-ai-transcript.docx` | `.../en/aicoc/the-dark-software-factory-collapsing-the-product-workflow-with-ai` |
| 13 | `[AI CoC] AI-Assisted Brownbag with Assisted Coding in Practice.docx` | `assisted-coding-in-practice-transcript.docx` | `.../en/aicoc/assisted-coding-in-practice` |
| 14 | `[AI CoC] Show & Engage - Implementing Remote MCP Servers_ A Practical Guide.docx` | `implementing-remote-mcp-servers-a-practical-guide-transcript.docx` | `.../en/aicoc/implementing-remote-mcp-servers-a-practical-guide` |
| 15 | `[AI CoC] Show & Tell - Accelerating Fraud Detection and Review in the AI Era_ A Look Inside ALFRED.pdf` | `accelerating-fraud-detection-and-review-in-the-ai-era-a-look-inside-alfred-transcript.pdf` | `.../en/aicoc/accelerating-fraud-detection-and-review-in-the-ai-era-a-look-inside-alfred` |
| 16 | `[AI CoC] Show & Tell - ACS Co-Pilot - GenAI based GPT4o powered umbrella application to Deliver More with Less.docx` | `acs-co-pilot-genai-based-gpt4o-powered-umbrella-application-to-deliver-more-with-transcript.docx` | `.../en/aicoc/acs-co-pilot-genai-based-gpt4o-powered-umbrella-application-to-deliver-more-with` |
| 17 | `[AI CoC] Show & Tell - Agentic Telemetry Tool for CPF Platform Clients.docx` | `agentic-telemetry-tool-for-cpf-platform-clients-transcript.docx` | `.../en/aicoc/agentic-telemetry-tool-for-cpf-platform-clients` |
| 18 | `[AI CoC] Show & Tell - Agents, Skills, Harness Engineering and other buzz words.docx` | `agents-skills-harness-engineering-and-other-buzz-words-transcript.docx` | `.../en/aicoc/agents-skills-harness-engineering-and-other-buzz-words` |
| 19 | `[AI CoC] Show & Tell - E2E Reasoning Engine Demo & LangGraph Implementation.docx` | `e2e-reasoning-engine-demo-langgraph-implementation-transcript.docx` | `.../en/aicoc/e2e-reasoning-engine-demo-langgraph-implementation` |
| 20 | `[AI CoC] Show & Tell - Form Filling with AI Capabilities.docx` | `form-filling-with-ai-capabilities-transcript.docx` | `.../en/aicoc/form-filling-with-ai-capabilities` |
| 21 | `[AI CoC] Show & Tell - MCP Legal Framework Discussion - Open Q&A Session.docx` | `mcp-legal-framework-discussion-open-q-a-session-transcript.docx` | `.../en/aicoc/mcp-legal-framework-discussion-open-q-a-session` |
| 22 | `[AI CoC] Show & Tell - Navigating AI Legal Reviews_ Process, Tools, and Q&A Session.docx` | `navigating-ai-legal-reviews-process-tools-and-q-a-session-transcript.docx` | `.../en/aicoc/navigating-ai-legal-reviews-process-tools-and-q-a-session` |
| 23 | `[AI CoC] Show & Tell GenStudio Agentic.docx` | `genstudio-agentic-transcript.docx` | `.../en/aicoc/genstudio-agentic` |
| 24 | `[AI CoC] Show & Tell_ Under the Hood of Adobe Experience Platform Agent Orchestrator and Collaboration.docx` | `under-the-hood-of-adobe-experience-platform-agent-orchestrator-and-collaboration-transcript.docx` | `.../en/aicoc/under-the-hood-of-adobe-experience-platform-agent-orchestrator-and-collaboration` |
| 25 | `[AI CoC] - Show & Tell - Unlocking the Potential of the Masumi Network - External Guest Kristian Portz - Masumi Network.pdf` | `unlocking-the-potential-of-the-masumi-network-external-guest-kristian-portz-masu-transcript.pdf` | `.../en/aicoc/unlocking-the-potential-of-the-masumi-network-external-guest-kristian-portz-masu` |
| 26 | `AI CoC Show & Tell with a special guets - Cursor .docx` | `a-special-guets-cursor-transcript.docx` | `.../en/aicoc/a-special-guets-cursor` *(yes, "guets" — matches the existing write-up's own typo)* |
| 27 | `Transcript - [AI CoC] Show & Tell - Agent to Agent interaction in AEM Sites Optimizer.pdf` | `agent-to-agent-interaction-in-aem-sites-optimizer-transcript.pdf` | `.../en/aicoc/agent-to-agent-interaction-in-aem-sites-optimizer` |
| 28 | `Transcript - AI CoC - Agentic AI Show & Exchange with the AEP AI Agentic Approach.pdf` | `agentic-ai-show-exchange-with-the-aep-ai-agentic-approach-transcript.pdf` | `.../en/aicoc/agentic-ai-show-exchange-with-the-aep-ai-agentic-approach` |
| 29 | `Transcript - AI CoC Show & Tell (Rosetta3, the AI-Powered Alert Analysis and Recommendation Engine) & Short Community Meetup.pdf` | `2025-04-03-rosetta3-transcript.pdf` | `.../en/aicoc/2025-04-03-rosetta3` |

## Rows 30–38 — confirmed matches, but write-up needs slugging first (2026-09-04 update)

Dominik confirmed these matches are correct. **Before renaming these transcripts**, the matching write-up itself needs a clean slug filename — right now it sits under its raw meeting-title filename, so the final URL isn't knowable for certain. Proposed slugs below follow the exact same pattern as your already-published write-ups (lowercase, hyphens, bracket/prefix stripped, punctuation removed) — **but I couldn't verify these against the live site** (no session access from here), so a few with tricky punctuation (periods, em-dashes, apostrophes) are genuinely best-guess. **Rename the write-up first, then check the live URL actually resolves before finalizing the transcript's annotation line.**

| # | Write-up: current raw filename | Write-up: proposed slug filename | Transcript: new filename | Annotation line to add |
|---|---|---|---|---|
| 30 | `[AI Assisted Coding Brownbag] Shared Context, Shared Agent - How Teams Are Collaborating Around AI Workspaces.docx` | `shared-context-shared-agent-how-teams-are-collaborating-around-ai-workspaces.docx` | `shared-context-shared-agent-how-teams-are-collaborating-around-ai-workspaces-transcript.docx` | `.../en/aicoc/shared-context-shared-agent-how-teams-are-collaborating-around-ai-workspaces` |
| 31 | `[AI CoC Show & Tell] - CrowdAI - Where Adobe's AI Co-Innovation Gets a Home.docx` | `crowdai-where-adobes-ai-co-innovation-gets-a-home.docx` | `crowdai-where-adobes-ai-co-innovation-gets-a-home-transcript.docx` | `.../en/aicoc/crowdai-where-adobes-ai-co-innovation-gets-a-home` |
| 32 | `Unlocking AI Productivity with EasyMCP Desktop.docx` ⚠️ *confirm this isn't the same session as the existing `easymcp-desktop.docx` write-up* | `unlocking-ai-productivity-with-easymcp-desktop.docx` | `unlocking-ai-productivity-with-easymcp-desktop-transcript.docx` | `.../en/aicoc/unlocking-ai-productivity-with-easymcp-desktop` |
| 33 | `Brownbag - Deep Dive into AI Catalyst & Accelerating AI Pods.docx` | `deep-dive-into-ai-catalyst-accelerating-ai-pods.docx` | `deep-dive-into-ai-catalyst-accelerating-ai-pods-transcript.docx` | `.../en/aicoc/deep-dive-into-ai-catalyst-accelerating-ai-pods` |
| 34 | `[AI CoC] AI Assisted Coding Brownbag - Principal Sessions V2.docx` | `ai-assisted-coding-brownbag-principal-sessions-v2.docx` | `ai-assisted-coding-brownbag-principal-sessions-v2-transcript.docx` | `.../en/aicoc/ai-assisted-coding-brownbag-principal-sessions-v2` |
| 35 | `Brownbag - You Define It. Agents Execute It. ADC Holds It Together.docx` | `you-define-it-agents-execute-it-adc-holds-it-together.docx` | `you-define-it-agents-execute-it-adc-holds-it-together-transcript.docx` | `.../en/aicoc/you-define-it-agents-execute-it-adc-holds-it-together` |
| 36 | `08-06-26 [AI CoC] Show & Tell - Making Time How We Stay Ahead in the Era of AI.docx` | `making-time-how-we-stay-ahead-in-the-era-of-ai.docx` | `making-time-how-we-stay-ahead-in-the-era-of-ai-transcript.docx` | `.../en/aicoc/making-time-how-we-stay-ahead-in-the-era-of-ai` |
| 37 | `[AI CoC] Show & Tell - From Adobe.com to Anthropic's Blog — and Your Own Claude Marketplace.docx` ⚠️ *least certain — dot in "Adobe.com" and em-dash handling both guessed* | `from-adobecom-to-anthropics-blog-and-your-own-claude-marketplace.docx` | `from-adobecom-to-anthropics-blog-and-your-own-claude-marketplace-transcript.docx` | `.../en/aicoc/from-adobecom-to-anthropics-blog-and-your-own-claude-marketplace` |
| 38 | `[AI CoC] Show & Tell - Smarter Spend, Smarter Agents.docx` | `smarter-spend-smarter-agents.docx` | `smarter-spend-smarter-agents-transcript.docx` | `.../en/aicoc/smarter-spend-smarter-agents` |

## Rows 39/40 — deleted by Dominik (2026-09-04)

`[AI CoC] Show & Tell – AI Assistants.docx` (no match found) and `AI Core Team Meetup_ hallucination prevention - 2nd try .docx` (weak match) were both deleted from the transcripts folder. Nothing further needed for these.

---

**Note:** several write-ups in `content/en/aicoc/` have no transcript at all (e.g. `2025-01-27-learning-machine`, `ai-community-of-communities`, `show-tell-december-4-2024`, and others). That's expected and fine — not every session has a transcript, nothing to do for those.
