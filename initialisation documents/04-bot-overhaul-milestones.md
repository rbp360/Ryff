# 04 — Milestones M7.1 → M7.4 (Bot Overhaul, 5-Bot Simulation & Persona Architecture)

**Audience:** The implementing agent and founder reviewing progress.  
**Prereqs:** Read [`docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md); inspect `data/bots/*.json`.  
**Companion File:** Identical canonical plan maintained at [`docs/BOT_OVERHAUL_PLAN.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_OVERHAUL_PLAN.md).

---

## The 5-Bot Roster
1. **RobBPaul** (Founder / User Proxy Companion Bot)
2. **Stevie** (Blues & Vintage Tube Dynamics Purist)
3. **Tim** (Modern Progressive Tech & DSP Modeller Architect)
4. **Hank** (Grumpy Vintage Luthier)
5. **McGee** (Scrappy High-Gain Modder & Pawn Shop Deal Hunter)

---

## Build Order

- [ ] **M7.1: Bot Registry, Schema & 5 Skeletal Dossiers**
  - [x] Schema definition in `src/types/bot.ts`.
  - [x] 5 JSON starter dossiers in `data/bots/` (`robbpaul.json`, `stevie.json`, `tim.json`, `hank.json`, `mcgee.json`).
  - [ ] Loader & prompt assembler in `src/lib/bots.ts`.
  - [ ] Unit tests in `tests/bots.test.ts`.

- [ ] **M7.2: Backstage Chat Multi-Bot Upgrade**
  - [ ] Update `/api/chat` to accept dynamic `botId` (defaulting to `robbpaul`).
  - [ ] Build 5-bot selector bar in `/backstage`.
  - [ ] Wire up disagreement rate & dynamic temperature.

- [ ] **M7.3: Multi-Bot Autonomous Debate Pipeline**
  - [ ] Refactor `src/pipeline/debate.ts` to pick 2–3 bots dynamically from the registry.
  - [ ] Multi-turn debate generation with flexible speakers.

- [ ] **M7.4 (Future Phase): User Personality Onboarding Flow**
  - [ ] "Barstool Audition" interactive onboarding questionnaire.
  - [ ] AI persona generator compiling answers into a custom user `BotDossier`.

---
*For complete implementation details, guidelines, and tuning mechanics, see [`docs/BOT_OVERHAUL_PLAN.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_OVERHAUL_PLAN.md) and [`docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md).*
