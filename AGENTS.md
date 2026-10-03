<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Feature Documentation Rule

Every time you successfully implement or add a new feature to this codebase, you MUST:
1. Open and update [`Ryff_features.md`](file:///c:/Users/rob_b/Ryff/Ryff_features.md).
2. Add a new entry detailing:
   - **User & Marketing Overview**: Feature name, date, and a clear description of what was added so that it is clear to users and useful for marketing.
   - **Technical Details**: Code, APIs used, schema changes, and architectural details so developers understand the implementation.
   - **White-Label & Domain-Agnostic Utility**: A description of how this feature can be used for white-label re-issues of this project across other domains/verticals (e.g., tracking mileage on running shoes, car maintenance, watch collections).
3. Save [`Ryff_features.md`](file:///c:/Users/rob_b/Ryff/Ryff_features.md) before concluding your task.

