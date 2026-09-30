# LLM Model Brief: GuitarBot MVP — cheapest options

**Purpose:** for another agent to research current cheapest models and report back which tiers suit each task.

---

## Tasks and tier requirements

| Task | Tier needed | Current pick (spec'd in 01–03) | Must-haves |
|---|---|---|---|
| **Ingest: digest each news item** | **Budget** | Haiku 4.5 (~£0.001 per item) | Reliable JSON output; no hallucination; batch 8 items per call |
| **Ingest: deal matching (Reverb query)** | **Budget** | No LLM; API only | — |
| **Pipeline: debate (Hank vs Vee, 4 turns)** | **Smart** | Sonnet-class (~£0.25–0.70 per run) | Persona consistency; can argue coherently; understands the sources |
| **Pipeline: format debate to JSON** | **Budget** | Haiku (~£0.05 per episode) | Reliable extraction; zod-validated output |
| **Chat: user question → personalized answer** | **Budget** | Haiku (~£0.002 per message with cache) | Rig-aware filtering; cite sources as tokens; <350 word output |
| **Rig parse: free-text lines → structured gear** | **Budget** | Haiku (~£0.0005 per user per parse) | JSON output; robust fallback to raw text |

---

## Expected token counts per user per month

**Assumption:** 100-user cadre, 10 messages/day cap; realistic average ≈ 25 msgs/month (some power users hit the cap, most use less).

### Per free user (monthly, all tasks)
- **Chat messages:** 25 × (200 in + 200 out tokens avg) = **10,000 tokens**.
- **Prompt overhead per message (persona, episode cache, context):** ~1,500 input tokens cached (read at 10% input cost via prompt cache), amortised across 25 msgs = **60 tokens per user** (in billing).
- **Rig parse (one-time signup + occasional edits):** ~100 tokens input, ~50 output = **150 tokens**.
- **Total per free MAU:** ~**10,210 tokens input (9,660 at cached rates), 5,000 output**.
- **Monthly cost at Haiku rates (£0.001/$1 in, £0.005/$5 out, cache read 10%):**
  - Inputs: 9,660 × £0.001 / 1M = **£0.010**
  - Outputs: 5,000 × £0.005 / 1M = **£0.025**
  - **Total per MAU: ~£0.035/month** (without the daily shared debate overhead).

### Pipeline overhead (fixed, not per-user)
- **Daily debate (2 runs):** 2 × ~1,000 input (items) + turns × 200 output (Sonnet) + format (Haiku) = **~4,000 input + 2,000 output per day**.
- **Monthly (60 runs):** **240k input, 120k output** (Sonnet-heavy: ~£40–50 of the ~£60 fixed monthly cost).
- **Digesting items:** ~60 new items/day, 8 per batch call, 6 calls/day; Haiku ~200 in + 100 out each = **1,200 in + 600 out/day** (about £6/month).

---

## Margin-saving levers (for the agent to evaluate)

1. **Cheaper budget tier:** if a model cheaper than Haiku 4.5 exists (e.g., Gemini 1.5 Flash at ~50% Haiku price), use it for digest, rig-parse, and format. The debate must stay smart (Sonnet-class or equivalent).
2. **Prompt caching:** the largest saving. Persona + today's episode block (~1,500 tokens) is cached; read cost ≈ 10% of input. Every message hits this cache. **Do not abandon caching to save setup time.**
3. **Batch API:** if available and cheaper than equivalent real-time calls, use for digest and rig-parse (non-urgent).
4. **Debate frequency:** currently twice daily. Reduce to once daily saves ~50% of the smart-model cost (~£20–25/month).
5. **Chat model downgrade for users:** if a budget model can handle chat (e.g., Claude 3.5 Haiku or Gemini Flash), use it; the current spec uses Haiku already.

---

## Key constraints (non-negotiable for the agent)

- **Debate model must be strong enough** that the output is entertaining and factually grounded (Sonnet, Opus, GPT-4o or equivalent; **do not use a budget model here**).
- **All models must output reliable JSON** (zod validation in place; failures fall back to retry once, then mark as failed).
- **Prompt caching must work** (read cost ~10% of input). Not all models support it (e.g., some open-source quantized models don't); verify in the research.
- **Cost must stay under £90/month for the full stack** at 100 cadre users.

---

## Research checklist for the agent

- [ ] Current model prices and tier names (as of today; docs move fast).
- [ ] Prompt-caching support: yes/no per model.
- [ ] Batch API availability and pricing.
- [ ] Reliability: what do users report about JSON output quality?
- [ ] Latency: suitable for streaming chat (sub-5s TTFB preferred)?
- [ ] Recommendation: which model(s) to use per tier, why, and the estimated monthly cost for GuitarBot at 100 MAU?

Report back with a table like:

| Provider | Model | Tier | Price (in/out per 1M) | Cache? | Batch? | Verdict | Monthly cost (GuitarBot) |
|---|---|---|---|---|---|---|
| Anthropic | Haiku | Budget | … | Yes | No | **Keep (debate is Sonnet)** | ~£50 |
| OpenAI | GPT-4o Mini | Budget | … | Yes | Yes | Test (if <£0.003 in) | … |
| Google | Gemini 1.5 Flash | Budget | … | ? | ? | Research | … |

(This table is for the agent; you will not see it unless it is cheap enough to matter.)
