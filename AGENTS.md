# AGENTS Guidelines & Instructions for Ryff

## Core Directives

### 1. Maintain Feature Documentation (`Ryff_features.md`)
- Whenever you add new features, update code capabilities, modify the architecture, or implement key functionality, **you must update [`Ryff_features.md`](file:///c:/Users/rob_b/Ryff/Ryff_features.md)**.
- Document both developer-facing technical details (what the code does under the hood) and user-facing feature summaries (what value/capability it provides).
- This feature document serves dual purposes: technical reference for developers and feature source material for marketing/communication.

---

## Workspace Rules & Best Practices

- Preserve clean code structure and follow established architecture.
- Keep secret credentials and API keys in `.env.local` and never commit sensitive keys to source control.
- Test new components and verify functionality before declaring implementation complete.
