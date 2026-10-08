# Ryff Bot Overhaul: Architecture & Milestone Plan

**Status:** Approved for Implementation  
**Audience:** Coding agents, paired developers, and founder.  
**Core Objective:** Transition Ryff from the two hardcoded global bots (Hank and Vee) to a flexible **"one bot per user"** companion model, initially simulated across **5 distinct test bots**:
1. **RobBPaul** (Founder / User Proxy Bot)
2. **Stevie** (Blues / Vintage Dynamics Purist)
3. **Tim** (Modern Tech & Modeller Architect)
4. **Hank** (Grumpy Vintage Luthier)
5. **McGee** (Scrappy High-Gain Modder & Bargain Hunter)

---

## 1. Context & Architectural Strategy

### The Old Model vs The New Model

```
OLD MODEL (Hardcoded 2-Bot Duopoly):
  User ──► Backstage [Toggle: Hank vs Vee]
             └── Hardcoded 4-turn Debate (Hank vs Vee in episodes table)

NEW MODEL (Dynamic Multi-Persona Registry):
  ┌────────────────────────────────────────────────────────┐
  │                 BOT REGISTRY (data/bots/)              │
  │   1. robbpaul   2. stevie   3. tim   4. hank   5. mcgee│
  └──────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────────────┐
            ▼                                         ▼
 ┌─────────────────────────────┐        ┌──────────────────────────────┐
 │     1-ON-1 BACKSTAGE CHAT   │        │     AUTONOMOUS DEBATE        │
 │ • User chats with companion │        │ • Dynamic cast (e.g. 2-3 bots│
 │   bot (default: RobBPaul)   │        │   picked to spar over news)  │
 │ • Can test other 4 bots     │        │ • Flexible multi-turn debate │
 └─────────────────────────────┘        └──────────────────────────────┘
```

### Critical Rule for Future Agents
> **Agent Token Efficiency Directive:**  
> Do **NOT** load the legacy 55KB files (`mvp-architecture-and-build-plan.md` or `technical-implementation-guide.md`).  
> All requirements, schemas, and instructions needed for the bot overhaul are fully self-contained in this file (`BOT_OVERHAUL_PLAN.md`), [`docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md), and [`src/types/bot.ts`](file:///c:/Users/rob_b/Ryff/src/types/bot.ts).

---

## 2. Milestones & Build Order

```
┌─────────────────────────────────────────────────────────────────────────┐
│ M7.1: Bot Registry, Schema & 5 Skeletal Dossiers (Foundation)           │
├─────────────────────────────────────────────────────────────────────────┤
│ M7.2: Backstage Chat Multi-Bot Upgrade (1-on-1 Interaction)             │
├─────────────────────────────────────────────────────────────────────────┤
│ M7.3: Multi-Bot Autonomous Debate Pipeline (Multi-Speaker Sparring)     │
├─────────────────────────────────────────────────────────────────────────┤
│ M7.4: User Personality Onboarding Flow (Future: Dynamic Generation)     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Milestone M7.1: Bot Registry, Schema & 5 Skeletal Dossiers
**Goal:** Define the standard TypeScript contract for bot dossiers, create editable JSON configuration files for all 5 bots, and implement a loader library.

**Tasks:**
1. **Schema Definition ([`src/types/bot.ts`](file:///c:/Users/rob_b/Ryff/src/types/bot.ts)):**
   - Create `BotDossier` type containing:
     - `id`: Unique identifier (e.g., `'robbpaul'`).
     - `name`: Display name (e.g., `'RobBPaul'`).
     - `avatar`: Image path or avatar fallback.
     - `archetype`: Short character summary.
     - `temperature`: LLM sampling temperature (0.0 to 1.0).
     - `voice`: Object with `tone`, `slang`, and `forbidden_phrases`.
     - `biases`: Object with `favoured_gear`, `hostile_concepts`, and `stance_on_modelling`.
     - `irrational_hill_to_die_on`: Stubborn hot take.
     - `disagreement_rate`: Number between 0.0 and 0.5.
     - `sample_lines`: Array of 3–5 realistic anchor quotes.
2. **Skeletal Dossier Files (`data/bots/*.json`):**
   - Create `robbpaul.json`: Working tone pragmatist, values reliable gigging tools, cynical of snake oil and overpriced relics.
   - Create `stevie.json`: Classic blues/rock purist, dynamic tube touch, handwired circuits, nitro finishes.
   - Create `tim.json`: Modern progressive modeller enthusiast, DSP algorithms, studio clarity, multi-scale instruments.
   - Create `hank.json`: Port over the established grumpy vintage luthier persona.
   - Create `mcgee.json`: Scrappy bedroom shredder, modder of cheap guitars/Chibsons, high-gain amp fanatic.
3. **Loader & Prompt Assembler ([`src/lib/bots.ts`](file:///c:/Users/rob_b/Ryff/src/lib/bots.ts)):**
   - Implement `getBot(id: string): BotDossier`.
   - Implement `getAllBots(): BotDossier[]`.
   - Implement `buildBotSystemPrompt(bot: BotDossier, options?: { disagreement?: boolean }): string`.
4. **Unit Tests ([`tests/bots.test.ts`](file:///c:/Users/rob_b/Ryff/tests/bots.test.ts)):**
   - Verify all 5 dossiers load and satisfy schema validation.
   - Verify system prompts assemble correctly with sample lines and anti-filler rules.

**Done When:**
- All 5 JSON files exist and pass validation.
- Unit tests run and pass cleanly in Vitest.
- Zero changes to UI or database yet.

---

### Milestone M7.2: Backstage Chat Multi-Bot Upgrade
**Goal:** Allow users to chat 1-on-1 with any of the 5 bots, defaulting to **RobBPaul** as the companion bot.

**Tasks:**
1. **API Route Parameterization ([`src/app/api/chat/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/chat/route.ts)):**
   - Replace the hardcoded `bot === 'vee' ? 'vee' : 'hank'` check with dynamic lookup using `getBot(requestedBotId || 'robbpaul')`.
   - Pass the bot's configured `temperature` and `sample_lines` to the LLM completion engine.
   - Execute the disagreement dice-roll: if `Math.random() < bot.disagreement_rate`, inject the pushback directive.
2. **Backstage UI Selector ([`src/app/(app)/backstage/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/%28app%29/backstage/page.tsx)):**
   - Replace the 2-button toggle with a responsive bot switcher displaying the 5 avatars and archetypes.
   - Default the active chat to **RobBPaul**.
   - Show the selected bot's archetype and hill-to-die-on in the chat header.
   - Persist messages per bot so history does not collide.
3. **Home & Takeaway Integration:**
   - Allow the user's companion bot (RobBPaul) to provide the primary takeaway card on Home.

**Done When:**
- A user can open Backstage, switch between RobBPaul, Stevie, Tim, Hank, and McGee, and get distinct, in-character replies from all 5.
- RobBPaul responds with the founder's defined tone and biases.

---

### Milestone M7.3: Multi-Bot Autonomous Debate Pipeline
**Goal:** Transition the twice-daily automated news debate from a fixed Hank-vs-Vee 2-person clash to a dynamic debate featuring selected bots from the 5-bot roster.

**Tasks:**
1. **Dynamic Speaker Selection ([`src/pipeline/debate.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/debate.ts)):**
   - Allow passing 2 or 3 bots as debaters for a given topic (e.g. RobBPaul vs McGee on guitar modding; Stevie vs Tim on tube vs digital modellers).
2. **Multi-Turn Sparring:**
   - Round 1: Opening hot take from Speaker A.
   - Round 2: Counter / reaction from Speaker B.
   - Round 3: Wildcard interjection or rebuttal from Speaker C (or Speaker A).
   - Round 4: Room consensus & verdict summary.
3. **Episode Schema & Storage:**
   - Update `episodes.transcript` to store generic `{ speaker_id, speaker_name, text, round }` objects.
   - Maintain backwards-compatibility for existing Hank/Vee episode views while rendering rich speaker badges for new episodes.

**Done When:**
- Running `pnpm episode` or `pnpm pipeline` generates a rich multi-turn debate between dynamically selected bots.

---

### Milestone M7.4 (Future Phase): User Personality Onboarding Flow
**Goal:** Once the 5 test bots are validated, build an interactive UI for new users to generate their own custom companion bot upon signing up.

**Tasks:**
1. **"Barstool Audition" Onboarding Screen (`/onboarding/bot`):**
   - Quick 60-second interactive questionnaire:
     - *Question 1:* What's your number one guitar and amp? (Rig bias)
     - *Question 2:* What guitar trend drives you up the wall? (Hostile concepts & irrational hill)
     - *Question 3:* What kind of banter do you like? (Aggressive, dry, sarcastic, encouraging)
2. **AI Persona Generator API (`POST /api/persona/generate`):**
   - Takes the questionnaire answers and executes a structured call to Gemini Flash to compile a complete, validated `BotDossier`.
3. **User Bot Persistence:**
   - Save the custom dossier to the database (`user_bots` or `users.custom_bot`), linking it as that user's personal companion.

**Done When:**
- A brand new user can complete onboarding and immediately start chatting with their uniquely generated bot in Backstage.

---

## 3. Reference Files

- Manual Tuning Guide: [`docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md`](file:///c:/Users/rob_b/Ryff/docs/BOT_BEHAVIOR_AND_TUNING_GUIDE.md)
- Bot Dossiers: `data/bots/*.json`
- Feature Log: [`Ryff_features.md`](file:///c:/Users/rob_b/Ryff/Ryff_features.md)
