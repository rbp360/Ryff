# Ryff Application Help Guide

This static guide documents the official functionality and features of Ryff. The assistant only answers questions covered in this document.

---

## What is Ryff?
Ryff is an intelligent, high-contrast guitar gear companion designed for musicians, collectors, and luthiers. It continuously monitors 40+ premier guitar and music gear news feeds, classifies industry discussions, tracks used gear marketplace listings on Reverb, maintains your digital Rig Passport with maintenance history, and provides 1-on-1 sparring debates with two opinionated bot personalities (Hank and Vee).

---

## Rig Passport & Gear Management
- **What is the Rig Passport?**
  The Rig Passport is your digital gear collection registry. It records every instrument, amplifier, pedal, and accessory you own or want, along with technical specs (tuning, string gauge, pickups, amplifier tone settings), photos, and a complete chronological maintenance timeline.
- **How do I add gear to my Rig Passport?**
  1. Go to **Rig Passport** from the bottom navigation.
  2. In the **Gear** tab, tap **+ Add Gear**.
  3. Enter the brand and model, or speak into the command bar ("Added a 1982 Fender Stratocaster").
- **How do serial numbers and privacy work?**
  Serial numbers are optional and private by default. They are never shown to prospective buyers or public passport viewers unless you explicitly toggle **Show serial number on public passport** in the gear settings modal.
- **How do I log maintenance or string changes?**
  - Tap the **⚡ Tell Ryff** button (or press `⌘K` / `Ctrl+K`) and say or type: *"Put Elixir 9-42s on the PRS and adjusted the springs"*.
  - Alternatively, navigate to the instrument in **Rig Passport** and tap the **🎙️ Quick Mic** button to record a 15-second audio memo.
  - Review the proposed action card and tap **Save** to commit it to the Passport history.

---

## Marketplace, Wants & Deals (Trader)
- **What is Trader?**
  Trader is Ryff's used gear radar. It scans the Reverb marketplace and matches listings against items on your Wants list.
- **How do I add an item to my Wants list?**
  - Go to **Trader** and tap **+ Add Want**, or tell the assistant: *"I'm looking for a Soldano SLO-100 in the UK under £2,000"*.
  - You can set a maximum price ceiling and choose whether to enable alerts.
- **How do I change my marketplace shipping region?**
  1. Open **Setup** (from Home or bottom navigation).
  2. Locate the **Marketplace & Shipping Region** card.
  3. Choose from **UK Only**, **Ships to UK**, **US Only**, or **Worldwide**.
  4. Changes take effect immediately across all Trader searches and deal alerts.
- **What are Days on Market and Price Drop badges?**
  Trader calculates how long a listing has remained unsold (e.g., *"142 days on Reverb"*) and highlights recent seller price reductions (e.g., *"£850 · was £950"*) so you can negotiate effectively.
- **How does the Watchlist work?**
  Tap the star icon (`★`) on any deal card to save it to your Watchlist. You can toggle between **Live Deals** and **Saved Watchlist** at the top of the Trader screen.

---

## Bot Personalities: Hank vs. Vee
- **Who is Hank?**
  Hank is a seasoned, old-school analog luthier and tube amplifier purist. He believes tone comes from hands, tubes, transformers, and seasoned wood. He is deeply cynical about digital modeling and algorithmic hype.
- **Who is Vee?**
  Vee is a modern digital tone architect and DSP enthusiast. She loves quad-core profilers (Neural DSP Quad Cortex, Line 6 Helix, Kemper), impulse responses, active pickups, and digital precision.
- **How do I spar with them?**
  Navigate to **Backstage** from the navigation bar. You can toggle between Hank and Vee to ask gear questions, debate gear choices, or evaluate prospective purchases.
- **How do I adjust bot personality or tone?**
  In **Setup**, under **Bot Personality & Cadence**, you can configure the conversation style: **Hank**, **Vee**, **Dry**, **Blunt**, or **Chatty**.

---

## News Radar & Feed Personalization (Digest)
- **What is the Digest?**
  The Digest aggregates news and videos from 40+ guitar feeds, clustering stories into trending topics with summaries, editorial bot takeaways, and `<span class="why">Matches: [Your Gear]</span>` tags.
- **How do I follow favorite artists or brands?**
  1. Go to **Setup**.
  2. Under **Favorite Artists & Followed Brands**, type an artist name (e.g. *Slash*, *Nita Strauss*) or brand (*Marshall*, *Fender*) and press Enter.
  3. Your personalized Digest will prioritize stories matching your tracked artists and brands.

---

## Global Command Bar & Assistant
- **What can I do in the command bar?**
  The **⚡ Tell Ryff** launcher (shortcut: `⌘K` or `Ctrl+K`) lets you speak or type natural commands:
  - **Log maintenance:** *"Restrung the Strat today with D'Addario 10s"*
  - **Add a want:** *"Looking for a Strymon Flint under £220 in the UK"*
  - **Ask about your rig:** *"When did I last change strings on the PRS?"* or *"What is the tuning on my Gibson?"*
  - **Check deals:** *"Any deals on my wants?"*
  - **Ask app questions:** *"How do I change my shipping region?"*
- **How does confirmation and Undo work?**
  - Ryff **never** modifies your logs or wants without your explicit confirmation. Every proposal is presented as a card with **Save**, **Edit**, and **Skip**.
  - Once saved, an instant **Undo** toast appears.
  - You can also undo any confirmed action at any time by going to **Setup > Assistant Activity** and tapping **Undo**.
- **How do I configure command input mode?**
  In **Setup**, under **Global Command Input**, select **Text and voice** (default), **Text only**, or **Off**.

---

## Quotas, Budgets & Limits
- **Backstage Chat Quotas:**
  To maintain high performance and control LLM costs, Backstage chats are capped per day (10 messages for cadre members, 3 for public users).
- **Command Layer Quota:**
  The command bar has a generous daily allowance of 50 actions and queries per day.
- **Rate Limiting:**
  A sliding-window limit of 30 requests per minute protects against accidental rapid spam.

---

## Feedback & Support
- **How do I submit feedback or report an issue?**
  Go to **Setup**, scroll down to **Feedback & Survey**, select a category (Bug, Feature request, Gear question), write your message, and tap Submit.
