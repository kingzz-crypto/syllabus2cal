# Syllabus2Cal — STATUS Log
*Read PROJECT_PLAN.md first. Append one entry per step. Never rewrite past entries.*

---

## Step 1 — Scaffold Next.js + TypeScript + Tailwind (hello world)
**Date:** 2026-07-10
**Model:** Claude Fable 5

### Done
- Scaffolded with `create-next-app@14`: Next.js **14.2.35**, React 18, TypeScript (**strict mode on**), Tailwind CSS 3.4, ESLint, App Router, no `/src` dir, `@/*` import alias — exactly per PROJECT_PLAN §2/§3.
- Replaced default boilerplate with a minimal hello-world page (`app/page.tsx`) and clean root layout (`app/layout.tsx`) with basic title/description metadata.
- Simplified `app/globals.css` to Tailwind directives only; removed unused local Geist fonts (`app/fonts/`) — default system font stack is fine until the landing page step.
- Verified `npm run build` passes: all routes static, 87.4 kB first load JS, zero lint/type errors.

### Intentionally left out
- No `/components`, `/lib`, `/tests`, or API routes yet (Steps 2+).
- No Vitest setup (Step 2, alongside `lib/types.ts`).
- No real landing page copy/design (Step 3).
- No env vars, no `GEMINI_API_KEY` (Step 6).
- Not yet deployed to Vercel — requires the owner's GitHub/Vercel account (instructions below).

### Assumptions & decisions
- Pinned to create-next-app@14 (not 15) because PROJECT_PLAN specifies Next.js 14.
- Kept npm as package manager for maximum Vercel/CI compatibility.

### Deploy instructions (owner action, ~5 min)
1. Push this folder to a new GitHub repo:
   `git init && git add -A && git commit -m "Step 1: scaffold" && git push` (after creating the repo).
2. vercel.com → Add New Project → import the repo → accept defaults → Deploy.
   No env vars needed yet.

### Next step
**Step 2:** Create `lib/types.ts` — the `Deadline` interface, `ExtractionResult`, Zod schemas — plus Vitest setup with first unit tests for schema validation. This is the contract everything else depends on.

---

## Step 2 — `lib/types.ts` contract + Zod schemas + Vitest setup
**Date:** 2026-07-10
**Model:** Claude Fable 5 (design) → Claude Sonnet 5 (rebuild & verification — prior session ran out of credits before the packaged output reached the user)

### Done
- Added deps: `zod@4.4.3` (runtime), `vitest@4.1.10` (dev).
- Created `lib/types.ts` — single source of truth:
  - `DeadlineTypeSchema` / `ConfidenceSchema` enums (exam/assignment/quiz/project/reading/other; high/low).
  - `IsoDateSchema`: strict `YYYY-MM-DD` regex **plus** a real-calendar check (rejects 2026-02-30, non-leap Feb 29, month 13, etc.).
  - `TimeSchema`: strict 24h `HH:MM` (no seconds, no 12-hour formats).
  - `GeminiDeadlineSchema` (AI output, no `id`, unknown extra keys stripped) vs `DeadlineSchema` (extends it with `id: uuid`).
  - `ExtractionResultSchema`: `{ courseName, deadlines[], warnings[] }` per PLAN §4; `warnings` defaults to `[]`; empty `deadlines` is valid.
  - `toDeadline()` helper: promotes validated AI output to a full `Deadline` via `crypto.randomUUID()`.
- Vitest wired up: `vitest.config.ts` (node env, mirrors `@/*` alias), `npm test` / `npm run test:watch` scripts.
- `tests/types.test.ts`: **40 tests, all passing** — valid/invalid dates & times, whitespace trimming, missing fields, invented enum values, model-injected `id` stripping, envelope validation, uuid helper.
- Verified: `npm test` ✅ (40/40), `npm run lint` ✅, `npm run build` ✅ (still 87.4 kB — types not imported by app yet).

### Intentionally left out
- No UI, no components, no API routes (Steps 3–5).
- No Gemini prompt/client (Step 6).
- No `icsBuilder`, no usage/localStorage helpers.
- No error-taxonomy types yet (belongs with the API layer, Step 5/6).

### Assumptions & decisions
- Zod v4 API (`z.uuid()`, not deprecated `z.string().uuid()`).
- `zod`/`vitest` pinned to `^4` (not unpinned `latest`) to avoid an unreviewed major-version jump landing silently mid-project.
- Text fields trimmed on parse; empty-after-trim `courseName`/`title` rejected.
- `time` is floating local wall-clock (no timezone); all-day events omit `time`.
- Field length caps (courseName 200, title 300, notes 1000) as sanity bounds on LLM output.
- Gemini schema is non-strict (extra keys stripped) but model-supplied `id` is verified stripped.
- Rebuilt in a new sandbox from the Step 1 zip since the prior session's container wasn't reachable here — logic is unchanged, re-verified end to end.

### Next step
**Step 3:** Static landing page — headline, value prop, upload placeholder, footer. Copy + layout only, zero logic.
