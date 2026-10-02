# RYFF: UX restructure brief

Read this file first. Then read `HANDOFF.md`. Look at `reference.html` in a browser only if you can; otherwise read `tokens.css` and `ryff.css`.

## 1. Working rules (important)

Your context window is small. Work in small steps.

- Do **one phase at a time** (section 6). Finish it, then stop and report in 5 lines or fewer. Wait for me to say "next".
- Never read the whole repo. Use `grep` / file listings to find what you need, then open only those files. Do not open files over ~300 lines in full; read the part you need.
- Edit **one screen or one component per step**. Never rewrite many files in one go.
- Keep `PROGRESS.md` in the repo root: phase, what is done, what is next, files touched. Update it at the end of every phase. If you error or lose context, resume from it.
- Commit after each phase with a clear message.
- Do not change backend, data models or business logic unless a phase says so. If a UI element needs data that does not exist, **do not invent it**. Add it to `GAPS.md` (one line each) and design the UI so it degrades gracefully.
- Do not add dependencies without asking.

## 2. What RYFF is

RYFF is a guitar assistant in the SongDeck family. It does two things that have grown together:

1. **Gear repository.** The user logs their rig (guitars, amps, pedals) and a wants list. They can also keep notes and maintenance per item, for example "strings changed 3 July".
2. **News with a bot over it.** RYFF ingests guitar news and discussion from several sources, filters it using the user's gear and tastes, and gives it to the user. A configurable bot (Hank) adds its opinion. Hank then debates a different player's bot (Vee) in "Backstage" and the user gets a short takeaway: another viewpoint.

The rig is what ties the two together: **the gear informs the news, and the bot sits over everything.**

The current app works but the UI is cluttered and unclear. Users cannot easily see their feeds. Important background activity is invisible. The two halves (repository and news) do not feel like one product.

## 3. The UX goal

A first-time user should understand within 10 seconds: *"This reads the guitar world for me, knows my gear, and gives me a second opinion."*

Design principles:

- **One idea per screen.** Minimal. No clutter.
- **Make the pipeline visible:** Sources → Digest → Hank's take → Backstage debate → Takeaway.
- **Explain personalisation.** Every story shows why the user sees it (a small tag such as "Matches: Marshall DSL50").
- **Show what is happening in the background** in plain language, not logs.
- **Two-tap logging.** Noting maintenance should be as fast as sending a message.

## 4. Information architecture

`reference.html` now contains every screen described below (Home with activity strip, Digest with why-tags, Rig room Gear/Log/Wants, Item detail, Add-entry form). Copy its structure and class names. Sample numbers and names are placeholders; bind real data.

Keep the five bottom-nav tabs from `HANDOFF.md`: **Home, Digest, Backstage, Trader, Rig room.** Setup sits behind the gear icon on Home.

**Home** (the "what's going on" screen), top to bottom:
1. Activity strip (background made visible): e.g. "Checked 14 sources · 12 new stories · 3 about your gear · Backstage debate ready". Use real values only. If a value is not available, hide that part.
2. Today's takeaway card.
3. "Needs attention": gear items due something (for example strings last changed over N weeks ago). Hide the section if the data does not exist.
4. The four mode tiles.

**Digest** (clearly the feed): story cards with image slot, source and time, headline, Hank's one-line take, and a "why you're seeing this" tag. A small header line shows when it last updated and how many sources.

**Backstage:** the debate thread, the takeaway card, and a reply box (see `HANDOFF.md`).

**Trader:** used-gear matches for the wants list. No filters.

**Rig room** has three segments at the top (a segmented control, not a scrolling list): **Gear | Log | Wants**
- *Gear:* two-column photo grid. Tapping an item opens **Item detail**.
- *Item detail:* photo, name, type; "Last string change: 3 Jul (12 weeks ago)"; quick-log buttons (String change, Clean, Setup, Note); a timeline of that item's log entries; "In the news" showing stories that mention this item.
- *Log:* one chronological list of all maintenance and notes across the rig, with an "Add entry" button (pick item, pick type, optional note, defaults to today).
- *Wants:* wants grid with dashed borders (as in the reference).
- Keep the bottom input for "add gear or ask a question" on the Gear segment only.

**Setup:** personality, interests, sources, alerts (as in the reference). Also show the user which sources are on, so the "ingest from several sources" idea is visible.

## 5. Hero / landing page: PLAN ONLY, do not build

Write `HERO_PLAN.md` (a plan, not code). It must say clearly, in the first screen, what RYFF does. Draft copy and a wireframe in text for:
- Headline and sub-line. Starting suggestion: *"Your gear. Your news. A bot with an opinion."* Improve it if you can.
- A 3-step "how it works": (1) Log your rig. (2) RYFF reads the guitar world and filters it to your gear. (3) Hank gives his take, then argues it out with another bot so you get a second view.
- A second, smaller line for the gear log: keep notes and maintenance on every piece.
- Sections order, primary and secondary calls to action, and which in-app screens to show as images.
Style to match `tokens.css` and the SongDeck branding (black, green, blue, uppercase heavy headings).

## 6. Phases

Do them in order. Stop after each.

0. **Audit (read-only).** List screens/routes, components, data models, and where the old styles live. Write `AUDIT.md` (60 lines max). Change no code.
1. **Plan.** Write `PLAN.md`: each phase below mapped to the real files. Flag risks and `GAPS.md` items. Wait for approval.
2. **Foundation.** Add `tokens.css` and `ryff.css`. Build the app shell and bottom nav. Make existing screens render inside it, even if unstyled inside.
3. **Home.** Activity strip, takeaway, needs-attention, mode tiles.
4. **Digest.** Cards, "why you're seeing this", last-updated line.
5. **Backstage.** Thread, takeaway, reply box.
6. **Trader.**
7. **Rig room, part 1.** Segmented control, Gear grid, Wants.
8. **Rig room, part 2.** Item detail and the maintenance/notes log, including quick-log and the Log segment.
9. **Setup.**
10. **Clean-up.** Remove dead old styles, check accessibility (labels, contrast, alt text), check small screens, update `PROGRESS.md`.
11. **Hero plan.** Write `HERO_PLAN.md` (section 5).

## 7. Definition of done for each phase

- It matches the look in `reference.html` and uses only `tokens.css` values.
- No horizontal scrolling lists. No emoji or decorative graphics.
- Image slots use the `.ph` placeholder boxes at the sizes in `HANDOFF.md`.
- Existing functionality still works. Say what you tested.
- `PROGRESS.md` updated and committed.

Start with Phase 0 now.
