# [Working Title]: A Niche AI Bot Platform
### Full project brief · Draft, September 2026

---

## 0. How to use this document (note for the infographic agent)

This brief is the source material for infographics and a partner pitch. Every figure is tagged by confidence. **Do not present [ESTIMATE] or [PLACEHOLDER] figures as facts.**

- **[SOURCED]**: taken from a public source listed in Section 15. Verify before publishing externally.
- **[ESTIMATE]**: the author's reasoned guess, illustrative only.
- **[PLACEHOLDER]**: to be agreed between the founders.

**Purpose and tone:** the goal of the pitch is to get the partner roughly 60% convinced, enough to look at a working MVP, not to secure a full commitment. Keep the tone low-pressure and emphasise that the plan lets him walk away cheaply at each decision gate. No ownership or equity terms are being proposed at this stage.

Currency is GBP unless stated. Suggested infographic panels are in Section 14.

---

## 1. One-line summary

A platform where anyone can create an AI bot with its own personality and interests. The bot researches a topic all day, sends its owner a digest of what it found, and talks to other people's bots, and the owner watches the outcome.

**Elevator pitch:** Think of a digital pet that reads the internet for you. It develops taste from what it reads and who it talks to, and it reports back. It launches in one passionate hobby niche (guitar), on an engine designed so the niche can be swapped for a more lucrative one (B2B, creators, professional communities).

---

## 2. Product concept

### 2.1 The core loop

1. **Create.** The user defines their bot: name, temperament, personality, topics and sources.
2. **Research.** On a schedule set by the platform, the bot searches and reads within its niche.
3. **Digest.** The owner receives a short report of what the bot found, in the bot's own voice.
4. **Converse.** The bot talks with other bots on topics the owner sets or suggests. The owner can read the transcripts.
5. **Share.** Funny or insightful bot conversations are shareable, which is free marketing.

### 2.2 Bot personas

- **Original archetypes** (launch default): for example "the grumpy luthier" or "the 70s session player". No licensing risk.
- **Licensed niche creators** (later): small YouTubers, reviewers or makers who license a persona on revenue share. They gain an audience channel and their communities arrive already knowing the character.
- **Famous-person likenesses**: deliberately *not* part of the launch (see Section 10).

### 2.3 Guardrails (design decisions)

- Bots are **sandboxed**: no access to the owner's files, accounts or devices.
- Bots are clearly labelled as AI, and never claim to be a licensed professional.
- Adults only at launch (18+) [design suggestion].
- Bot activity is **scheduled and budgeted by the platform**, not driven by users, which is the main cost-control mechanism (Section 7).

---

## 3. Market context

### 3.1 Moltbook timeline [SOURCED]

| Date | Event |
|---|---|
| 28 Jan 2026 | Moltbook launches, a Reddit-style social network for AI agents, created by Matt Schlicht |
| ~1 Feb 2026 | Within about a week, reportedly 37,000+ AI agents and 1M+ human visitors observing (per the founder, via NBC News) |
| 31 Jan 2026 | Forbes reports a claim of 1.4M agents, and questions whether the number is real |
| 10 Mar 2026 | Meta acquires Moltbook; the team joins Meta Superintelligence Labs; terms undisclosed (per third-party summary of Axios reporting; verify) |

Moltbook is built on the OpenClaw agent framework (originally Clawdbot, briefly Moltbot).

### 3.2 What Moltbook proved

- People are fascinated by watching bots talk to each other (1M+ human visitors in the first week).
- A big platform company considered the category worth acquiring.
- Growth was throttled by API cost per interaction, not by demand [SOURCED, Forbes].

### 3.3 What Moltbook is not

- **Not for ordinary users.** Participation requires running your own agent framework (OpenClaw).
- **Bot-first, human-hostile.** Humans observe; the owner gets no direct benefit.
- **No personas or niche focus.** It's one general forum.
- **Security concerns.** Third-party sites and commentators flag prompt-injection risk when agents with real system access read untrusted posts [verify before citing].

### 3.4 Other players

| Product | What it does | Gap relative to this idea |
|---|---|---|
| Moltbook (Meta) | Agent-only forum | Technical users only, no owner value, no personas |
| Character.AI | User-created and celebrity personas, chat with the user | Mostly user-to-bot, not bot-to-bot; heavy legal and safety exposure |
| Meta AI personas | Celebrity-backed characters on Instagram, Messenger, WhatsApp (launched 2023) | Celebrity-only, controlled by Meta, no user-defined bots |
| OpenAI Sora | AI video app with reusable "characters" that have handles and permissions | Video, not conversation or research |

### 3.5 The gap

Nobody has clearly shipped the combination: **user-defined persona bot + scheduled niche research + a personal digest + bot-to-bot conversation, for normal (non-technical) users, in a niche community.**

---

## 4. Why our angle is different

| Dimension | Moltbook | This platform |
|---|---|---|
| Who participates | People running their own agent framework | Anyone; no setup |
| Value to the owner | Entertainment / observation | Daily digest of research + entertainment |
| Focus | General | Niche first (guitar) |
| Bot safety | Agents may hold real system access | Sandboxed bots |
| Cost model | Uncontrolled agent activity | Scheduled runs, hard token budgets |
| Distribution | Viral novelty | Existing reach into a hobby community |
| Scalability | One forum | One engine, many niches (configuration) |

---

## 5. Why guitar first

- The builder is a guitarist with existing reach to thousands of players, which makes it a real distribution channel.
- The builder can **judge output quality instantly**: is the digest useful or generic? This is the scarcest advantage when building an AI product.
- Hobbyists spend money on gear, which supports affiliate revenue and maker or brand sponsorships.
- Large, passionate, well-connected community (forums, subreddits, YouTube) that Meta is unlikely to prioritise.
- Similar fits for later: mechanical keyboards, film photography, fountain pens, specialty coffee, retro gaming.

---

## 6. Engine vs niche

The platform is built so the niche is **configuration**:

- Sources the bots read
- Persona set
- Digest format
- Tone and topic vocabulary

Guitar-specific code is kept thin. This lets a second niche, chosen by the partner from the AI/software world, run on the same engine for a parallel test.

**Note on the AI-creator audience:** AI creators are the users most able to build this themselves, and AI-news digests are a crowded category. Their networks may be more valuable as *distribution* (communities, agencies, branded bots) than as end customers. To be tested, not assumed.

---

## 7. Unit economics

### 7.1 Model pricing [SOURCED]

Claude Haiku 4.5 (cheapest current Claude model): **$1 input / $5 output per million tokens**. Batch processing gives a **50% discount**. Cached input reads cost about **10%** of the standard input rate. Other providers' small models may be cheaper still. Web-search fees are extra and unpriced here. Check the official pricing page before finalising.

### 7.2 Cost-control design

- Bots run on a **fixed schedule**, not continuously (for example, one research cycle per day).
- **Hard daily token cap** per bot.
- **Shared research cache**: research a topic once (say, a new pedal release), then each bot interprets it through its own persona. This is the biggest saving.
- Batch processing for anything not needed in real time.
- Small, cheap model by default.
- Email verification and per-account caps to stop free-compute farming.

### 7.3 Estimated cost per active user [ESTIMATE]

| Scenario | Cost per active user per month |
|---|---|
| Disciplined design (above) | **£0.15 to £0.50** |
| Uncapped, chatty bots | Roughly 10x higher |

### 7.4 The break-even rule [ESTIMATE, illustrative]

For a freemium model, the free tier must cost no more than **conversion rate × subscription price**.

- Assume ~4% conversion (common ballpark) and a £4/month subscription.
- Break-even free-user cost ≈ 0.04 × £4 = **£0.16 per user per month**.
- Example at 10,000 users: revenue ≈ £1,600/month. If free users cost £1 each, cost ≈ £10,000/month, a heavy loss. At £0.15 each, cost ≈ £1,500/month, roughly break-even.

**Implication:** the free tier must be very light. This is a subscription business, not a one-off-purchase business, because costs recur.

---

## 8. Monetisation options (ranked by promise)

1. **B2B / creator-branded bots**: brands, makers, communities or professional firms pay for a bot or a pilot. Highest value; where the pivot lives.
2. **Freemium subscription**: free bot with a light digest and a couple of conversations; paid tier (~£3 to £5/month [PLACEHOLDER]) adds topics, frequency and more bots.
3. **Affiliate links**: a gear-research bot naturally surfaces products and deals. Commissions are typically low single-digit percentages. Must be disclosed or trust is lost.
4. **Ads**: negligible at five-figure user numbers; not a focus.
5. **Exit**: acquisition or acqui-hire. Upside only; not a plan.

---

## 9. Honest expected value (consumer-only view) [ESTIMATE, illustrative]

Outcomes over 12 to 24 months. Probabilities and payoffs are the author's guesses, meant to structure thinking.

| Outcome | Probability | Approx. net |
|---|---|---|
| Stalls under ~2,000 users | 55% | -£1.5k (cash only) |
| Small community, roughly breaks even | 30% | +£10k |
| 10k+ users, subscriptions and affiliates work | 12% | +£30k |
| Acquisition or acqui-hire | 3% | £250k (highly uncertain) |
| **Probability-weighted total** | | **≈ £13k** |

**Reading this honestly:**

- More than half of the ≈ £13k comes from the 3% acquisition tail. Without it, expected value is closer to **£6k**.
- Real effort including sourcing and promoting users may be 800 to 1,000 hours over a year, so this is a poor standalone consumer business.
- **The case for building is as a cheap option on something bigger**: prove the engine, then pivot to a more lucrative B2B or creator market.
- Consumer numbers from a hobby niche are a *weak* signal to a B2B buyer. A signed pilot is worth more than 10,000 free users.

---

## 10. Legal and safety considerations

This is not legal advice. Take proper advice before launching.

- **Likeness of real people.** The right of publicity gives people control over commercial use of their identity. Laws such as the ELVIS Act and the proposed NO FAKES Act target unauthorised digital replicas and voice mimicry [SOURCED]. Decision: no celebrity likenesses at launch; original archetypes or licensed niche creators only.
- **Chatbot liability.** Character.AI and Google settled several cases in January 2026, and a May 2026 Pennsylvania action targeted a bot that allegedly presented itself as a licensed medical professional [SOURCED]. Courts are examining design choices such as persona fidelity and age verification. Mitigations: 18+ only, no claims of professional credentials, crisis-response handling, clear AI labelling.
- **Prompt injection.** Bots reading untrusted content can be manipulated. Mitigation: sandboxing, no access to user accounts or data.

---

## 11. Plan: 10 weeks, capped spend

| Phase | Weeks | Activity | API cost [ESTIMATE] |
|---|---|---|---|
| Concierge test | 1 to 3 | Run 20 to 50 guitarists' bots semi-manually; email digests. **In parallel:** 8 to 10 conversations with prospective B2B or creator customers in the partner's network | ~£10 to £25/month |
| Skeletal platform | 4 to 10 | Invite-only, a few hundred users, hard cost ceiling | ~£50 to £250/month |
| **Total test budget** | | | **≈ £500** |

### Decision gates

- **End of week 4** and **end of week 10**: continue, pivot or stop.
- Metrics to track: digest open rate, day-7 return rate, sharing of bot conversations, willingness to pre-pay, and B2B interest in a paid pilot.
- Suggested starting thresholds, purely proposals to agree: digest open rate ≥ 40%, day-7 return ≥ 25%, at least one B2B contact willing to discuss a pilot [PLACEHOLDER].

---

## 12. Roles, asks and terms

### Builder (guitarist / product)
- Builds the skeletal platform
- Runs the guitar test and judges output quality
- Recruits the initial guitar community

### Partner (AI/software business owner)
- Provides a capped test budget [PLACEHOLDER: confirm; suggested ≈ £500]
- 5 to 10 introductions to potential B2B, creator or community customers
- Chooses a second niche from his world to run on the same engine
- Attends two decision meetings (weeks 4 and 10)

### Terms to agree [PLACEHOLDER]
- Test budget amount and what it covers
- Who owns the code, brand and data
- What happens at each decision gate (stop, continue, pivot)

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| API costs balloon | Scheduled runs, per-bot token caps, shared research cache, invite-only launch |
| Novelty fades | Lead with the owner's digest (personal value), not just bot chat |
| Meta or another giant moves into the niche | Stay niche; own the community relationships and licensed creators |
| Legal exposure over personas | No celebrity likenesses; original or licensed niche creators; 18+ |
| Free users never convert | Subscription tier tested early; hard limits on free tier |
| B2B market doesn't value it | Validate through conversations before scaling; treat consumer numbers as proof-of-engine only |
| Second-niche test never happens | Partner commits to a specific niche and date up front |
| Compute farmed by fake accounts | Verification, caps, invite-only |

---

## 14. Infographic brief (for the agent)

Suggested panels, each with the data to use. Keep charts simple and label estimates as estimates.

1. **"The Moltbook timeline."** Horizontal timeline: 28 Jan launch → ~1 Feb 37k agents / 1M+ human visitors → 10 Mar Meta acquisition. Caption: *The category is proven.*
2. **"How it works."** Circular flow diagram: Create → Research → Digest → Converse → Share (Section 2.1).
3. **"Us vs Moltbook."** Two-column comparison, using the table in Section 4.
4. **"Why guitar first."** Icon list of four reasons (Section 5) with a "one engine, many niches" arrow to future niches.
5. **"What does a user cost?"** Bar comparison: disciplined design £0.15 to £0.50 vs uncapped ≈10x. Label as estimate.
6. **"The break-even rule."** Simple formula graphic: *free cost per user ≤ conversion × price* (0.04 × £4 = £0.16), with the 10,000-user worked example.
7. **"10-week plan."** Gantt-style bar: weeks 1 to 3 concierge test + interviews, weeks 4 to 10 skeletal build, gates at week 4 and week 10, ≈ £500 cap.
8. **"Honest odds."** Scenario bar chart from Section 9, marked *illustrative*, with the note "Real bet = pivot to B2B."

**Style suggestions:** clean, modern, one accent colour; minimal text per panel; consistent icons; label all estimates visibly; no celebrity likenesses or copyrighted characters in imagery.

---

## 15. Sources

Verify before external use; several are third-party summaries.

- NBC News, Moltbook launch and early numbers: https://www.nbcnews.com/tech/tech-news/ai-agents-social-media-platform-moltbook-rcna256738
- Forbes on Moltbook, the 1.4M agent claim and API-cost throttling: https://www.forbes.com/sites/guneyyildiz/2026/01/31/inside-moltbook-the-social-network-where-14-million-ai-agents-talk-and-humans-just-watch/
- Third-party summary of the Meta acquisition (originally Axios): https://moltsbooks.com/
- Claude API pricing (official): https://docs.claude.com/en/docs/about-claude/pricing
- Pricing summaries: https://developer.puter.com/tutorials/claude-api-pricing and https://fast.io/resources/anthropic-api-pricing-guide/
- Character.AI litigation overview: https://www.softwareseni.com/character-ai-lawsuits-2026-what-happened-what-courts-are-examining-and-why-it-matters/
- Persona AI settlements: https://lawfold.com/persona-ai-lawsuit/
- Likeness and AI law overview: https://www.superlawyers.com/resources/science-and-technology-law/can-companies-use-my-likeness-for-ai-applications/
- Meta AI celebrity personas: https://www.tomsguide.com/news/meta-ai-chatbots-unveiled-tom-brady-kylie-jenner-snoop-dog-and-more
- OpenAI Sora characters: https://www.macrumors.com/2025/10/30/openai-sora-app-character-cameos-video-stitching/
