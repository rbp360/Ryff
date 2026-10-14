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

To onboard a user's custom companion bot, we do not ask users to write JSON or draft catchphrases. We ask plain-English questions that feel like a casual conversation at a guitar shop counter or pub barstool, centered around a freeform player manifesto:

### Core Prompt: The 100-Word Player Manifesto
* **UI Label:** *"Describe what kind of player you want your bot to be in ~100 words (or write about yourself!)."*
* **Example User Input:** *"I'm Slash, from the Sunset Strip in 1987. Bottle of Jack and a copied Les Paul is all I have to my name. Playing songs I think the Stones should've written. Don't care about the glam bands in the scene, don't care about gear hype—just want to play loud, brash, and loose. More of a blues player gone bad than an out-and-out shredder. Hate posers like Mötley Crüe."*
* **Mapped Dossier Field:** `player_manifesto`, synthesized `archetype`, inferred `temperature` (dial 0.3–0.85), inferred `disagreement_rate` (dial 0.2–0.45), `voice.tone`, and seed for `sample_lines`.

### Trait & Affinity Prompts:
1. **The Number One Rig & Favourite Gear:**
   - *UI Label:* *"What's your number one guitar and amp setup?"*
   - *Mapped Field:* `biases.favoured_gear`
2. **Hero Players & Influences:**
   - *UI Label:* *"Who are your guitar heroes or favourite players?"* (e.g. Keith Richards, Rory Gallagher, Gilmour)
   - *Mapped Field:* `biases.favoured_players`
3. **Disliked / Distrusted Players & Scenes:**
   - *UI Label:* *"What players, trends, or scenes do you find overrated or unlistenable?"* (e.g. 80s hair metal posers, sterile sweep-picking shredders)
   - *Mapped Field:* `biases.disliked_players`
4. **Trusted Gear Sources & Channels:**
   - *UI Label:* *"What YouTube channels, magazines, or communities do you actually trust?"* (e.g. That Pedal Show, Premier Guitar)
   - *Mapped Field:* `biases.trusted_sources`
5. **Distrusted / Hype Sources:**
   - *UI Label:* *"What channels or sites do you avoid or distrust?"* (e.g. clickbait gear vloggers, corporate PR releases)
   - *Mapped Field:* `biases.distrusted_sources`
6. **The Pet Peeve & Hill to Die On:**
   - *UI Label:* *"What guitar trend, spec, or habit drives you completely up the wall?"*
   - *Mapped Field:* `biases.hostile_concepts` and `irrational_hill_to_die_on`
7. **The Cliché You Hate:**
   - *UI Label:* *"What cliché would your bot never be caught dead saying?"*
   - *Mapped Field:* `voice.forbidden_phrases`
8. **Banter Style (The Attitude Dial):**
   - *Options:*
     - **Dry & Cynical:** *"Skeptical of marketing hype, values proven gigging reliability."*
     - **Grumpy Purist:** *"Analog only, values craftsmanship and physical repairability."*
     - **Tech Realist:** *"Pragmatic about audio science, DSP modelling, and mix ergonomics."*
     - **Scrappy Modder:** *"Irreverent, loud, loves budget hacks, pawnshop beaters, and high gain."*
     - **Wild Renegade:** *"Loud, loose, visceral rock 'n' roll street swagger; hates posers."*

---

## 3. The AI Persona Compiler (`POST /api/persona/generate`)

When the user submits the questionnaire, the server calls Google Gemini (`MODEL_FAST` or `MODEL_SMART`) with the **Persona Compiler Prompt** to extract entities, calculate behavioral dials, and compile a complete, validated `BotDossier` object.

### The Compiler Prompt Specification

```markdown
You are the Ryff Persona Compiler. Your job is to convert raw questionnaire answers and a ~100-word musician manifesto into a rich, authentic guitar character dossier for a 1-on-1 sparring bot and pub debater.

CRITICAL RULES:
1. Do NOT generate bumper-sticker slogans or tired rock clichés (e.g. "play it like you stole it", "melt faces", "rock on").
2. Parse the ~100-word player description to infer:
   - "temperature": 0.3 (surgical, precision tech) to 0.85 (loose, brash, rock-and-roll street swagger).
   - "disagreement_rate": 0.20 to 0.45 based on skepticism of posers, hype, or modern trends.
   - "archetype": A punchy 3-5 word label (e.g. "Sunset Strip Blues-Rock Renegade", "Benchtop Tube Purist").
3. Extract explicit entities into:
   - favoured_gear, hostile_concepts, favoured_players, disliked_players, trusted_sources, distrusted_sources.
4. Write 3 distinct "sample_lines" that demonstrate how this exact player ARGUES technical points about gear. Each line must debate a real hardware aspect (string gauge, pots, nut slots, valve sag, latency, capacitors, mix clarity) in their authentic voice.
5. Derive 3-5 forbidden phrases from the user's hates so the bot never sounds like generic AI filler or a cliché machine.

Output valid JSON matching this schema:
{
  "name": string,
  "archetype": string,
  "player_manifesto": string,
  "temperature": number,
  "voice": {
    "tone": string,
    "slang": string[],
    "forbidden_phrases": string[]
  },
  "biases": {
    "favoured_gear": string[],
    "hostile_concepts": string[],
    "favoured_players": string[],
    "disliked_players": string[],
    "trusted_sources": string[],
    "distrusted_sources": string[],
    "stance_on_modelling": string
  },
  "irrational_hill_to_die_on": string,
  "disagreement_rate": number,
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
