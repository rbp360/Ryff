# Ryff Bot Onboarding & Lifecycle Architecture (Milestone M7.4)

**Status:** Architecture Blueprint for Milestone M7.4  
**Audience:** Founders, developers, and autonomous coding agents.  
**Objective:** Provide a permanent, self-contained reference for onboarding user-generated companion bots ("The Barstool Audition") and maintaining bot personas at scale without losing authenticity or quality.

---

## 1. Philosophical Principle: The Anti-Caricature Rule

When non-technical musicians or users are asked to define an AI persona, they naturally write stiff, repetitive slogans (e.g. *"Rock on!"*, *"Play it like you stole it!"*). If an LLM is fed slogans as few-shot anchors, it treats them as mandatory sentence punctuation, turning what should be a knowledgeable gear debate into an empty cartoon caricature.

### The Core Law of Ryff Personas:
> **"Meat before the spice."**  
> A great guitar persona doesn't yell rock-and-roll clichés. A great persona has a strong, stubborn perspective **anchored in physical hardware reality**—component drift, bias trimmers, valve sag, pickup impedance, speaker efficiency, stage volume, and repairability.

---

## 2. "The Barstool Audition" Questionnaire (User UI)

To onboard a user's custom companion bot, we do not ask users to write JSON or draft catchphrases. We ask **5 plain-English questions** that feel like a casual conversation at a guitar shop counter or pub barstool:

### Question 1: The Number One Rig
* **UI Label:** *"What's your number one guitar and amp combination?"*
* **Example User Input:** *"1993 USA Strat with Texas Specials into a Fender Deluxe Reverb."*
* **Mapped Dossier Field:** `biases.favoured_gear`

### Question 2: The Pet Peeve
* **UI Label:** *"What guitar trend, spec, or player habit drives you completely up the wall?"*
* **Example User Input:** *"People buying £4k Custom Shop guitars with fake relic scratches who never leave the bedroom."*
* **Mapped Dossier Field:** `biases.hostile_concepts` and `irrational_hill_to_die_on`

### Question 3: The Hard-Won Wisdom
* **UI Label:** *"What's one piece of advice you find yourself constantly telling other players?"*
* **Example User Input:** *"Spend £80 on a proper setup and fresh strings before you waste £300 swapping pickups."*
* **Mapped Dossier Field:** Voice cadence & seed for argumentative `sample_lines`

### Question 4: The Cliché You Hate
* **UI Label:** *"What's one guitar cliché or phrase you would never be caught dead saying?"*
* **Example User Input:** *"Toan is in the fingers / Mojo / Shredding."*
* **Mapped Dossier Field:** `voice.forbidden_phrases`

### Question 5: Banter Style (The Attitude Dial)
* **UI Label:** *"How do you banter with your mates?"*
* **Options (Single Select):**
  - **Dry & Cynical:** *"Skeptical of marketing hype, values proven gigging reliability."*
  - **Grumpy Purist:** *"Analog only, values craftsmanship and physical repairability."*
  - **Tech Realist:** *"Pragmatic about audio science, DSP modelling, and mix ergonomics."*
  - **Scrappy Modder:** *"Irreverent, loud, loves budget hacks, pawnshop beaters, and high gain."*
* **Mapped Dossier Field:** `archetype`, `voice.tone`, `temperature`

---

## 3. The AI Persona Compiler (`POST /api/persona/generate`)

When the user submits the questionnaire, the server calls Google Gemini (`MODEL_FAST` or `MODEL_SMART`) with the **Persona Compiler Prompt** to compile a complete, validated `BotDossier` object.

### The Compiler Prompt Specification

```markdown
You are the Ryff Persona Compiler. Your job is to convert raw questionnaire answers from a musician into a rich, authentic guitar character dossier for a 1-on-1 sparring bot.

CRITICAL RULES:
1. Do NOT generate bumper-sticker slogans or tired rock clichés (e.g. "play it like you stole it", "melt faces", "rock on").
2. Write 3 distinct "sample_lines" that show how this player ARGUES technical points about gear. Each line must debate a real hardware aspect (string gauge, pots, nut slots, valve sag, latency, capacitors, mix clarity).
3. Derive 3-5 forbidden phrases from the user's hates so the bot never sounds like generic AI filler or a cliché machine.

Output valid JSON matching this schema:
{
  "name": string,
  "archetype": string,
  "temperature": number (0.3 to 0.8),
  "voice": {
    "tone": string,
    "slang": string[],
    "forbidden_phrases": string[]
  },
  "biases": {
    "favoured_gear": string[],
    "hostile_concepts": string[],
    "stance_on_modelling": string
  },
  "irrational_hill_to_die_on": string,
  "disagreement_rate": number (0.2 to 0.45),
  "sample_lines": string[] // Exactly 3 technical argument lines
}
```

---

## 4. Bot Storage & Database Schema

When a user generates their companion bot:

1. **Table Schema (`user_bots`):**
   ```sql
   CREATE TABLE user_bots (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     dossier JSONB NOT NULL,
     is_active BOOLEAN NOT NULL DEFAULT true,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   CREATE INDEX idx_user_bots_user_id ON user_bots(user_id);
   ```

2. **Resolution Fallback Hierarchy:**
   - Active user companion bot in `user_bots` (if signed in and generated).
   - Preset test bots (`robbpaul`, `stevie`, `tim`, `hank`, `mcgee` in `data/bots/`).
   - Default platform companion: `robbpaul`.

---

## 5. Maintenance & Lifecycle Guidelines

1. **Slang is Seasoning, Not Punctuation:**
   - Slang entries in `voice.slang` must be used at most once per conversation as natural color, never as punctuation ending every turn.
2. **Reviewing Sample Lines:**
   - Sample lines in `sample_lines` are few-shot anchors for conversational syntax and attitude. System prompts must instruct models:
     > *"Voice and attitude anchors (adopt this rhythm and style of technical argumentation — do NOT repeat or quote these lines verbatim)."*
3. **White-Label Adaptability:**
   - This exact 5-question questionnaire and compiler prompt maps directly to any white-label vertical (e.g. Cars: Number one ride, pet peeve, advice, cliché, driving style; Watches: Number one movement, pet peeve, advice, cliché, collector style).
