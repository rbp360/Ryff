# RYFF UI handoff

RYFF is a guitar AI assistant in the SongDeck family. This package is a **visual re-skin brief**. Keep the existing app logic, data and routing. Replace the look and the markup structure of the screens to match the reference.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | Colours, radius, fonts. Edit values here only. |
| `ryff.css` | All component styles. Loads after `tokens.css`. |
| `reference.html` | Open in a browser. Click through every screen. **This is the source of truth for look and markup.** The markup lives in the JS template strings (`SC.home`, `SC.digest`, etc.). |

## How to apply

1. Open `reference.html` in a browser and click through all screens.
2. Add `tokens.css` and `ryff.css` to the project and load them in that order.
3. Rebuild each existing screen's markup to match the reference class names and structure. Bind the app's real data in place of the sample content.
4. Remove the old styles (rounded gradient boxes, decorative guitar/emoji graphics). Do not mix them with the new CSS.
5. Do not add new colours, shadows, gradients or emoji. Use the tokens.

## Design rules

- Black background, SongDeck green (`--ac`) for primary action and active state, blue (`--ac2`) for links and highlights.
- Minimal and uncluttered. One idea per card. Uppercase heavy headings (`h1`), small uppercase section labels (`h2`).
- Modest radius only (`--r`). No glassy or "bubbly" effects.
- Mobile-first. The phone frame in `#app` is for desktop preview only. In the real app the layout fills the screen (see the `max-width:430px` rule).
- Font: Lemon Milk for `--font-display` once the files are supplied. Montserrat is the stand-in.

## Information architecture

Bottom nav, five items: **Home, Digest, Backstage, Trader, Rig room**.
**Setup** is not in the nav. It opens from the gear icon on Home and has a "‹ Home" back button.

Home shows four mode tiles (Digest, Backstage, Trader, Rig room), the Hank & Vee avatar pair, and a "Today's takeaway" card.

## Screens and behaviour

- **Digest:** list of story cards. Each has a 16:9 image, source and time, headline, and a one-line take from Hank or Vee with their avatar.
- **Backstage:** header showing the two debating bots (the user's bot and another player's bot). Chat-style thread with bot avatars, a "Your takeaway" card, and a **reply box at the bottom** so the user can reply to the bots in the thread.
- **Trader:** used-gear listing cards (96×96 image, name, meta line, price with previous price struck through, "View listing" button, optional tag such as PRICE DROP). **No filters.** Listings are driven by the user's wants and budget.
- **Rig room:** two-column photo grid of gear in the rig, then a grid of wants (dashed border). Pinned input at the bottom to add gear or ask a question. Replies appear under "Latest". **No horizontal scrolling lists anywhere.**
- **Setup:** personality (segmented control), interests (toggle chips), sources (toggle rows), Trader alerts (budget cap, notification time).

## Image placeholders

Placeholders are the hatched `.ph` boxes with a size label. Replace each with an `<img>` (keep the same box size, `object-fit:cover`). Keep `.ph` styling as the fallback when an image is missing or fails to load.

| Where | Size / ratio | Shape |
|---|---|---|
| Bot avatar, Home pair | 56 px | circle |
| Bot avatar, Backstage header | 48 px | circle |
| Bot avatar, Backstage messages | 36 px | circle |
| Bot avatar, Digest take | 28 px | circle |
| Digest story image | 16:9, full card width | rect |
| Trader item image | 96×96 | rounded rect |
| Rig room gear photo | 4:3, half-width card | rect |

Supply 2x assets (for example 192×192 for the 96 px slot).

## Accessibility

- Bottom nav buttons and the gear button need real labels (the gear has `aria-label`).
- Keep text contrast as tokenised. Do not lower `--mu` below its current value on `--bg`.
- Give every real `<img>` meaningful `alt` text (bot name, product name).
