# Ryff Feature Log

## Feature: Napkin Ingester, Onboarding Import, Date Ambiguity Resolution & 1-Tap Undo (Step 6)
- **Date:** October 4, 2026
- **Category:** Command Layer / Onboarding Ingestion / Multi-Source Maintenance Import

### 1. User & Marketing Overview
- **Napkin Ingester (Zero-Friction Maintenance & Gear Import):** Musicians can copy and paste messy maintenance notes from Apple Notes, text receipts, or upload legacy spreadsheets (CSV/TSV) directly into Ryff. The AI extraction engine accurately separates gear names, service types, event dates, prices, and notes without requiring rigid formatting.
- **Instrument Resolution & Automatic New Gear Creation:** Mentions of existing instruments (e.g. *"PRS"*, *"Washburn"*, *"Katana"*) are automatically matched against the player's Rig. Unknown gear discovered in the notes is flagged as new items and seamlessly registered into their collection upon confirmation.
- **Date Ambiguity Resolution (No Silent Guessing):** When encountering ambiguous dates (such as `03/04/26` where day and month are both $\le 12$), Ryff detects the ambiguity and offers clear interactive selector buttons (e.g., choice between `2026-04-03` [UK format] and `2026-03-04` [US format]) rather than making silent assumptions that pollute log histories.
- **Review Screen with Confidence Breakdown:** An interactive candidate review modal (`NapkinIngesterModal`) presents extracted entries with confidence badges (High / Medium / Low), gear match previews, duplicate warnings, and inline editors for event type, date, price, and notes before anything is committed to the database.
- **Bulk Confirmation & 1-Tap Reversible Undo:** Users can select candidates individually or click "Confirm All High-Confidence". Once confirmed, a 1-tap Undo banner allows instant batch reversal—deleting created gear items and maintenance logs atomically if the user changes their mind.
- **Onboarding & Rig Room Integration:** Accessible right from the Rig Room navigation bar ("📥 Import Notes / CSV") or directly during first-time Onboarding ("Import notes or spreadsheet instead"), drastically lowering the barrier to transferring years of maintenance history into Ryff.
- **Downloadable Sample CSV Template:** Provides a one-click downloadable sample CSV (`/api/command/import/template`) demonstrating standard column headers (`Date,Instrument,Event Type,Notes,Price`) for hassle-free bulk migration.

---

### 2. Technical Details (For Developers)
- **Dual-Layer Extraction Engine ([`src/lib/command/ingest.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/ingest.ts)):**
  - `parseAndStageIngestNotes`: Handles pasted text, CSV, and TSV formats up to 20,000 characters and 200 rows.
  - LLM extraction via Google Gemini Flash (`env.MODEL_FAST || 'gemini-3.5-flash-lite'`) with strict JSON schema output and deterministic regex/CSV fallback parser when offline or without API keys.
  - **Prompt Injection Defense:** Notes text is strictly wrapped in `<untrusted_notes>` framing with system instructions to treat all contained text solely as passive log data.
  - **Date Normalization:** `normalizeIngestDate` parses ISO formats, slash dates (`DD/MM/YYYY`, `MM/DD/YYYY`), dot/dash formats, and relative expressions (`today`, `yesterday`, `N months ago`), detecting ambiguity when $D \le 12$ and $M \le 12$ and defaulting to UK preference while surfacing alternatives.
  - **Event Normalization:** `normalizeIngestEventType` maps natural vocabulary (`restrung`, `intonation set`, `frets polished`, `pots replaced`, `sold`) into canonical `rig_item_logs` event types (`strings`, `setup`, `fret_work`, `electronics`, `hardware`, `repair`, `purchase`, `note`).
- **Gear Resolution & Duplicate Detection:**
  - Compares candidate gear names against the user's `rig_items` via case-insensitive inclusion and regex token matching.
  - Checks existing `rig_item_logs` to flag duplicate events occurring on the same gear with identical event type and date.
  - Infers instrument category (`guitar`, `amp`, `pedal`, `accessory`) for newly detected items using brand keywords.
- **Batch Staging & Atomic Confirmation:**
  - Ingestion batches are staged in `assistant_actions` with `status = 'proposed'`, preventing premature database writes.
  - `confirmIngestBatch`: Atomically creates new `rig_items`, inserts `rig_item_logs` marked with `source = 'imported'`, updates `last_restrung_at` and triggers habit-based restring interval recalculation (`computeAndUpdateRestringInterval`), and records an atomic `undo_payload` containing all created item and log IDs.
  - `undoIngestBatch`: Reverses the batch by deleting all inserted items and logs atomically.
- **API Endpoints:**
  - `POST /api/command/import` ([`src/app/api/command/import/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/import/route.ts)): Accepts `multipart/form-data` file uploads or JSON raw text and returns staged candidate batches.
  - `POST /api/command/import/confirm` ([`src/app/api/command/import/confirm/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/import/confirm/route.ts)): Commits selected/all candidates and logs `import_confirmed` telemetry.
  - `POST /api/command/import/undo` ([`src/app/api/command/import/undo/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/import/undo/route.ts)): Atomically reverts the batch and logs `import_undone` telemetry.
  - `GET /api/command/import/template` ([`src/app/api/command/import/template/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/import/template/route.ts)): Serves downloadable sample CSV template.
- **Client Components ([`src/components/NapkinIngesterModal.tsx`](file:///c:/Users/rob_b/Ryff/src/components/NapkinIngesterModal.tsx)):**
  - Tabbed interface (Paste Notes vs CSV Upload), drag-and-drop file dropzone, stats bar (total, high/med confidence, duplicates, new gear), candidate cards with interactive date ambiguity resolution, inline editing, and 1-tap Undo banner.
- **Automated Test Suite ([`tests/napkin-ingest.test.ts`](file:///c:/Users/rob_b/Ryff/tests/napkin-ingest.test.ts)):**
  - 16 comprehensive unit and integration tests covering date ambiguity handling, event type normalization, pasted text / CSV parsing, existing gear matching vs new gear staging, duplicate detection, confirmation with `source = 'imported'`, 1-tap undo batch reversal, prompt injection neutralization, and API route execution.

---

### 3. White-Label & Domain-Agnostic Utility
- **Automotive & Fleet Service History Migration:** Seamlessly ingests past paper invoices, garage receipts, or Excel spreadsheets into digital vehicle passports, extracting service dates, mileage, part replacements, and service costs.
- **Horology & Luxury Watch Servicing Records:** Parses handwritten jeweler service cards, warranty papers, and auction receipts into verified digital maintenance passports.
- **Athletic Gear & Equipment Logs:** Imports legacy running logs, cycling service spreadsheets, or shoe mileage tracking sheets from Strava/Garmin exports into equipment lifespans.
- **Commercial Machinery & Tool Asset Management:** Enables industrial facilities to digitize decades of clipboard maintenance logs into structured maintenance schedules with zero manual data entry.

---


## Feature: Natural Language Preferences, Habit-Based Restring Learning, Multi-Action Refinement & 60-Case Eval Benchmark (Step 5)
- **Date:** October 4, 2026
- **Category:** Command Layer / User Preferences / Predictive Maintenance & Evaluation

### 1. User & Marketing Overview
- **Natural Language Preference Control (`set_preference`):** Users can adjust their app configuration simply by asking in the command bar (e.g. *"Set my Reverb region to UK"*, *"Switch persona to Vee"*, *"I prefer dry humor"*, *"I follow Fender and Gibson"*).
- **Human-in-the-Loop Confirmation with 1-Tap Undo:** Preference updates follow the same safe confirmation workflow with plain-language cards (e.g. *"Set Reverb Region to UK"* or *"Change Assistant Persona to Vee"*). A 1-tap Undo toast instantly restores the user's previous preference value if they change their mind.
- **Predictive Habit Learning for Restring Intervals:** The app learns how often you change strings based on real player habits. Once 3 or more string change logs exist for an instrument, Ryff automatically computes the median interval between restrings and updates the maintenance schedule.
- **Transparent Basis Display & Manual Override:** Both the Home "Needs attention" feed and individual Gear Passports display the learned interval basis (e.g. *"60d (default)"* vs *"45d (learned from 4 restrings)"*). Musicians can manually override the interval at any time via the Gear Passport interface.
- **Multi-Action Refinement & Fault-Tolerant Partial Success:** Batch command proposals are ordered sensibly and executed with per-proposal error isolation. If one action encounters an issue, companion actions still succeed seamlessly.
- **100% Benchmark Accuracy on 60 Test Cases:** Comprehensive test suite in `tests/command-eval.json` validating multi-turn natural language commands, ambiguity resolution, prompt injection defenses, regional want parsing, and habit calculations.

---

### 2. Technical Details (For Developers)
- **Database Architecture ([`db/migrations/0015_preferences_and_restring_intervals.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0015_preferences_and_restring_intervals.sql)):**
  - Added `personality` column (`'hank' | 'vee' | 'dry' | 'blunt' | 'chatty'`) to `users`.
  - Added `restring_interval_days` (integer) and `restring_interval_basis` (text) to `rig_items`.
- **Preference Tool Schema & Validation ([`src/lib/command/tools.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/tools.ts)):**
  - `ALLOWED_PREFERENCE_KEYS` allow-list (`reverbRegion`, `personality`, `followedBrands`, `favoritePlayers`).
  - Strict validation rejects unrecognized keys and normalizes enum values.
- **Habit Calculation Engine ([`src/lib/command/intervals.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/intervals.ts)):**
  - `computeAndUpdateRestringInterval`: Retrieves historical `rig_item_logs` (`event_type = 'strings'`), computes delta days between chronologically sorted events, calculates the median delta when $\ge 3$ events exist, and updates `restring_interval_days` and `restring_interval_basis` (`learned from N restrings`).
  - `overrideRestringInterval`: Allows manual override and marks basis as `manual override`.
  - `getGearRestringHealth`: Calculates gear health, days since last restringing, and overdue status.
- **Reversible Execution & Undo Engine ([`src/lib/command/executor.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/executor.ts)):**
  - Handles `set_preference` in `confirmAssistantAction`, records previous value in `undo_payload`, and reverts to previous value in `undoAssistantAction`.
  - Triggers `computeAndUpdateRestringInterval` when string maintenance is confirmed or undone.
- **Fault-Tolerant Batch Confirmation ([`src/app/api/command/confirm/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/confirm/route.ts)):**
  - Isolates proposal confirmations in individual try/catch blocks to support partial success and returns `{ ok, partialSuccess, confirmed, failed }`.
- **UI Surfacing ([`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx), [`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx), [`src/app/api/rig/[id]/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/[id]/route.ts)):**
  - Integrated into Home "Needs attention" feed and Gear Passport maintenance card with manual interval editor.
- **Benchmark Suite ([`tests/command-eval.json`](file:///c:/Users/rob_b/Ryff/tests/command-eval.json), [`tests/command-eval.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-eval.test.ts)):**
  - 60 evaluation test cases executing against LLM / fallback router, passing with 100% accuracy (60/60).
- **Integration Tests ([`tests/command-preferences-intervals.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-preferences-intervals.test.ts)):**
  - 10 comprehensive tests covering preference updates, undo, median interval calculations, and manual overrides.

---

### 3. White-Label & Domain-Agnostic Utility
- **Predictive Maintenance Across Asset Classes:** Restring interval habit learning directly maps to vehicle oil changes, tire rotations, aircraft inspections, or espresso machine descaling intervals based on actual operating frequency rather than static arbitrary calendars.
- **Adaptive Athletic Equipment Lifespans:** In a runner or cyclist app, tracking running shoe replacements (e.g. every 350-500 miles) or chain replacements adapts automatically as the user logs activities.
- **Natural Language User Settings & Onboarding:** Voice/chat preference updates with 1-tap Undo eliminate cumbersome settings navigation in any vertical (e.g. changing shipping region, notifications, language, or UI themes).

---

## Feature: Query Tools, App Help, Normalised Question Caching & Cost Control (Step 4)
- **Date:** October 4, 2026
- **Category:** Command Layer / Information Retrieval / Telemetry & Cost Control

### 1. User & Marketing Overview
- **Deterministic Instrument & Maintenance Queries:** Musicians can ask natural questions about their gear (e.g. *"When did I last change strings on the PRS?"* or *"What is the tuning on Blue Dream?"*) and receive instant, factual answers grounded directly in their historical database logs and spec records. The assistant never fabricates dates or maintenance events.
- **Trader Marketplace & Deals Status:** Ask *"Any deals on my wants?"* or *"Show active wants"* directly in the global command bar to receive an instant digest of current tracked items and live Reverb marketplace listings with price drops and days on market.
- **Grounded Application Help System (`explain_app`):** Instant, accurate guidance on how to use Ryff (e.g. *"How do I change my shipping region?"*, *"Who is Hank and how does he differ from Vee?"*, or *"Are serial numbers public?"*), answered strictly from the official, curated Ryff Help Guide (`src/lib/command/help.md`). If a question is not covered in the guide, the assistant politely redirects to Setup or Backstage rather than inventing nonexistent app mechanics.
- **Normalised Question Caching (Zero-Cost Instant Answers):** Frequently asked questions (e.g. variations of *"How do I change my region?"*) are automatically cached by normalised text hash, delivering instant answers with 0 network latency and $0.00 LLM token spend.
- **Transparent Daily Quotas & Cost Caps:** Protects users with a generous 50 requests/day allowance for structured queries and actions, paired with existing Backstage daily chat quotas, returning friendly in-character limit notices when daily thresholds are reached.
- **Admin Telemetry & Live Cost Tracking:** The Ryff Admin Command Centre (`/admin`) features a dedicated live telemetry table displaying daily assistant usage per user, request breakdowns (Actions, Queries, Help, Chat), and estimated USD spend.

---

### 2. Technical Details (For Developers)
- **Database Architecture ([`db/migrations/0014_assistant_cost_and_queries.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0014_assistant_cost_and_queries.sql)):**
  - Created `assistant_cost_logs` table tracking `user_id`, `intent` (`'action' | 'query' | 'app_help' | 'chat'`), `tool_name`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, and `created_at`.
  - Added indexes `idx_assistant_cost_logs_user_date` and `idx_assistant_cost_logs_created_at` for high-speed admin querying.
- **Cost Logger & Quota Engine ([`src/lib/command/cost-logger.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/cost-logger.ts)):**
  - `recordAssistantCost`: Records request tokens, model, and calculated USD cost to `assistant_cost_logs` and syncs with `usage_daily` table for platform aggregate spend tracking.
  - `checkAssistantQuota`: Enforces 50 requests/day for structured commands while delegating open chat to Backstage persona quotas in `src/lib/usage.ts`.
  - `getDailyAssistantCostsByUser`: Aggregates today's usage by user for the Admin dashboard.
- **Intent Classifier ([`src/lib/command/intent.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/intent.ts)):**
  - Rules-first classifier (`classifyIntent`) categorizing user inputs into `action | query | app_help | chat` with 0 latency and 0 LLM cost.
- **App Help & Caching Engine ([`src/lib/command/help.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/help.ts) & [`help.md`](file:///c:/Users/rob_b/Ryff/src/lib/command/help.md)):**
  - Static help document covering navigation, Rig Passport, Trader wants, shipping regions, serial privacy, Undo, Hank vs. Vee, and feedback.
  - In-memory `helpCache` (`Map<string, string>`) indexed by `normalizeHelpQuestion`.
  - Fast rule-based static matcher for instant 0-cost answers on known topics plus Gemini 2.5 Flash synthesis constrained strictly to `help.md`.
- **Query Tools ([`src/lib/command/query.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/query.ts)):**
  - `queryRig`: Deterministic lookup against `rig_items` and `rig_item_logs` (`event_type`, `event_date`, `description`, `title`, `created_at`), with gear name auto-extraction and strict ambiguity handling.
  - `queryDeals`: Deterministic lookup against `rig_items` (`kind = 'want'`) and `deals` table with calculated days on market.
- **Admin Dashboard Integration ([`src/app/admin/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/admin/page.tsx)):**
  - Added "⚡ Assistant Commands & Cost by User (Today)" table displaying live user counts, cohort badges, action/query/help/chat breakdowns, and USD spend.
- **Client UI Integration ([`src/components/CommandSheet.tsx`](file:///c:/Users/rob_b/Ryff/src/components/CommandSheet.tsx)):**
  - Read-only Answer Cards with custom iconography (📖 Help, 🎸 Rig, 🏷️ Deals, ⚡ Backstage), READ-ONLY status pills, formatted responses, and direct Backstage debate shortcuts.
- **Automated Test Suite ([`tests/command-query.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-query.test.ts)):**
  - 19 comprehensive tests validating intent classification, app help answering, normalized question caching, deterministic rig queries, deals queries, quota enforcement, cost telemetry, and router integration.

---

### 3. White-Label & Domain-Agnostic Utility
- **Automotive / Fleet Telemetry Queries:** *"When was the last oil change on Truck #2?"* or *"What tire pressure should the rear axle be set to?"* Deterministic database queries answer vehicle maintenance questions from real service records without LLM hallucination.
- **Luxury Goods & Horology Registry:** *"When was the Submariner last pressure tested?"* Answers watch servicing questions directly from verified digital passport logs.
- **Curated Knowledge Base Grounding (`explain_app`):** Static help documentation grounding ensures white-label customers in medical devices, industrial equipment, or compliance domains receive answers strictly from approved manuals and SOPs, with 0-hallucination guarantees and instant caching.
- **Predictable Commercial Cost Controls:** Multi-tier daily quotas, rules-first intent routing, and per-user cost analytics enable SaaS operators to maintain fixed, predictable LLM operational expenses across tens of thousands of active users.

---

## Feature: Confirmation Cards, Idempotent Execution, 1-Tap Undo & Assistant Activity History (Step 3)
- **Date:** October 4, 2026
- **Category:** Command Layer / Human-in-the-Loop UX / Transaction Safety & Auditability

### 1. User & Marketing Overview
- **Human-in-the-Loop Confirmation Cards:** Every assistant proposal is rendered as a plain-language card with clear details (e.g. *"Log: String change on PRS Custom 24, today"* or *"Add Want: Soldano SLO-100"*), giving users total control with **Save**, **Edit**, and **Skip** actions. Nothing is ever written to the user's permanent logs or wants without explicit confirmation.
- **Batch "Save All" Workflow:** When complex spoken commands yield multiple actions (e.g. restring + spring adjustment + new want), users can inspect and commit all actions simultaneously with a single 1-tap **Save All** button.
- **Inline Editing Mode:** If details need tweaking (such as adjusting the date, specific string gauge, notes, or maximum want budget), users can expand any proposal into an inline editor before saving, avoiding manual re-entry.
- **Instant 1-Tap Undo Toast:** Upon confirming any action, an Undo toast banner immediately floats into view, letting musicians instantly reverse the action with a single tap if they made a mistake.
- **Audit Trail & Activity History:** An Assistant Activity log in Setup tracks all historical commands with timestamps, tool badges, execution summaries, and persistent **Undo** buttons, making every assistant action fully transparent and reversible at any time.

---

### 2. Technical Details (For Developers)
- **Execution Engine ([`src/lib/command/executor.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/executor.ts)):**
  - `confirmAssistantAction`: Validates ownership, applies optional inline argument edits, inserts into `rig_item_logs` (with `source = 'assistant'`) or `rig_items` (with `kind = 'want'`), updates `rig_items.last_restrung_at` for string changes, generates reversible `undo_payload`, and updates `assistant_actions` status to `'confirmed'`.
  - **Strict Idempotency:** Double-submitting confirmation checks existing status and returns `{ alreadyConfirmed: true }` without duplicate database writes.
  - `undoAssistantAction`: Reads `undo_payload` (e.g. `created_log_id` or `created_item_id`), deletes the created rows from `rig_item_logs` or `rig_items`, restores previous gear state (such as `last_restrung_at`), and marks `assistant_actions` status as `'undone'`.
  - `skipAssistantAction`: Marks proposed action status as `'rejected'`.
  - `getAssistantActivity`: Fetches recent user action audit records with parsed JSON arguments and results.
- **API Endpoints:**
  - `POST /api/command/confirm` ([`src/app/api/command/confirm/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/confirm/route.ts)): Batch and single-action confirmation endpoint with inline argument edit support.
  - `POST /api/command/undo` ([`src/app/api/command/undo/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/undo/route.ts)): Reversal endpoint with strict user ownership validation.
  - `POST /api/command/skip` ([`src/app/api/command/skip/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/skip/route.ts)): Proposal dismissal endpoint.
  - `GET /api/command/activity` ([`src/app/api/command/activity/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/activity/route.ts)): History retrieval endpoint with limit clamping.
  - **Client UI Integration:**
  - [`src/components/CommandSheet.tsx`](file:///c:/Users/rob_b/Ryff/src/components/CommandSheet.tsx): Proposal cards with Save/Edit/Skip, Save All batch trigger, inline input forms, and floating Undo toast banner.
  - [`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx): Assistant Activity card with live activity list, status pills (`CONFIRMED`, `UNDONE`, `PROPOSED`), and 1-tap Undo buttons.
- **Automated Test Suite ([`tests/command-confirm.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-confirm.test.ts)):**
  - 9 comprehensive tests validating log insertion with `source = 'assistant'`, want creation, idempotent double-confirms, full state reversals via undo, batch confirmation API, activity feed, and cross-user authorization enforcement.

---

### 3. White-Label & Domain-Agnostic Utility
- **Automotive Fleet Maintenance:** Drivers log service notes (*"Changed oil and oil filter on Truck #4"*); the AI stages the proposals, and the shop manager or driver reviews and confirms them before the fleet maintenance records are committed. If an entry was made on the wrong vehicle, 1-tap Undo removes the log entry and restores the previous service odometer/date.
- **Luxury Goods & Watches:** Reviewing proposed movement servicing or watch purchases before committing to the digital registry, with complete reversal capabilities if a transaction is cancelled.
- **Medical / Regulated Asset Equipment:** Staged AI recommendations requiring human sign-off with permanent audit trails and reversible rollback for regulatory compliance.

---

## Feature: Tool-Calling Backend & Neutral Command Engine (Step 2)
- **Date:** October 4, 2026
- **Category:** Command Layer / AI Function Calling / Marketplace & Maintenance Routing

### 1. User & Marketing Overview
- **Natural Multi-Action Processing:** Musicians can speak or type complex, multi-event statements like *"Just put a new set of Elixir 9-42 on the PRS and adjusted the springs"*, and Ryff intelligently decomposes the input into separate, validated maintenance proposals (e.g. String change + Hardware/springs adjustment) mapped to the correct instrument.
- **Marketplace Want & Deal Tracking:** Spoken gear search desires (e.g. *"I'm after a Soldano SLO-100 in England but I don't want to pay over two grand"*) are translated into structured want requests with normalized marketplace geographic regions (`UK_ONLY`, `US_ONLY`, `WORLDWIDE`), maximum price ceilings (`2,000 GBP`), and active alert toggles.
- **Zero Guesswork / Explicit Ambiguity Disambiguation:** If a musician owns multiple instruments that match a colloquial reference (e.g. owning both an American Standard Strat and a Classic Vibe Strat and saying *"Restrung the Strat"*), Ryff **never guesses**. Instead, it presents an interactive instrument picker showing the exact candidate guitars and proposes zero writes until the user clarifies.
- **Active Passport Context Preference:** When the command sheet is invoked from an individual Gear Passport screen (`/rig/[id]`), Ryff automatically prioritizes that active instrument for generic references (*"this guitar"*, *"restrung it"*, etc.).
- **Safe Staged Proposals (Zero Premature Database Writes):** In Step 2, the assistant writes zero unconfirmed records to `rig_item_logs` or `rig_items`. Every parsed action is safely staged in the `assistant_actions` queue with `status = 'proposed'`, ready for user review and confirmation.

---

### 2. Technical Details (For Developers)
- **Gear Resolver ([`src/lib/command/resolve.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/resolve.ts)):**
  - Resolves colloquial names, models, nicknames, and brand aliases against the user's owned gear in `rig_items`.
  - Context-aware preference for `activeGearId`.
  - Deterministic ambiguity detection returning `{ status: 'ambiguous', candidates: [...] }` if multiple items match.
  - Guarantees numeric `id` normalization across postgres bigint serials.
- **Tool Schemas & Normalizers ([`src/lib/command/tools.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/tools.ts)):**
  - `logMaintenanceSchema`: Zod schema validating `gear_ref`, `event_type` (`strings`, `setup`, `fret_work`, `electronics`, `pickups`, `hardware`, `repair`, `valve_change`, `other`), `event_date` (`YYYY-MM-DD`), `notes`, `component`, and `original_part`. Tolerates nulls from LLM outputs.
  - `addWantSchema`: Zod schema validating `item_text`, `region`, positive `max_price`, default `currency` (`GBP`), and `alert` (default `true`).
  - `normalizeRegion`: Normalizes colloquial regions ("England", "UK", "Britain", "US", "Worldwide") into Reverb region enums, accommodating underscores, hyphens, and whitespace.
  - Clean formatting helpers: `formatCurrency` and `formatEventType`.
- **Command Router ([`src/lib/command/router.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/router.ts)):**
  - Neutral command persona prompt for Gemini 2.5 Flash (`temperature: 0.1`, `responseMimeType: 'application/json'`).
  - Multi-action array parsing returning structured `ProposedAction` lists.
  - Persists staged proposals to `assistant_actions` table with `status = 'proposed'` and UUID `batch_id`.
  - Built-in rule-based fallback parser for offline/test resilience.
- **API Route ([`src/app/api/command/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/route.ts)):**
  - Seamlessly routes text requests to `routeCommand` and returns `{ ok: true, status: 'proposed', proposals, ambiguous, unresolved }`.
- **Interactive Candidate UI ([`src/components/CommandSheet.tsx`](file:///c:/Users/rob_b/Ryff/src/components/CommandSheet.tsx)):**
  - Renders proposed maintenance and want cards with badges and formatted summaries.
  - Displays interactive candidate instrument buttons when an ambiguous gear reference occurs, allowing 1-tap user selection.
- **Automated Test Suite ([`tests/command-router.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-router.test.ts)):**
  - 12 comprehensive unit and integration tests covering schemas, region normalizers, unambiguous/ambiguous gear resolution, multi-action decomposing, marketplace want parsing, context disambiguation, and API endpoint integration.

---

### 3. White-Label & Domain-Agnostic Utility
- **Automotive / Fleet Maintenance:** Natural language command decomposing: *"Replaced front brake pads and rotated tires on the F-150, and I'm looking for a 2018 Tacoma TRD Pro under $35k in Texas."* Decomposes into vehicle maintenance log proposals and a marketplace vehicle search alert with price cap and geographic filtering. Ambiguous vehicle references (e.g. *"the truck"* when a fleet owner has 3 trucks) prompt candidate selection instead of corrupting service records.
- **Luxury Goods & Watches:** *"Changed battery and pressure tested the Seamaster, and looking for a Rolex Explorer II under 8k in the UK."* Automatically parses watch servicing actions and marketplace procurement alerts.
- **Athletic Equipment & Cycling:** *"Replaced chain and tuned rear derailleur on the gravel bike."* Multi-event maintenance logging with component attribution.

---

## Feature: Global Command Layer: Persistent Voice/Text Input & Transcription Engine (Step 1)
- **Date:** October 4, 2026
- **Category:** Command Layer / Voice Recognition / UX Architecture

### 1. User & Marketing Overview
- **Persistent Global Command Launcher ("Tell Ryff"):** A floating, high-utility command button (`⚡ Tell Ryff` or `⌘K`) accessible across every authenticated screen, giving musicians a 1-tap entry point to ask questions or record gear actions without leaving their current view.
- **Hands-Free Speech Transcription:** High-accuracy voice capture powered by Gemini 2.5 Flash audio transcription that understands musical instrument models, brands, pickups, string gauges, and colloquial gear terminology. Transcribed speech is presented in the command sheet for instant review or manual editing before sending.
- **Screen & Instrument Context Awareness:** When invoked from an individual Gear Passport (`/rig/[id]`), the command layer automatically attaches the active instrument context (`Target: Gear #ID`), making phrases like *"Changed strings yesterday"* or *"Swapped bridge pickup"* immediately resolvable.
- **Customizable Command Input Modes:** Users can customize command input preferences under Setup: `Text and voice` (default), `Text only`, or `Off`, adapting to quiet studio environments or mobile convenience.

---

### 2. Technical Details (For Developers)
- **Shared Audio Recording Hook ([`src/hooks/useAudioRecorder.ts`](file:///c:/Users/rob_b/Ryff/src/hooks/useAudioRecorder.ts)):**
  - Unifies browser `MediaRecorder` audio capture with automatic MIME type negotiation (`audio/webm;codecs=opus` $\rightarrow$ `audio/webm` $\rightarrow$ `audio/mp4`), 30-second duration cutoff, live timer, and Base64 encoding.
- **Audio Transcription Pipeline ([`src/lib/command/transcribe.ts`](file:///c:/Users/rob_b/Ryff/src/lib/command/transcribe.ts)):**
  - Direct integration with Google GenAI SDK (`@google/genai`) using Gemini 2.5 Flash (`inlineData: { mimeType, data: audioBase64 }`) with music and gear transcription system prompts.
- **Command Route & Rate Limiter ([`src/app/api/command/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/command/route.ts)):**
  - Authenticated `POST /api/command` endpoint handling both text and audio inputs with context resolution (`screen`, `gearId`, and gear entity lookup).
  - Enforces sliding-window rate limits (30 reqs/min per user) and payload constraints (max 1000 chars text, max ~30s base64 audio).
- **Command Sheet Component ([`src/components/CommandSheet.tsx`](file:///c:/Users/rob_b/Ryff/src/components/CommandSheet.tsx)):**
  - Sliding modal with glassmorphic backdrop, keyboard shortcuts (`Cmd+K`/`Ctrl+K`, `Escape`), active gear context pill, real-time audio listening status, and instant echo card feedback.
- **Setup Preference Integration:**
  - Extended [`src/lib/personalization.ts`](file:///c:/Users/rob_b/Ryff/src/lib/personalization.ts), [`src/app/api/preferences/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/preferences/route.ts), and [`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx) with `commandInputMode` (`'text_and_voice' | 'text_only' | 'off'`).
- **Automated Test Suite ([`tests/command-input.test.ts`](file:///c:/Users/rob_b/Ryff/tests/command-input.test.ts)):**
  - 5 comprehensive tests validating preference persistence, text echo with context, audio transcription handling, size limits, and empty payload rejection.

---

### 3. White-Label & Domain-Agnostic Utility
- **Omnipresent Voice/Text Command Bar for Any Domain:**
  - 🚗 **Vehicle & Fleet Management:** Floating *"Log Maintenance"* bar allowing drivers or mechanics to record tire rotations or oil changes hands-free by speaking: *"Rotated front tires and checked brake pads on the F-150."*
  - ⌚ **Luxury Goods / Watch Collectors:** Voice or quick text command to log accuracy tests or watch servicing: *"Regulated the Submariner to +2s/day."*
  - 🏃 **Athletic / Fitness Gear:** Quick logging of shoe mileage or equipment swaps: *"Ran 10k in the Pegasus 40s today."*

---

## Feature: Rig Passport Rebrand, Serial Visibility Control & Assistant Schema Groundwork (Step 0)
- **Date:** October 4, 2026
- **Category:** Rig Management / Identity & Trust / Command Layer Architecture

### 1. User & Marketing Overview
- **Rig Passport Rebrand:** Elevated Ryff's gear collection and maintenance surfaces from casual "Rig room" nomenclature to an authoritative **Rig Passport** across bottom navigation, home dashboard tiles, empty states, marketplace trader links, and onboarding journeys.
- **Passport History Timeline:** Re-anchored instrument maintenance, modifications, and servicing logs under **Passport history**, laying the groundwork for verifiable provenance records and prospective buyer verification.
- **Serial Number Privacy & Visibility Toggle:** Added an optional, privacy-focused serial number control to the Gear Passport screen with explanatory helper guidance (*"Optional. Used to identify this instrument. Hidden from others unless you choose to share it."*), accompanied by a "Show serial number on public passport" toggle and an indicator badge.

---

### 2. Technical Details (For Developers)
- **Database Migration ([`db/migrations/0013_passport_and_assistant.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0013_passport_and_assistant.sql)):**
  - Extended `rig_items` with `serial_visible boolean not null default false`, `alert boolean not null default true`, and `currency text default 'GBP'`.
  - Added `source text not null default 'live' check (source in ('live', 'voice', 'assistant', 'imported'))` to `rig_item_logs` and backfilled existing entries from `logged_via` (`'audio'` $\rightarrow$ `'voice'`, `'ai_import'` $\rightarrow$ `'imported'`, and others $\rightarrow$ `'live'`).
  - Expanded `rig_item_logs` `event_type` check constraint to seamlessly permit granular types (`strings`, `fret_work`, `electronics`, `pickups`, `hardware`, `other`) alongside legacy types (`string_change`, `valve_change`, `modification`, `maintenance`, `note`, `general`).
  - Created `assistant_actions` table for the upcoming Global Command Layer (supporting proposed, confirmed, rejected, and undone action states with `arguments`, `result`, and `undo_payload` JSONB storage).
  - Added `command_input_mode` to `users` table defaulting to `'text_and_voice'`.
- **API & UI Updates:**
  - Updated [`src/app/api/rig/[id]/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/[id]/route.ts) to permit updating `serial_visible`.
  - Updated [`src/app/api/rig/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/route.ts) to select `serial_visible` across `GET` and `POST` responses.
  - Updated [`src/app/(app)/AppNav.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/AppNav.tsx), [`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx), [`src/app/(app)/rig/RigRoomClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/RigRoomClient.tsx), [`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx), [`src/app/(app)/trader/TraderClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/trader/TraderClient.tsx), and [`src/app/welcome/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/welcome/page.tsx) to reflect Passport terminology.
  - Added integration test suite [`tests/passport-schema.test.ts`](file:///c:/Users/rob_b/Ryff/tests/passport-schema.test.ts) confirming database schema adherence.

---

### 3. White-Label & Domain-Agnostic Utility
- **Universal Digital Product Passports:** Shifting from "collection lists" to "Passports" provides a universal asset verification pattern applicable to any vertical where provenance, maintenance history, and serial number privacy matter:
  - 🚗 **Automotive / Classic Cars:** Vehicle Service Passport tracking maintenance intervals, modifications, and VIN visibility for private sales.
  - ⌚ **Luxury Watches:** Digital Watch Passport documenting movement servicing, polish history, and serial number verification.
  - 🚲 **Bicycles & Sports Equipment:** Cycling Passport tracking chain replacements, suspension overhauls, and frame serial registration for theft recovery and resale.

---

## Feature: Individual Instrument Profiles: Nicknames, Immersive Studio Themes, Granular Spec Sheets & Snapshot Versioning
- **Date:** October 4, 2026
- **Category:** UI / UX Excellence / Rig Management / Instrument Profiling

### 1. User & Marketing Overview
- **Prominent Instrument Nicknames:** Instruments can be given iconic, personal nicknames (e.g., *"Lucille"*, *"Old Black"*, *"Red Special"*) displayed with custom typography, brand/model subtitles, and instant inline editing.
- **Atmospheric Environmental Studio Backdrops:** Dynamic ambient room backdrops with soft radial vignette shading (`Guitar backdrop.png`, `drum room.png`, `Amp backdrop.png`, `Studio backdrop.png`, `Synthzone.png`, `DJbooth.png`, `Orchestra backdrop.png`) automatically load behind gear details according to the instrument's category or room assignment.
- **Category-Tailored Spec Sheets:**
  - **Guitars & Basses:** Interactive tuning selector with note breakdowns, string count selector (4, 5, 6, 7, 8, 12 strings), gauge presets, string manufacturer dropdown, and distinct Bridge, Middle, and Neck pickup assignments.
  - **Amplifiers & Pedals:** Multi-line knob/channel tone settings block and an intelligent Digital Preset Link detector that identifies Line 6 Helix, Neural DSP Quad Cortex, Kemper, ToneX, Axe-Fx, Strymon, Google Drive, Dropbox, and Mega with glowing branded badges and external links.
  - **Drums & Percussion:** Per-piece shell, head tension, and cymbal tracking.
- **Setup Snapshot Versioning:** Capture historical setup snapshots (tuning, strings, pickups, amp settings, notes) with a single tap, browsable in a clean snapshot history drawer with detailed modal inspection.
- **Quick Edit Gear Modal:** In-page modal allowing instant changes to Nickname, Brand, Model, Category, Serial Number, Year, Color, Purchase Price, and Purchase Date without page reloads.

---

### 2. Technical Details (For Developers)
- **UI Architecture Upgrades ([`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/%5Bid%5D/page.tsx)):**
  - Ambient room backdrop rendering with CSS mask-image radial vignette overlay and increased brightness/visibility (`opacity: 0.48`).
  - Integrated `getBackdropForCategory` and `detectSettingsProvider` from [`src/lib/gear-specs.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-specs.ts).
  - Compact Hero Photo box (`maxWidth: 360px`, centered) in [`src/components/GearHeroPhoto.tsx`](file:///c:/Users/rob_b/Ryff/src/components/GearHeroPhoto.tsx) with "Cycle Reverb Photo" removed to preserve user-uploaded pictures.
  - Equal prominence display for instrument nickname inside primary `h1` header (`<span>Brand Model</span> <span class="accent">“Nickname”</span>`), managed alongside gear attributes in the Edit Item settings modal.
  - Built interactive spec editor for string counts, tunings, gauges, brands, and multi-pickup assignments.
  - Built preset file badge detector with direct outbound URL linking.
  - Integrated `handleCreateSnapshot` appending new timestamped entries into the `snapshots` JSON array and saving via `PATCH /api/rig/[id]`.
  - Added `ItemSettingsModal` form for editing core equipment metadata.
  - Added `resolveStringSpecs` in [`src/lib/gear-specs.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-specs.ts) to eliminate hardcoded `'10-46'` fallbacks and cleanly extract brand and gauge from legacy combined string records (e.g. converting `"Elixir 9-42"` into brand: `"Elixir"` and gauge: `"009-042 (Super Light)"`).
  - Completely purged all hardcoded fallbacks and assumptions across the equipment spec sheet and snapshot modals (e.g. removed forced defaults like `'Standard'`, `'10-46'`, `'6 string'`, and `'Stock'`); unentered fields remain strictly blank rather than displaying misleading data.
  - Separated pedal/effects classification (`isPedal`) from tube amplifiers (`isAmp`) so pedals show "Pedal & Tone Settings" and "Last log entry" instead of "Last valve service".
  - Resolved `UNDEFINED_VALUE` database update error in [`src/app/api/rig/[id]/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/%5Bid%5D/route.ts) by utilizing `postgres.js` helper `db(updates)` without undefined values.
  - Verified full reactivity with AI voice memo logger and real-time state synchronization.
- **Validation:**
  - TypeScript typecheck passed cleanly with zero errors (`npm run typecheck`).
  - Vitest test suite passed with 62/62 passing tests (`npm run test`).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature implements an **Adaptive Item Profile, Thematic Ambient Backdrops & Configuration Snapshot Vault**.
- **Use Cases for Other Verticals:**
  - 👟 **Athletic Footwear:** Shoe nicknames (*"Marathon Racers"*), lace/insole spec sheets, running track/trail ambient backdrops, and race-day setup snapshots.
  - 🚗 **Performance Automotive:** Car nicknames (*"Project Track Car"*), suspension/ECU tune notes, dyno/tune link badges, garage backdrops, and race weekend configuration snapshots.
  - ⌚ **Luxury Timepieces:** Watch nicknames (*"The Explorer"*), strap/bracelet/bezel specs, workshop backdrops, and service overhaul snapshots.

---

## Feature: Rigistry Asset Migration & Comprehensive Gear Specification Constants Engine
- **Date:** October 4, 2026
- **Category:** Rig Management / Asset Pipeline / Specification Engine

### 1. User & Marketing Overview
- **Immersive Environmental Room Backdrops:** High-resolution studio and stage backdrops (`Guitar backdrop.png`, `drum room.png`, `Amp backdrop.png`, `Live backdrop.png`, `Studio backdrop.png`, `DJbooth.png`, `Synthzone.png`, `Orchestra backdrop.png`) provide rich visual context behind instrument detail views.
- **Category Artwork Fallbacks:** High-definition default brand and instrument category cards (`Bass gear brand default.png`, `Drum gear brand default.png`, `Effects brand default.jpg`, `Microphone default branding.jpg`, etc.) ensure visual polish even when custom photos haven't been uploaded.
- **Curated Multi-Genre Tunings & Gauges:** Out-of-the-box tuning presets for 6, 7, 8, and 12-string guitars and 4, 5, and 6-string basses (Standard, Drop D, DADGAD, Open tunings, Baritone, 8-string Meshuggah, Animals as Leaders) with note breakdowns and standard string gauge sets.
- **Digital Preset Provider Detector:** Intelligent URL parser automatically identifies links to external tone presets and cloud hosts (Line 6 Helix, Neural DSP Quad Cortex, Kemper Profiler, IK Multimedia ToneX, Fractal Axe-Fx, Strymon Nixie, Boss Tone Studio, GitHub Gists, Google Drive, Dropbox, Mega) and outputs branded badge badges.
- **Smart Restring Date Autocomplete:** Rapid shorthand input parser converting 4, 6, or 8-digit inputs (e.g. `151024` -> `15/10/2024`) with automatic century expansion and day/month inversion guards.
- **Natural Language Voice & Memo Spec Parser:** Spoken or written voice memos (e.g. *"Restrung on 1st October with Ernie Ball 10-46 and tuned to Drop D, call this guitar Lucille"*) automatically extract and update the exact schema fields (`tuning`, `string_gauge`, `string_manufacturer`, `last_restrung_at`, `nickname`, and pickups) in real-time.

---

### 2. Technical Details (For Developers)
- **Asset Pipeline Migration (`public/branding/`):**
  - Migrated 20+ studio environment backdrops, room graphics, and category default textures directly from Rigistry into `Ryff/public/branding/`.
  - Added `brand-defaults-by-kind.json` for Kind-to-Graphic mapping.
- **Specifications & Presets Module ([`src/lib/gear-specs.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-specs.ts)):**
  - Exported `GUITAR_TUNINGS`, `BASS_TUNINGS`, `GUITAR_STRING_GAUGES`, `BASS_STRING_GAUGES`, `STRING_MANUFACTURERS`, and `PICKUP_MANUFACTURERS`.
  - `detectSettingsProvider(url)`: Regex and hostname evaluator matching preset platforms with associated badge styling.
  - `getBackdropForCategory(category, room)`: Resolves ambient room backdrops based on classification hierarchy.
  - `getCategoryDefaultImage(category)`: Resolves default artwork for photo-less gear items.
  - `autocompleteDate(val)`: Normalizes shorthand user keystrokes into standardized `DD/MM/YYYY` format.
- **AI Voice & Text Parser Engine ([`src/lib/gear-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-parser.ts) & [`src/app/api/rig/[id]/log/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/%5Bid%5D/log/route.ts)):**
  - Extended Gemini system prompt to extract structured `tuning`, `string_gauge`, `string_manufacturer`, `number_of_strings`, `pickup_bridge`, `pickup_middle`, `pickup_neck`, and `nickname`.
  - Added rule-based fallback regex parsers for tunings, string brands, gauges, and nicknames.
  - Updated `/api/rig/[id]/log` POST handler to automatically persist extracted specs and tuning to the `rig_items` PostgreSQL table on voice or note logging.
- **Test Suite ([`tests/gear-specs.test.ts`](file:///c:/Users/rob_b/Ryff/tests/gear-specs.test.ts)):**
  - 15 unit tests validating preset detector accuracy across all supported gear cloud hosts, backdrop mapping, category fallbacks, date autocompletion, and specs coverage.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature represents a **Modular Specification Hierarchy, Asset Theme Provider & External Resource Detector**.
- **Use Cases for Other Verticals:**
  - 👟 **Athletic Footwear:** Preset catalogs of stack heights, heel-to-toe drops, pronation types, and terrain backdrops (track, trail, road, treadmill) with detection of Strava/Garmin workout links.
  - 🚗 **Motorsports & Garages:** Pre-configured engine displacement tiers, gearbox ratios, tire compounds, and track/garage backdrops with auto-detection of tuning logs (ECU flash links, Dyno sheets).
  - ☕ **Espresso & Coffee Gear:** Burr geometry presets, basket sizes, roast profile detectors, and roastery/café backdrops.

---

## Feature: Rig Item Profiles Database Architecture: Nicknames, Specifications, Presets & Snapshots
- **Date:** October 4, 2026
- **Category:** Rig Management / Database Architecture / Instrument Specifications

### 1. User & Marketing Overview
- **Instrument Nicknames:** Users can assign personalized nicknames to their instruments and gear (e.g., *"Old Black"*, *"Lucille"*, *"Red Special"*), creating an intimate, authentic connection with their cataloged equipment.
- **Granular Instrument & String Specifications:** Enables detailed tracking of instrument string count (4, 5, 6, 7, 8, 12 strings), specific tunings (Standard, Drop D, DADGAD, Open tunings, Baritone, 8-string Meshuggah), string gauge sets, and string manufacturer.
- **Pickups Breakdown:** Replaces vague single-summary fields with distinct Bridge, Middle, and Neck pickup assignments and manufacturers.
- **Amplifier Settings & Preset Link Integration:** Dedicated storage for amp settings text blocks and external digital preset file links (ToneLib, Neural DSP, Helix, Quad Cortex, Kemper, Fractal Axe-Fx, etc.).
- **Per-Piece Drum Kit & Cymbal Engine:** Complete structured schemas for drum pieces (snare, kick, toms, heads, tension, muffling) and cymbals (diameters, brands, models, replacement dates).
- **Historical Setup Snapshots:** Enables capturing and versioning complete setup snapshots over time, allowing musicians to preserve historic configurations for tours, album sessions, or vintage builds.

---

### 2. Technical Details (For Developers)
- **Database Migration ([`db/migrations/0012_rig_item_profiles_and_snapshots.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0012_rig_item_profiles_and_snapshots.sql)):**
  - Extended `rig_items` table with:
    - `number_of_strings` (`integer`)
    - `tuning` (`text`)
    - `string_gauge` (`text`)
    - `string_manufacturer` (`text`)
    - `pickup_bridge`, `pickup_middle`, `pickup_neck` (`text`)
    - `drum_head_details`, `drum_head_tension`, `drum_head_change_date` (`text`)
    - `drum_body`, `drum_mods_muffles` (`text`)
    - `drum_pieces` (`jsonb not null default '[]'::jsonb`)
    - `cymbal_pieces` (`jsonb not null default '[]'::jsonb`)
    - `snapshots` (`jsonb not null default '[]'::jsonb`)
  - Executed migration safely via `npm run migrate` (`tsx scripts/migrate.ts`).
- **REST API Endpoint Upgrades ([`src/app/api/rig/[id]/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/%5Bid%5D/route.ts)):**
  - Expanded `allowedFields` array to permit updates to `nickname`, `amp_settings`, `settings_file_url`, string specs, pickup fields, drum pieces, cymbal pieces, and historical snapshot arrays.
  - Implemented safe JSON serialization (`JSON.stringify()::jsonb`) and conditional parameter updating (`CASE WHEN ... THEN ... ELSE column END`) to allow setting, overriding, or clearing values.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature implements a **Hierarchical Component Specification & Historical Configuration Snapshot Engine**.
- **Use Cases for Other Verticals:**
  - 👟 **Athletics & Running Gear:** Track shoe nicknames (*"Race Day Alphaflys"*), specific lace types, insole orthotics, and historical mileage/condition snapshots for each marathon or season.
  - 🚗 **Vehicles & Motorsports:** Track car nicknames (*"Track Beast"*), engine/ECU tuning maps, suspension setup, tire compounds, and service/mod snapshots per race weekend.
  - ⌚ **Horology & Luxury Watches:** Catalog watch nicknames (*"The Explorer"*), bracelet link counts, bezel inserts, caliber regulation timing, and service history snapshots.
  - 🚲 **Cycling & Bike Builds:** Group component specs by wheelset, cassette ratios, tire widths, tubeless sealant change dates, and race-day setup snapshots.

---

## Feature: Multi-Tier Gear Photo Pipeline & Drag-and-Drop Image Uploader
- **Date:** October 3, 2026
- **Category:** Rig Management / Asset Pipeline / UI Excellence

### 1. User & Marketing Overview
- **Zero-Effort Gear Imagery (Reverb Stock Photos & Logos):** Adding gear to your Rig or Wants list automatically retrieves crisp, accurate stock photos from Reverb marketplace listings without requiring manual photo search. If exact models are rare, it gracefully falls back to verified manufacturer logos or curated instrument category artwork.
- **Smart Model Synonym Normalization & Broadening:** Intelligently handles colloquial model names (e.g., *"5150mk2 modded"* automatically matches the *Peavey 5150* amp family, and *"tubescreamer"* maps to *Ibanez Tube Screamer*), preventing obscure search failures.
- **Strict Accessory Disqualification Guard:** Disqualifies parts, pickups, covers, cables, and packaging from instrument/amp searches (e.g. searching for an obscure *Charvel CX692* or *Marshall DSL50* will never show a standalone pickup or dust cover; it falls back to the brand logo or guitar artwork instead).
- **Drag-and-Drop 4:3 Gear Photo Uploads:** Users can customize any owned instrument by dragging and dropping photos directly from their desktop or tapping the hero zone on mobile. Images are processed and stored securely via Cloudinary's global media CDN with zero database storage overhead.
- **Instant Multi-View Sync & Flash-Free Visuals:** Grid thumbnails in `/rig` sync immediately with uploaded custom photos upon navigation with zero flash or layout shift.

---

### 2. Technical Details (For Developers)
- **Gear Image Utility ([`src/lib/gear-images.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-images.ts)):**
  - Multi-tier query cascading: Exact model -> Synonyms & noise-stripped core model (`cleanCoreQuery`, `normalizeSynonyms`) -> Brand + Category -> Brand logo CDN -> Local category artwork (`/images/`).
  - Strict disqualification engine (`DISQUALIFIED_ACCESSORIES_REGEX`) filters out covers, pickups, cases, knobs, tubes, and cables.
- **Stock Image API ([`src/app/api/stock-image/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/stock-image/route.ts)):**
  - GET endpoint querying Reverb with category scoring, query cascading, pagination & `pickIndex` selection.
- **Interactive Hero & Drag-and-Drop Component ([`src/components/GearHeroPhoto.tsx`](file:///c:/Users/rob_b/Ryff/src/components/GearHeroPhoto.tsx)):**
  - Native HTML5 Drag & Drop (`onDragOver`, `onDragLeave`, `onDrop`) and click-to-upload file picker.
  - Direct unsigned POST requests to Cloudinary (`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`) using `unsigned-rigistry` preset.
  - Persists resulting CDN URL directly to PostgreSQL via `PATCH /api/rig/[id]` (`image_url`) and triggers `router.refresh()`.
- **Thumbnail Component ([`src/components/GearThumbnail.tsx`](file:///c:/Users/rob_b/Ryff/src/components/GearThumbnail.tsx)):**
  - Responsive 4:3 thumbnail component with smooth skeleton shimmer and fade-in transitions.
  - Includes SSR hydration and cached image completion detection (`imgRef.current.complete`) to prevent preloaded custom images from remaining invisible (`opacity: 0`).
- **Rig State Synchronization ([`src/app/(app)/rig/RigRoomClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/%28app%29/rig/RigRoomClient.tsx)) & API ([`src/app/api/rig/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/route.ts)):**
  - Added window focus listener and prop sync effect to ensure custom uploaded photos on `/rig/[id]` immediately appear on `/rig` grid cards.
  - Ensured `image_url` is consistently selected in both `GET` and `POST /api/rig` endpoints.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature represents a **Universal Domain-Agnostic Asset Fallback & Direct Media Uploader Pipeline**.
- **Use Cases for Other Verticals:**
  - 👟 **Sneakers / Running Gear:** Automatically pull stock images of shoes by brand and model from retail APIs (StockX/Amazon), with drag-and-drop user uploads for worn condition photos.
  - 🚗 **Vehicle & Garage Logs:** Auto-fetch manufacturer vehicle stock photos and brand badges by make/model, while allowing owners to drag-and-drop pictures of their specific builds and modifications.
  - ⌚ **Luxury Goods & Watches:** Instant stock photo matching for reference numbers and brands, paired with zero-storage high-res macro upload hosting.

---

## Feature: Verified Feed Health Diagnostics & Canonical YouTube Channel Resolution
- **Date:** October 3, 2026
- **Category:** Ingestion Pipeline / Feed Health / Admin Intelligence

### 1. User & Marketing Overview
- **Canonical YouTube Channel Resolution:** Automated auditing and auto-healing of YouTube RSS feed sources, ensuring all monitored creator channels (e.g. Rick Beato, Spectre Sound Studios, JHS Pedals, The Trogly's Guitar Show, 60 Cycle Hum, Guitar World) resolve to their true canonical channel IDs (`UC...`) so video updates are reliably ingested without HTTP 404 or 500 errors.
- **De-Duplicated Feed Diagnostics:** The Ryff Admin Command Centre feed health dashboard now filters strictly by active feed sources, eliminating ghost/duplicate historical rows (such as old inactive channel URL iterations) so administrators have a crisp, accurate view of current feed health.

---

### 2. Technical Details (For Developers)
- **Config & Channel Verification ([`config/sources.json`](file:///c:/Users/rob_b/Ryff/config/sources.json)):**
  - Audited all YouTube sources against YouTube's public handle pages to extract canonical `channelId` meta tags.
  - Updated `channel_id` for Rick Beato (`UCcp-HjtmTMeIJ-0RrSHSGLA`), Spectre Sound Studios (`UCfWdGyZaZODBPQc9Lu0y6aw`), The Trogly's Guitar Show (`UCix8J4YIPRpu7i29k7sgirw`), JHS Pedals (`UCTN1OwPMtjgH3hQAxvF-l2Q`), 60 Cycle Hum (`UCKS5rKlMVed10QeByfHLF1g`), and Guitar World YT (`UCaP1TKiIr83uqMV5LwrOY3g`).
- **Source Seeding & Deactivation ([`scripts/seed-sources.ts`](file:///c:/Users/rob_b/Ryff/scripts/seed-sources.ts)):**
  - Executed `seed-sources.ts` to insert updated URLs and deactivate stale/duplicate historical feed records in the PostgreSQL `sources` table.
- **Admin Command Centre Filtering ([`src/app/admin/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/admin/page.tsx)):**
  - Updated SQL query in `getAdminData()` to include `WHERE active = true`, ensuring deactivated or old duplicate sources are not rendered in the admin dashboard table.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides an **Automated Source Health Audit & Handle-to-RSS Resolver Engine**.
- **Use Cases for Other Verticals:**
  - 🎥 **Video & Creator Intelligence:** Automatically resolve social media handles across YouTube, Twitch, and Rumble to their canonical RSS/API stream endpoints for tracking creator announcements in any niche (automotive, tech, fitness).
  - 🛠️ **System Health Dashboards:** Clean separation of active vs. historical inactive source records in admin telemetry views.

---


## Feature: Marketplace Days-on-Market Tracking, Price Drop History & Regional Geo-Filtering
- **Date:** October 2, 2026
- **Category:** Marketplace Intelligence / Wants Matching / Personalization

### 1. User & Marketing Overview
Ryff now automatically monitors used marketplace listings (e.g. Reverb) with enhanced intelligence:
- **True Days on Market:** Know exactly how long an item has sat unsold on the marketplace (e.g., *"142 days on Reverb"*), so you can negotiate with confidence or gauge demand for obscure gear.
- **Price Drop & Discount Badges:** Highlights price drops directly on deal cards and chat recommendations (e.g., *“£850 · was £950”*), so you never miss a bargain.
- **Custom Search Region & Geo-Filtering:** Set your global buying region preference (e.g., **UK Only**, **Ships to UK**, **US Only**, or **Worldwide**). Ryff filters out gear outside your shipping zone so you only see items you can actually buy.

---

### 2. Technical Details (For Developers)
- **Reverb API Enhancements ([`src/lib/reverb.ts`](file:///c:/Users/rob_b/Ryff/src/lib/reverb.ts)):**
  - Updated `ReverbListing` interface and `parseReverbResponse` to extract `published_at` / `created_at`, `original_price`, `ribbon` price drops, and calculate `daysOnMarket = Math.floor((now - published_at) / 86400000)`.
  - Added `itemRegion` (`&item_region=`) and `shipsTo` (`&ships_to=`) query parameter support to `searchListings()`.
- **Database Schema ([`db/migrations/0009_reverb_location_and_history.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0009_reverb_location_and_history.sql)):**
  - Table `deals`: Added `published_at` (timestamptz), `original_price_amount` (numeric), `price_drop_text` (text), and `first_seen_at` (timestamptz).
  - Table `users`: Added `reverb_region` (text enum: `'UK_ONLY'`, `'SHIPS_TO_UK'`, `'US_ONLY'`, `'WORLDWIDE'`).
- **Pipeline & Retrieval ([`src/pipeline/deals.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/deals.ts) & [`src/lib/retrieval.ts`](file:///c:/Users/rob_b/Ryff/src/lib/retrieval.ts)):**
  - `runDealsPipeline` queries distinct want items joined with user `reverb_region` preferences and passes region constraints to Reverb search calls.
  - Upserts `published_at`, `original_price_amount`, and `price_drop_text` into `deals` table on conflict.
- **Sanitisation & Link Formatting ([`src/lib/guard.ts`](file:///c:/Users/rob_b/Ryff/src/lib/guard.ts)):**
  - Updated `[[deal:ID]]` token transformer to output formatted price drop and Days-on-Market badges into Markdown links.
- **Preferences API ([`src/app/api/preferences/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/preferences/route.ts) & [`src/lib/personalization.ts`](file:///c:/Users/rob_b/Ryff/src/lib/personalization.ts)):**
  - Extended user preferences schema and endpoints to read and update `reverbRegion`.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides a general-purpose **Third-Party Marketplace Ingestion & Listing Longevity Tracker**.
- **Use Cases for Other Verticals:**
  - 🚗 **Automotive / Used Vehicles:** Track how long a specific car model has sat on AutoTrader/eBay Motors, log price drop history, and limit matches to a specific postal radius or country.
  - 👟 **Sneakers & Collectibles:** Monitor resale platforms (StockX, GOAT) for rare sneakers or watch listings, logging time-on-market and localized shipping capability.
  - 💻 **Consumer Electronics & Appliances:** Monitor refurbished laptops, cameras, or audio gear on Amazon/eBay with localized country filters and automated bargain detection when prices drop.
  - 🏠 **Real Estate / Rentals:** Track property listings for time on market, price history reductions, and geographic filter preference.

---

## Feature: UX Restructure, SongDeck Minimalist Design System & Voice-Enabled Rig Management
- **Date:** October 2, 2026
- **Category:** UX Architecture / SongDeck Design System / Information Architecture / Audio Logging

### 1. User & Marketing Overview
Ryff has been completely restructured into an uncluttered, high-contrast, mobile-first web application following the **SongDeck Design System**:
- **Pure Minimalist Aesthetic:** Deep black canvas (`#000`), subtle cards (`#121212`), hairline dividers (`#242424`), and high-impact SongDeck green (`#22c55e`) for active states and CTAs, paired with geometric typography (Montserrat / Lemon Milk).
- **Persistent 5-Tab Navigation:** Unbroken app shell featuring **Home**, **Digest**, **Backstage**, **Trader**, and **Rig room**, with frosted glass backdrop blur.
- **Home Morning Briefing:** Displays real background pipeline activity (*"Checked 47 sources · 81 new stories · 3 about your gear"*), Hank's takeaway card, overdue string alerts (*"Needs attention"*), and 4 quick Explore tiles.
- **Dedicated Digest Screen:** Elevated "Today's Gear Radar" to its own dedicated view with topic clustering, 16:9 thumbnails, `Matches: <gear>` tags, and bot editorial takes.
- **1-on-1 Backstage Bot Arena:** Direct 1-v-1 conversational interface toggling between **Hank** (vintage luthier) and **Vee** (modern modeller), with daily quota tracking and sticky debate bar.
- **Trader Deals Hub:** Dedicated used gear marketplace matching user's tracked wants to Reverb listings with price-drop indicators and days-on-market metrics.
- **3-Segment Rig Room & Quick-Mic Voice Logging:** Segments for **Gear**, **Log**, and **Wants**. Includes a 1-tap `🎙️` microphone button for instant 15-second voice memos that automatically parse gear additions, maintenance, setups, and parts swaps into the spec sheet.
- **Gear Detail Screen:** 4:3 hero photo, live string age health status, multimodal voice memo logger, hardware spec breakdown, and maintenance history timeline.
- **Setup & Account Hub:** Customizes bot personality (Dry / Blunt / Chatty), followed brands/players, active feed sources, Reverb shipping region, and clean account management.

---

### 2. Technical Details (For Developers)
- **Token Design Architecture ([`src/app/tokens.css`](file:///c:/Users/rob_b/Ryff/src/app/tokens.css) & [`src/app/ryff.css`](file:///c:/Users/rob_b/Ryff/src/app/ryff.css)):**
  - Standardized CSS custom properties (`--bg`, `--sf`, `--ln`, `--tx`, `--mu`, `--ac`, `--ac2`, `--r`, `--font-display`, `--font-body`).
  - Full-screen responsive viewport layout (`#stage` / `#app`) eliminating artificial desktop mobile containers and centering content in an uncluttered `max-width: 760px` reading column.
  - Pinned frosted glass navigation ([`src/app/(app)/AppNav.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/AppNav.tsx)) utilizing Next.js App Router route detection (`usePathname`).
- **Next.js App Router Structure:**
  - Layout: [`src/app/(app)/layout.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/layout.tsx) providing persistent navigation across all consumer routes.
  - Home: [`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx) server component aggregating parallel database metrics (`sources`, `items`, `episodes`, `rig_items`, `deals`).
  - Digest: [`src/app/(app)/digest/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/page.tsx) & [`DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx) with client-side category and rig-affinity filtering.
  - Backstage: [`src/app/(app)/backstage/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/backstage/page.tsx) interactive 1-v-1 chat interface connected to `/api/chat`.
  - Trader: [`src/app/(app)/trader/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/trader/page.tsx) connecting tracked wants to Reverb `deals` table with days-on-market calculations.
  - Rig Room: [`src/app/(app)/rig/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/page.tsx) & [`RigRoomClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/RigRoomClient.tsx) with multi-segment state and quick-mic audio capture.
  - Item Detail: [`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx) multimodal audio recording (`MediaRecorder` -> base64 -> Gemini Flash) with instant spec sheet updates.
  - Setup: [`src/app/(app)/setup/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/page.tsx) & [`SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx) syncing with `/api/preferences`.
- **API Enhancements ([`src/app/api/rig/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/route.ts)):**
  - Updated `GET /api/rig` to join `rig_item_logs` with `rig_items`, returning complete rig history in a single round-trip.
- **Documentation:**
  - Created [`AUDIT.md`](file:///c:/Users/rob_b/Ryff/AUDIT.md), [`PLAN.md`](file:///c:/Users/rob_b/Ryff/PLAN.md), [`GAPS.md`](file:///c:/Users/rob_b/Ryff/GAPS.md), and [`HERO_PLAN.md`](file:///c:/Users/rob_b/Ryff/HERO_PLAN.md).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides a complete **Vertical AI Assistant & Inventory Maintenance Shell**.
- **Use Cases for Other Verticals:**
  - 🏎️ **Classic Cars & Motorsport:** Garage inventory tracking (mileage, oil changes, tire wear, mods), morning industry racing/parts digest, AI mechanic bot debates, and classified deal monitoring.
  - ⌚ **Luxury Watches & Horology:** Collection tracking (service dates, accuracy testing, strap changes), auction news feed, bot debate on vintage vs. independent watchmakers, and marketplace price drop monitoring.
  - 🚴 **Bicycles & Cycling Gear:** Bike fleet management (chain wear, tubeless sealant top-up, component upgrades), cycling news radar, and used component tracker.

---

## Feature: Public Marketing Landing Page (`/welcome`) & Value Proposition Showcase
- **Date:** October 2, 2026
- **Category:** Marketing & Conversion / Public Landing Page / SongDeck Brand Positioning

### 1. User & Marketing Overview
Ryff now includes a dedicated public-facing marketing landing page at [`/welcome`](http://localhost:3000/welcome) designed to convert visitors in under 10 seconds:
- **Hero Narrative:** Led by the high-impact headline *"YOUR RIG. YOUR NEWS. A BOT WITH AN OPINION."* and positioning copy explaining how Ryff ingests 40+ premier guitar feeds and filters them to owned/wanted gear.
- **Background Pipeline Made Visible:** Live interactive card showcasing the automated pipeline in action (*"Checked 47 sources · 81 new stories · 3 about your gear"*) paired with Hank's daily editorial takeaway.
- **3-Step "How It Works" Breakdown:**
  1. *Log Your Rig in 2 Taps:* Voice memo maintenance logging (`🎙️`), string age alerts, and spec sheets.
  2. *Smart Radar Reads the World:* Topic clustering and `<span class="why">Matches: [Your Gear]</span>` tags across 40+ feeds.
  3. *Hank & Vee Clash in Backstage:* 1-on-1 bot debates on tone, tube vs. digital hype, and gear value.
- **Marketplace Intelligence Highlight:** Dedicated showcase for Reverb days-on-market tracking, price-drop alerts, and geo-filtered shipping.
- **Clear Conversion Paths:** Primary calls to action (*"Get Started Free"*, *"Browse Today's Radar"*, *"Sign In"*).

---

### 2. Technical Details (For Developers)
- **Static Route Implementation ([`src/app/welcome/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/welcome/page.tsx)):**
  - Fully static prerendered page (`○ /welcome`) with zero server round-trip latency.
  - Sticky glass header with `backdrop-filter: blur(16px)` and SongDeck logo.
  - Token-driven layout using `--font-display`, `--ac`, `--ac2`, `--sf`, and `--ln`.
  - Linked seamlessly to the in-app footer and login flows.
- **Integration:**
  - Added "About Ryff" navigation link in the in-app Home footer ([`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx)).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** General-purpose **High-Converting Landing Page Architecture** for any vertical AI assistant.
- **Use Cases for Other Verticals:**
  - 🏎️ **Automotive / Performance Cars:** Landing page featuring live track telemetry ingest, garage maintenance logs, and classic car auction tracking.
  - ⌚ **Luxury Watches:** Collection maintenance timeline, auction house news clustering, and grey-market price drop alerts.
  - 🏡 **Real Estate / Rentals:** Automated neighborhood market scanner, renovation log tracking, and property value negotiation bot.

---

## Feature: Dedicated Setup UI for Favorite Artists & Followed Brands Tracking
- **Date:** October 3, 2026
- **Category:** News Personalization / Entity Tracking / Preference Management

### 1. User & Marketing Overview
Users can now easily manage and edit their favorite musicians, guitarists, and brands directly within the **Setup Hub** (`/setup`) and view active tracking badges on the **Digest** screen:
- **Favorite Artists & Guitarists Input:** Dedicated card in Setup allowing users to type and add any artist/player (e.g. *Chris Impellitteri*, *Nita Strauss*, *Slash*) or remove existing ones with 1-tap `✕` chips.
- **Custom Brands & Topics Manager:** Flexible topic manager combining preset popular brands (*Marshall*, *Fender*, *Gibson*, etc.) with a custom text entry for niche builders or technologies (*Soldano*, *KSR*, *Modelling*).
- **Digest Active Tracking Banner:** Real-time indicator bar on the **Digest** screen ("For Your Rig & Tastes") displaying all currently tracked artists and followed brands with a direct link to edit them in Setup (`⚙`).

---

### 2. Technical Details (For Developers)
- **Setup Component ([`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx)):**
  - Integrated `favoritePlayers` state alongside `followedBrands` and initialized from `initialPreferences`.
  - Created text input controls with `onKeyDown` Enter listeners for instant addition.
  - Updated `syncPreferences()` to send both `favoritePlayers` and `followedBrands` arrays to `/api/preferences`.
- **Digest Integration ([`src/app/(app)/digest/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/page.tsx) & [`DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx)):**
  - Added parallel `getUserPreferences(userId)` call to `DigestPage` and passed `initialPreferences` down to `DigestFeed`.
  - Added sticky "Tracking: <Artists> <#Brands>" banner to the personalized Digest view.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Generic **Entity Interest & Keyword Subscription Engine**.
- **Use Cases for Other Verticals:**
  - 🏎️ **Automotive:** Track specific race drivers, car designers (e.g., Gordon Murray, Adrian Newey), or niche tuner brands in the news feed.
  - ⌚ **Luxury Watches:** Track independent watchmakers (e.g., Philippe Dufour, F.P. Journe) or specific complications (e.g., Tourbillon, Perpetual Calendar).
  - 🏃 **Athletics & Running:** Track specific marathon runners, shoe technologies (e.g., Pebax foam, Carbon plates), or brand lines.

---

## Feature: Reverb Marketplace Watchlist & Saved Deals System
- **Date:** October 3, 2026
- **Category:** Marketplace Intelligence / User Personalization / Saved Items

### 1. User & Marketing Overview
Users can now bookmark, track, and manage their favorite used gear listings in a dedicated **Watchlist (`★`)** on the **Trader** hub:
- **Interactive Star Toggling:** Save or un-save any deal listing with 1 tap (`★` / `☆`) directly from deal cards.
- **Trader Tabbed View:** Seamlessly toggle between **Live Deals** and **Saved Watchlist** tab to monitor price drops and listing availability.
- **Listing Thumbnail Previews:** Enhanced visual cards featuring listing photos (`image_url`), price, condition, original price drop badges, and days on market.
- **Persistent User State:** Watchlist state persists across sessions and syncs across devices.

---

### 2. Technical Details (For Developers)
- **Database Schema ([`db/migrations/0011_deals_image_and_watchlist.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0011_deals_image_and_watchlist.sql)):**
  - Added `image_url` text column to `deals` table.
  - Created `watchlist` table with `id` (bigserial primary key), `user_id` (uuid references users), `deal_id` (bigint references deals), `listing_id` (text not null), `created_at` (timestamptz), and unique constraint `(user_id, listing_id)`.
- **API Endpoint ([`src/app/api/watchlist/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/watchlist/route.ts)):**
  - `GET /api/watchlist`: Returns array of `watchlistListingIds` for the authenticated user session.
  - `POST /api/watchlist`: Toggles item inclusion in `watchlist` (adds if absent, removes if present) with optimistic client state support.
- **Reverb Parser ([`src/lib/reverb.ts`](file:///c:/Users/rob_b/Ryff/src/lib/reverb.ts)):**
  - Updated `ReverbListing` schema and `parseReverbResponse` to extract listing thumbnail images (`photos[0]._links.thumbnail.href`).
- **Trader Hub UI ([`src/app/(app)/trader/TraderClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/trader/TraderClient.tsx)):**
  - Added tab bar state (`'all'` vs `'watchlist'`), visual listing cards with fallback badges, and interactive star toggle button.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** General-purpose **Saved Listings & Inventory Watchlist Module**.
- **Use Cases for Other Verticals:**
  - ⌚ **Luxury Watches:** Track targeted listings across Chrono24 / eBay with price drop notifications.
  - 🏎️ **Classic Cars:** Bookmark target auctions on Bring a Trailer or AutoTrader and track price reductions.
  - 👟 **Footwear & Collectibles:** Save target shoe listings on StockX or GOAT and monitor price changes over time.

---

## Feature: Universal Sub-Page Back Navigation & Sticky Header System
- **Date:** October 3, 2026
- **Category:** Navigation Architecture / UX Depth / Mobile-First UX

### 1. User & Marketing Overview
Ryff's navigation depth has been enhanced with a universal top navigation bar featuring explicit back buttons (`← Back`) across detail views and setup screens:
- **Intuitive Touch Target Back Navigation:** Users can effortlessly return to parent views (e.g. back to Rig Room from a specific gear detail sheet, or back to Home from Setup) without relying on browser navigation buttons.
- **Sticky Glass Backdrop Header:** Low-contrast hairline border with frosted glass blur, preserving screen real estate while remaining accessible at all scroll positions.

---

### 2. Technical Details (For Developers)
- **UI Header Integration ([`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx), [`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx)):**
  - Implemented client header bar utilizing Next.js `useRouter().back()` with fallback fallback navigation paths (`/rig` or `/`).
  - Added CSS classes `.back-btn` with high touch padding (12px 16px) and SongDeck token styling (`--sf`, `--ln`, `--tx`).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Mobile-First **Nested Route Navigation Template**.
- **Use Cases for Other Verticals:** Any multi-level vertical mobile application requiring clean drill-down state preservation (e.g., viewing shoe wear metrics -> fleet list, viewing politician statement -> timeline).

---

## Feature: Rigistry Gear Catalog Auto-Matching Engine & Canonical Brand Aliasing
- **Date:** October 3, 2026
- **Category:** Data Normalization / Catalog Alignment / Multimodal Auto-Categorization

### 1. User & Marketing Overview
Ryff's gear catalog matching engine now automatically resolves brand nicknames, typos, and common aliases into canonical database records:
- **Intelligent Brand Alias Resolution:** Commands like *"Added a Soldano SLO100 head"* or *"Tubescreamer pedal"* automatically resolve to canonical brand records (*Soldano Custom Amplification*, *Ibanez*) and proper category classification (`amplifiers-effects`).
- **Seamless Voice & Text Logging:** Users can speak naturally into the quick-mic logger without needing exact catalog spelling.

---

### 2. Technical Details (For Developers)
- **Database Schema ([`db/migrations/0010_rigistry_enhancements.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0010_rigistry_enhancements.sql)):**
  - Updated `brands` and `brand_aliases` tables to include canonical aliases (`soldano`, `charvel`, `tubescreamer`) and default category mappings (`amplifiers-effects`).
- **Parsing Engine ([`src/lib/rigistry-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/rigistry-parser.ts) & [`src/lib/gear-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-parser.ts)):**
  - Implemented normalized fuzzy string comparison against catalog records (`rigistry_items`), brand alias lookup, and automated extraction of specs, year, and model from unstructured voice/text logs.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Domain-agnostic **Catalog Brand Alias & Taxonomy Resolution Engine**.
- **Use Cases for Other Verticals:**
  - 👟 **Footwear:** Automatically match voice logs like *"Added Hoka Clifton 9s"* or *"Brooks Ghost"* to canonical shoe brand catalogs.
  - 🏎️ **Automotive:** Resolve tuner aliases (e.g. *"AMG"*, *"M Division"*, *"Porsche 911GT3"*) to canonical vehicle registries.

---

# White-Label Product Strategy & Domain-Agnostic Architectural Blueprint

This section details the overarching strategic and technical blueprint for re-issuing the Ryff architecture across alternative domains and commercial verticals. The platform is architected around **Three White-Label Product Angles**:

---

## Angle 1: Pre-Built Version (Turnkey Scoped Vertical Deployment)

### 1. Concept & Commercial Model
The **Pre-Built Version** is a done-for-you, turnkey vertical application deployment. Following a client scoping call, the Ryff engineering team replaces domain-specific data sources, marketplace APIs, news feeds, RSS channels, entity keywords, and AI persona profiles with the client's requested vertical domain (e.g. Runners/Running Shoes, Luxury Horology, Classic Automotive, Cycling Fleet).

Once configured, the platform runs 100% identically to Ryff's core engine: executing background RSS ingestion, vector/LLM clustering, persona debates, marketplace deal tracking, and asset logging out of the box.

### 2. Domain Data Source Mapping Table

| Domain / Vertical | Core Data Swap (RSS / Feeds) | Marketplace Ingest API | Asset Logger Focus | AI Personas (Backstage) |
| :--- | :--- | :--- | :--- | :--- |
| **Guitars (Current)** | Premier Guitar, Guitar World, RSS, YouTube | Reverb API | Guitars, Amps, Pedals, Strings | **Hank** (Vintage Luthier) vs **Vee** (Digital Modeller) |
| **Running & Footwear** | Runner’s World, Strava blog, Trail Runner RSS, YouTube | StockX, GOAT, eBay Footwear API | Running Shoes, Mileage, Foam Wear, Price | **Doc** (Podiatrist/Biomechanics) vs **Swift** (Ultra-Marathoner) |
| **Luxury Horology** | Hodinkee, Fratello Watches, Revolution, YouTube | Chrono24, eBay Watches API | Watch Collection, Service History, Timekeeping | **Horace** (Master Watchmaker) vs **Julian** (Independent Collector) |
| **Motorsport & Track Cars** | PistonHeads, Speedhunters, Motorsport RSS, YouTube | AutoTrader, Bring a Trailer API | Garage Vehicles, Track Days, Oil/Tire Wear | **Mac** (Wrench Mechanic) vs **Apex** (Telemetry Engineer) |
| **Specialty Coffee** | James Hoffmann RSS, Perfect Daily Grind, Barista Hustle | Coffee Shrub, Prima Coffee API | Grinders, Machines, Water Recipes, Beans | **Barista Ben** (Traditional Espresso) vs **Science Sam** (Extraction Specialist) |

### 3. Technical Implementation
- **Domain Config Blueprint (`config/domain.config.ts`):** Single declarative configuration file defining feed URLs, marketplace search parameters, brand catalog schemas, and persona system prompts.
- **Pluggable API Adapters (`src/lib/marketplace/adapter.ts`):** Interface for third-party marketplace search, standardizing results into `{ title, price, original_price, days_on_market, image_url, location, url }`.

---

## Angle 2: Builder Version (Self-Serve N8n-Style Dynamic Pipeline & Custom Automation Engine)

### 1. Concept & Commercial Model
The **Builder Version** is a self-serve visual pipeline generator (similar to N8n, Zapier, or Make). Instead of hardcoding vertical sources, end-users input their own tracking variables, RSS feed URLs, social targets, and entity monitor lists via an intuitive UI. 

Our backend automates the orchestration: dynamically spinning up RSS pollers, diyGod / RSSHub bridges, web scrapers, Hansard parliamentary monitors, and Gemini Flash LLM extraction pipelines without requiring manual code changes.

### 2. Primary Example: Political & PR Intelligence ("Restore Britain & MPs")
- **User Input Variables:**
  - **Entities to Monitor:** *Restore Britain*, *Politician X*, *Politician Y*, *Policy Z*.
  - **Data Feeds & Sources:** Hansard Parliamentary Transcripts, BBC News RSS, Guardian Politics RSS, diyGod Twitter/X & Bluesky bridges, YouTube political debate transcripts.
  - **Extraction Schema:** `[Date, Speaker Name, Party/Affiliation, Topic, Direct Quote, Sentiment, Policy Impact]`.
- **Automated Backend Orchestration:**
  1. **Dynamic Poller:** Cron daemon regularly polls registered RSS/API endpoints.
  2. **LLM Extraction Pipeline:** Feeds incoming text to Gemini Flash with user-defined JSON schema to extract quotes, dates, and sentiment.
  3. **Vector Embeddings & Clustering:** Stores quotes in PostgreSQL vector table (`pgvector`), grouping related statements into daily digest clusters.
  4. **Searchable Dataset & Alert Engine:** Enables users to query *"What did Politician X state about energy policy in Q3 2026?"* and pushes daily digest summary alerts.

### 3. Technical Architecture Blueprint
- **Dynamic Source Registry (`sources` table):** Stores user-defined feeds with custom extraction rules, headers, and refresh frequencies.
- **Zero-Code Schema Transformer (`src/lib/builder/transformer.ts`):** Uses structured LLM outputs to transform raw feed items into custom user-defined entity tables.
- **N8n-Style Webhook & Worker Pool:** Asynchronous background worker fleet processing ingested items in real time.

---

## Angle 3: Lightweight Asset-Logger / Maintenance / Spec Tool (Standalone or Embedded Micro-App)

### 1. Concept & Commercial Model
A decoupled, lightweight asset and event logging micro-app that operates either as a standalone tool or embedded within parent application wrappers. It provides structured asset tracking, maintenance alerts, wear calculations, and event logging across two primary sub-types:

---

### Variant 3.i: Footwear & Hard Goods Wear/Usage Logger (Quantitative Tracking)
Designed for physical assets subject to physical wear, usage accumulation, and periodic maintenance.

#### Key Metrics & Features:
- **Asset Profile:** Name, brand, model, acquisition date, initial purchase price (£/$).
- **Usage Telemetry:** Total distance logged (miles/km), total hours in service, usage frequency.
- **Cost-per-Use Analytics:** Real-time calculation of cost-per-mile (`Purchase Price / Total Miles Logged`) to quantify asset value over time.
- **Wear Degradation & Maintenance Alerts:** Automated alerts based on cumulative usage thresholds:
  - *Example (Footwear):* *"Shoe Foam Alert: Hoka Clifton 9 has reached 385 / 400 miles. Midsole cushioning degradation expected."*
  - *Example (Cycling):* *"Chain Wear Alert: 250 km logged since last chain lubrication."*
- **1-Tap Quick-Mic Voice Logger:** Speak voice memos (e.g. *"Ran 8 miles in the Clifton 9s on wet trail"*), parsed automatically by Gemini Flash to increment mileage and record terrain/wear notes.

---

### Variant 3.ii: Definable Structured Event & Statement Logger (Qualitative & Fact-Checking Dataset)
Designed for qualitative event logging, political statement tracking, public record archiving, and quote indexing.

#### Key Metrics & Features:
- **Definable Event Data Schema:** Captures structured records of *"Entity X said/acted Y on Z date"*.
- **Database Fields:**
  - `entity_name`: Name of politician, public figure, or brand.
  - `event_date`: Date statement was made or action occurred.
  - `verbatim_statement`: Full quote or action transcript.
  - `topic_category`: Categorized policy topic or topic tag.
  - `source_url`: Verifiable reference link (Hansard, video transcript, news article).
  - `searchable_vector`: Embeddings for semantic natural language queries.
- **Searchable Query Interface:** Allows users to query complex historical datasets (e.g. *"Show all quotes by Politician X regarding taxation between 2024 and 2026"*).

---

### 2. White-Label Embedding Options
- **Standalone Micro-App:** Lightweight PWA / Web App focused exclusively on asset logging and maintenance.
- **Embedded iFrame / Component Wrapper:** React / Web Component embeddable inside partner platforms, mobile apps, or enterprise dashboards.

---

## Feature: OpenGraph Article Scraper & Automated Feed Image Parsing Engine
- **Date:** October 3, 2026
- **Category:** Content Ingestion / Feed Processing / Media Parsing / Image Extraction

### 1. User & Marketing Overview
Ryff's Digest feed and Gear Radar now display crisp, high-resolution feature photos for over 95% of all news stories and YouTube videos:
- **Zero Blank Cards & Minimal Fallbacks:** Solved the issue where ~60% of RSS articles (from outlets like Ultimate Guitar, The Highway Star, Guitar.com, and niche blogs) lacked inline images in XML feeds and defaulted to generic category place-holders.
- **Automated OpenGraph Page Scraping:** When an RSS feed snippet doesn't contain an explicit image, Ryff automatically fetches the target article's Open Graph metadata (`og:image`, `twitter:image`, `image_src`) directly from the publisher's website.
- **YouTube Media & Shorts Compatibility:** Automatically parses YouTube `<media:group>` tags, Shorts URLs, and embed links to fetch 100% accurate video thumbnails (`hqdefault.jpg`).
- **Database Image Recovery:** Restored high-res hero photographs across existing database history, elevating overall digest image coverage from 34% to over 95%.

---

### 2. Technical Details (For Developers)
- **Enhanced Feed & Media Parser ([`src/lib/feeds.ts`](file:///c:/Users/rob_b/Ryff/src/lib/feeds.ts)):**
  - Updated `rss-parser` custom field definitions to capture `<media:group>` tags (YouTube feed format) and Atom image enclosures.
  - Enhanced `extractImageUrl(item)` regex to extract video IDs from any YouTube watch link, Shorts URL, embed, or `yt:video` ID.
  - Implemented `fetchOgImage(url)` with a fast 4-second timeout, extracting `<meta property="og:image">`, `og:image:url`, `twitter:image`, `twitter:image:src`, and `<link rel="image_src">`.
- **Pipeline Ingestion Integration ([`src/pipeline/ingest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/ingest.ts)):**
  - Integrated `fetchOgImage` fallback into `fetchFeed()` so any incoming RSS item lacking XML image tags is enriched with its target webpage's OpenGraph image prior to DB insert.
- **Database Image Backfill Script ([`scripts/backfill-item-images.ts`](file:///c:/Users/rob_b/Ryff/scripts/backfill-item-images.ts)):**
  - Created and executed a parallel batch backfill script processing missing `image_url` fields for 800+ existing DB items.
- **Client Feed Image Component ([`src/app/(app)/digest/DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx)):**
  - Added `useEffect` state synchronization to the `FeedImage` client component to ensure image states update cleanly during tab switches and category filtering.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** High-Res Media Extraction & OpenGraph Web Scraping Pipeline.
- **Use Cases for Other Verticals:**
  - 🚗 **Automotive News & Classifieds:** Automatically extract cover photos for vehicle reviews and listings where RSS feeds provide text-only excerpts.
  - 👟 **Sneaker & Apparel Drops:** Scrape official product release hero photos from brand blogs and forums.
  - 🏠 **Real Estate / PropTech:** Retrieve high-res listing photos and architectural hero images from property blogs and auction feeds.

