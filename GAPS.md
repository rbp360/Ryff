# GAPS.md — RYFF UX Restructure Gaps & Deviations

This file tracks data and UI elements described in the Claude brief and reference designs that do not currently have direct backend schema or require intentional adaptation.

1. **Bot Personality Tone (Dry / Blunt / Chatty)**
   - *Brief:* Setup screen allows selecting bot debate tone.
   - *Status:* Table `users` does not have a `bot_tone` column.
   - *Adaptation:* Persisted in browser `localStorage` and sent as client context; gracefully defaults to 'dry'.

2. **Per-User Source Toggles (Guitar news / Forums / Used deals / YouTube reviews)**
   - *Brief:* Setup allows toggling news categories/sources.
   - *Status:* `sources` are system-wide in database; user-level preferences track `followed_brands` and `favorite_players`.
   - *Adaptation:* Persisted locally or mapped to preference categories; gracefully degrades.

3. **Trader Alert Budget Cap & Notification Time**
   - *Brief:* Setup displays Trader alerts "Budget cap £300" and "Notify me Daily 7:00".
   - *Status:* User wants in `rig_items` have per-item `budget_gbp`; global notification schedule is system-driven (cron).
   - *Adaptation:* Displays aggregate want budget or client-side setting; no fake push notifications.

4. **Dedicated Episode Takeaway Field**
   - *Brief:* Home takeaway card displays Hank's one-line takeaway for the day.
   - *Status:* `episodes` table stores `topics` JSON with `disagreement` and Hank/Vee quotes; items have `key_takeaways`.
   - *Adaptation:* Home screen extracts Hank's key statement from Episode Topic #1 or the latest high-hype item takeaway.
