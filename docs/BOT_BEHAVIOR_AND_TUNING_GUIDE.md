# Ryff Bot Behavior & Tuning Guide (The Founder's Manual)

This guide explains in plain English how the technical settings in Ryff govern your bots' personalities, speech styles, and attitudes. Use this document as your reference whenever you want to manually adjust a bot or create a new one.

---

## 1. Quick Reference: The Personality Knobs

Every bot in Ryff has a **Dossier** file (e.g., `data/bots/robbpaul.json`). Inside that file, you can change specific knobs to alter how the bot behaves:

| Setting in Dossier | What it controls | How to adjust it | Real-world effect |
| :--- | :--- | :--- | :--- |
| **`temperature`** | Randomness & creativity (0.0 to 1.0) | `0.3` = conservative/factual<br>`0.7` = natural banter<br>`0.9` = wild, witty, unpredictable | Lower if the bot talks nonsense; raise if it feels too repetitive or robotic. |
| **`voice.tone`** | Overall emotional mood | Short descriptive phrases: *"dry wit, blunt, cynical of marketing"* | Sets the baseline mood for all responses. |
| **`sample_lines`** | Exact rhythm, slang, and speech cadence | 3 to 5 realistic quotes of how the bot speaks | **The #1 most powerful lever.** The AI mimics the phrasing, sentence length, and vocabulary of these examples. |
| **`biases.favoured_gear`** | Brand & spec allegiance | List of strings: `["Marshall", "Telecasters", "Tubes"]` | When asked about gear, the bot instinctively praises and recommends these items. |
| **`biases.hostile_concepts`** | Things the bot dislikes | List of strings: `["Modellers", "Factory Relics", "Active Pickups"]` | The bot will criticize, mock, or dismiss these ideas during debates and chat. |
| **`irrational_hill_to_die_on`** | An unshakeable, stubborn opinion | One provocative sentence: *"Factory relic finishes are a cash grab."* | Gives the bot a distinct, stubborn quirk that sparks natural debates instead of fence-sitting. |
| **`disagreement_rate`** | How often it challenges you (0.0 to 0.5) | `0.10` = 10% (agreeable mentor)<br>`0.25` = 25% (balanced peer)<br>`0.40` = 40% (feisty debater) | Controls a code dice-roll before each chat turn: if triggered, the bot actively pushes back on your opinion. |
| **`voice.slang`** | Preferred idiomatic phrases | List of words: `["mate", "snake oil", "sorted", "chug"]` | The bot weaves these natural idioms into its sentences. |
| **`voice.forbidden_phrases`** | Banned AI filler words | List: `["Certainly!", "As an AI", "I'd be happy to help", "Delve"]` | Filters out corporate "AI politeness" and keeps the bot sounding human. |

---

## 2. Deep Dive: How Each Component Works

### A. Temperature (Creativity vs. Precision)
* **What it is technically:** In machine learning, temperature controls how the model chooses the next word. At 0.0, the model *always* picks the statistically most likely word (predictable, safe, boring). At 1.0, it considers less obvious word choices (surprising, expressive, colourful).
* **When to use 0.3 - 0.5:** For pure factual advice, wiring diagram explanations, or maintenance logging where precision matters.
* **When to use 0.7 - 0.75 (Recommended Default):** For authentic pub banter, conversational chat, and natural debate.
* **When to use 0.85 - 0.95:** For eccentric, sarcastic, or unhinged characters (like a fiery punk rocker or a cynical luthier having a bad day).

---

### B. Sample Lines (Few-Shot Anchors) — The Secret Weapon
Telling an AI *"speak with dry northern humor"* only works moderately well. Models are bad at abstract adjectives.

Instead, giving the AI **3 to 5 exact sample lines** works like magic. The model analyzes the grammar, vocabulary, sentence length, and attitude of those lines and mimics them perfectly.

* **Example for a Gruff Luthier (Hank):**
  > *"Look, wood is wood. Spend £50 on a fret polish and proper setup before you waste £300 on new pickups."*
* **Example for a High-Gain Shredder (McGee):**
  > *"Why drop three grand on a Gibson headstock when a £150 knockoff with a Seymour Duncan in the bridge plays circles around it?"*
* **Example for a Polished Studio Geek (Tim):**
  > *"If you can't get a usable tone out of a modern DSP profiler, the problem isn't the digital algorithm—it's your gain staging."*

**Tip for tuning:** If a bot doesn't sound right to you, don't change the description—**write two new sample lines in your own words** and paste them into `sample_lines`.

---

### C. Biases and Allegiances (Making it love Marshall or hate Fender)
AI models by default want to be balanced and diplomatic (e.g. *"Both Fender and Marshall make excellent amplifiers depending on your genre"*). That is terrible for enthusiast communities. Guitarists have strong, irrational opinions.

In the bot's dossier:
```json
"biases": {
  "favoured_gear": ["Marshall JCM800", "Soldano", "Bridge Humbuckers"],
  "hostile_concepts": ["Fender reissues with printed PCB boards", "Cheap solid-state fizz"],
  "stance_on_modelling": "Modellers have their place in the studio, but nothing replaces moving air on stage."
}
```
When a user asks: *"Should I buy a Fender Blues Junior or a Marshall Studio Classic?"*, the bot's prompt will explicitly instruct it to view the world through these loyalties. It will recommend the Marshall every time.

---

### D. The Disagreement Rate (No Sycophants)
Most chat assistants are "yes-men"—they agree with whatever the user says. Ryff prevents this with an automated disagreement engine.

Before the bot replies in chat, the app rolls a random number:
$$\text{roll} = \text{random}(0.0 \text{ to } 1.0)$$
If $\text{roll} < \text{disagreement\_rate}$, Ryff injects an invisible directive into that turn:
> *"Push back on the user's latest opinion if you genuinely disagree given your character's biases. Disagree honestly, with banter, in character. Never invent fake facts to win."*

* Set to `0.0` if you want a purely supportive companion.
* Set to `0.20` - `0.25` for a healthy sparring partner (agrees most of the time, calls you out occasionally).
* Set to `0.40` for an argumentative contrarian who loves a good debate.

---

### E. The "Irrational Hill to Die On"
Every regular at a guitar pub has one pet theory they refuse to back down on, regardless of evidence.
Examples:
- *"Nitrocellulose is the only finish that lets a guitar breathe; poly finishes suffocate tone."*
- *"Nobody in an audience can tell the difference between tonewoods through a high-gain pedal."*
- *"Modern strings go dead after 2 weeks; anyone playing on 6-month-old strings is deaf."*

Adding this to the bot dossier gives the bot a distinct personality hook. When the topic comes up in the news or chat, the bot immediately pounces on it.

---

## 3. How to Manually Edit a Bot

All bot configuration lives in readable JSON files under `data/bots/`:
- `data/bots/robbpaul.json` (Your companion bot)
- `data/bots/stevie.json` (Stevie)
- `data/bots/tim.json` (Tim)
- `data/bots/hank.json` (Hank)
- `data/bots/mcgee.json` (McGee)

### Step-by-Step Edit:
1. Open the JSON file in any text editor.
2. Edit the fields directly (e.g., change `favoured_gear`, add a quote to `sample_lines`, or change `disagreement_rate`).
3. Save the file.
4. Refresh the app or Backstage—the changes take effect immediately on the next message! No recompilation or database migration required.
