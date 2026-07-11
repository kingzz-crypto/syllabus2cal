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

---

## Step 3 — Static landing page
**Date:** 2026-07-10
**Model:** Claude Sonnet 5

### Done
- Rewrote `app/page.tsx`: headline + one-line value prop, subtext (college/HS students), static upload-placeholder div (icon + copy, no logic), footer with dynamic copyright year + disclaimer.
- Mobile-responsive via Tailwind breakpoints (`sm:`) on text size/padding; single-column flex layout works at all widths.
- Kept in one file, no new components (page is short enough).
- `app/layout.tsx` untouched — existing metadata already matches the value prop.
- Verified: `npm run lint` ✅, `npm run build` ✅ (87.4 kB, unchanged).

### Intentionally left out
- No drag-drop/file-picker logic or client state (Step 4).
- No API routes (Step 5+).
- No design polish/animations, no dark mode (Step 15).
- No SEO/OG image work beyond existing Step 1 metadata (Step 17).

### Assumptions & decisions
- Upload placeholder is a plain static `div` with an icon + copy, styled to look obviously interactive later, but not wired to any handler.

### Next step
**Step 4:** `UploadDropzone` component — drag-drop, file picker, client-side PDF/size validation, loading state.

---

## Step 4 — UploadDropzone component
**Date:** 2026-07-10
**Model:** Claude Sonnet 5

### Done
- `components/UploadDropzone.tsx` (client component): drag-drop (`onDrop`/`onDragOver`/`onDragLeave`), click-to-browse via hidden file input, keyboard-accessible (`role="button"`, Enter/Space).
- Client-side validation only: rejects non-`application/pdf` files and files over 10 MB (per PLAN §3), shown as an inline error message.
- Visual states: idle, drag-active (highlighted border), file-selected (shows name + size), and a reserved (unused) `isLoading` state/UI branch for Step 5 to wire up.
- Swapped into `app/page.tsx` in place of the Step 3 static placeholder; rest of the landing page untouched.
- Verified: `npm run lint` ✅, `npm run build` ✅ (88.5 kB, +1.1 kB for the component).

### Intentionally left out
- No API call / upload logic — selecting a file does not send it anywhere (Step 5).
- No real loading/spinner UI wired up — state exists but nothing sets it yet.
- No multi-file support (single syllabus per PLAN's free-tier model).
- No paywall/usage-limit check yet (Step 12).

### Assumptions & decisions
- Validation checks `file.type === "application/pdf"` (MIME type) rather than filename extension — browsers reliably set this for PDFs; can add an extension fallback later if needed.
- `isLoading` state added now (unused) so Step 5 only has to set it, not restructure the component.

### Next step
**Step 5:** `POST /api/extract` skeleton — accept multipart PDF, return hardcoded mock `Deadline[]` (contract-first).

---

## Step 5 — `POST /api/extract` skeleton
**Date:** 2026-07-10
**Model:** Claude Sonnet 5

### Done
- `app/api/extract/route.ts`: accepts `multipart/form-data` with a `file` field, returns a hardcoded mock `ExtractionResult` (courseName + 3 deadlines spanning exam/assignment/project, one low-confidence, plus a sample warning) — proves the client↔server contract before Step 6 wires up real Gemini calls.
- Server-side guards (never trust client-only validation): missing `file` field, wrong MIME type, empty file, file > 10 MB — each returns `400` with a JSON `{ error }` body.
- Mock response is run through `ExtractionResultSchema.safeParse()` before being returned — the same Zod gate real Gemini output will use; returns `500` if it ever fails (defensive; shouldn't happen with a static mock).
- `tests/api-extract.test.ts` (new): 6 Vitest tests calling the exported `POST` handler directly with constructed `Request`/`FormData` objects — valid PDF (200 + correct shape), missing field, wrong type, empty file, oversized file (all 400). Chosen over a live-server + curl test because backgrounding `next start` hangs this sandbox's `bash_tool` (known issue, see prior session) — this approach exercises the same code path and leaves permanent, fast regression coverage.
- Verified: `npm run lint` ✅, `npm run build` ✅ (route registered as dynamic `ƒ /api/extract`), `vitest run` ✅ — **46/46 tests** (40 from Step 2 + 6 new).

### Intentionally left out
- No real Gemini call, no PDF content parsing (Step 6).
- No client wiring — `UploadDropzone` still does not call this endpoint; not part of Step 5's stated scope.
- No structured error-code taxonomy (bad PDF vs API-down vs empty-result) — explicitly Step 6.
- No auth/rate-limiting/usage-counter check (Step 12).

### Assumptions & decisions
- Form field name chosen as `file` — whichever step wires up the client should POST under this key.
- Kept the mock inline in the route rather than pre-creating `lib/gemini.ts`, since that file is explicitly Step 6's deliverable.
- Flagging, not fixing: Vercel's serverless functions have historically had a request-body ceiling (~4.5 MB on the free tier) below the plan's 10 MB target. Not a Step 5 concern (this is a local dev-server observation), but worth a check at deploy/QA time.

### Next step
**Step 6:** `lib/gemini.ts` — real Gemini call with PDF, extraction prompt v1, Zod validation, error taxonomy (bad PDF / API down / empty result).

---

## Step 6 — `lib/gemini.ts`: real Gemini call, prompt v1, Zod validation, error taxonomy
**Date:** 2026-07-10
**Model:** Claude Sonnet 5

### Done
- Installed `@google/genai@2.11.0` — the current officially-recommended Gemini SDK (Google is migrating users off the older `@google/generative-ai`).
- `lib/gemini.ts`:
  - `buildExtractionPrompt()` — versioned v1 system instruction per PLAN §4: extracts all dated item types, never invents dates, resolves relative dates only with an explicit anchor (else → `warnings`), infers missing years as "low" confidence relative to today's date (injected dynamically), strict output-shape instructions.
  - `callGemini()` — isolated network call (model: `gemini-2.5-flash`, inline-data PDF as base64, `responseMimeType: "application/json"`). Kept as a single small, swappable function.
  - `extractDeadlinesFromPdf()` — orchestrates read→call→parse→validate, returns a typed `ExtractionOutcome` (`{success:true, result}` or `{success:false, error}`), never throws for expected failures.
  - Error taxonomy (`ExtractionError`): `bad_pdf`, `api_error`, `empty_result`, `invalid_response` — covers missing/misconfigured API key, unreadable file, thrown SDK errors, blank response, non-JSON response, and schema-validation failures.
  - Defensive JSON parsing strips a ```json fence if the model adds one anyway.
  - Response still gated by `ExtractionResultSchema` (Step 2) — untouched, unmodified.
- `app/api/extract/route.ts`: swapped the Step 5 mock for the real call; `bad_pdf` → 400, everything else → 502, both with `{ error, errorType }`. Request-validation branches (missing/wrong-type/empty/oversized file) are unchanged from Step 5.
- `.env.example` added (`GEMINI_API_KEY=`, server-side only, with a comment linking to Google AI Studio).
- Tests: `tests/gemini.test.ts` (8 new, one per error-taxonomy branch + happy path + code-fence stripping) and `tests/api-extract.test.ts` (rewritten — now mocks `lib/gemini` via `vi.hoisted`, since the route's behavior is no longer a static mock).
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **55/55** (40 + 8 + 7), `next lint` ✅, `next build` ✅.

### Intentionally left out
- Prompt hardening against real syllabi, scanned/image-PDF handling — explicitly Step 7.
- Client wiring (`UploadDropzone` still doesn't call this endpoint).
- `pdf-parse`/`unpdf` fallback mentioned in PLAN §2's tech table — not on the numbered roadmap yet; flagging its existence, not building it.
- Usage/paywall check (Step 12).

### Assumptions & decisions — please read before deploying
- **Not tested against the live Gemini API.** This sandbox has no network path to `generativelanguage.googleapis.com` and no real `GEMINI_API_KEY`. All logic *I* control — prompt, error taxonomy, JSON parsing, Zod gate — is unit-tested with an injected fake `callGemini`. The one part that is **not** verified end-to-end is the actual SDK call shape in `callGemini()` (model name, the `config` object's exact fields, `response.text`) — written from current official docs, but the JS Gemini SDK moves fast. **Before relying on this for real, run one real upload locally with a real key and skim https://ai.google.dev/gemini-api/docs for `models.generateContent`.**
- Model pinned to `gemini-2.5-flash` (a constant, easy to bump) — re-check free-tier pricing/availability periodically.
- `bad_pdf` detection from thrown errors is a keyword-based heuristic (checks for "mime"/"unsupported"/"invalid file" in the message) — best-effort until Step 7 surfaces real failure text.
- 10 MB PDF → ~13.3 MB base64 payload to Gemini; flagging (not solving) alongside the existing Step 5 note about Vercel's function body-size ceiling.

### Next step
**Step 7:** Prompt hardening — test against ≥5 real syllabi (requires a real `GEMINI_API_KEY`), iterate the prompt, handle scanned/image PDFs, document actual failure modes.

---

## Step 7 (partial) — Prompt hardening
**Date:** 2026-07-10
**Model:** Claude Sonnet 5

### Done — the part achievable without live API access
- Prompt v2 in `lib/gemini.ts`, hardened by reasoning (not live testing) about likely real-syllabus patterns:
  - **Fixed a real gap in v1**: "no-class days" and "presentations" were listed as things to extract but never mapped to a `type` value — the model had nothing valid to put there. Now explicitly: map anything that isn't an obvious exam/quiz/assignment/project/reading to `"other"`.
  - Added guidance for: numeric date format (assume month/day unless the document indicates otherwise), dates marked "TBD"/"to be announced" (omit + warn, same as unresolvable relative dates), multi-milestone projects (one entry per checkpoint, distinguishing titles), and clarified that `confidence` describes the *date's* certainty, not the whole entry.
- `extractJsonPayload()` replaces the old fence-only stripper — now also recovers JSON if the model wraps it in commentary despite instructions (fenced block → first-brace/last-brace slice → raw text).
- Added `maxOutputTokens: 8192` to the Gemini call — headroom against truncated JSON on syllabi with many deadlines.
- Expanded `tests/gemini.test.ts`: a realistic multi-type mock response (quiz + project milestones + no-class day + optional reading + a warning), a commentary-wrapped-JSON recovery test, and 3 smoke tests on the prompt text itself (all 6 types named, today's date substituted, no-class-day guidance present).
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **60/60**, `next lint` ✅, `next build` ✅.

### NOT done — blocked, not skipped
The step's actual requirement — **"test against ≥5 real syllabi... document failure modes"** — could not be done here:
- This sandbox has no network path to `generativelanguage.googleapis.com` (not in the allowed egress list), so **no live Gemini call is possible regardless of API key**.
- No `GEMINI_API_KEY` has been provided.
- No sample syllabus PDFs have been provided.
All of the above are prerequisites outside what I can supply myself. What's marked "done" above is real, tested hardening of the parts under my control (prompt content, JSON recovery, error taxonomy) — it is **not** a substitute for observing how Gemini actually behaves on real documents.

### To actually finish Step 7 (owner action needed)
1. Get a `GEMINI_API_KEY` (https://aistudio.google.com/app/apikey), set it locally.
2. Run this app somewhere with real network access (your machine, or Vercel) — not this sandbox.
3. Upload ≥5 real syllabi, note what breaks (wrong type mapping, missed dates, truncated JSON, etc.), and bring the failures back for a real Step 7 iteration.
   — Alternative: paste/upload a couple of real syllabi directly in this chat; I can read them myself and reason through what the prompt should produce, which won't replace live testing but can catch obvious prompt gaps before you spend API calls on it.

### Next step
Either: (a) come back with real Gemini output/failure notes so Step 7 can be finished for real, or (b) move on to **Step 8** (`DeadlineTable` — render results, highlight low-confidence rows) and treat Step 7 as revisitable later. Your call.

---

## Step 7 — live-testing update: first real Gemini API result
**Date:** 2026-07-11
**Model:** Claude Sonnet 5 (patch based on the owner's real curl test)

### What happened
Owner ran the app locally with a real `GEMINI_API_KEY` and POSTed a real PDF to `/api/extract`. Got a clean `502` with:
```
{"error":"... \"This model models/gemini-2.5-flash is no longer available to new users...\"","errorType":"api_error"}
```
This is the first real signal from the live API, and it's a good one: multipart parsing, the actual Gemini network call, error classification, and the JSON error response all worked correctly end-to-end. Only the pinned model name was wrong — `gemini-2.5-flash` returned 404s for new callers starting ~2026-07-09, ahead of its officially announced (much later) shutdown date. Confirmed via Google's own AI developer forum — an active, days-old thread reports the exact same premature 404 for the same model.

### Fix
- `GEMINI_MODEL` changed from a pinned `"gemini-2.5-flash"` to the alias `"gemini-flash-latest"` (currently resolves to `gemini-3.5-flash`). Google commits to 2 weeks' email notice before swapping what this alias points to — meaningfully more resilient than a hard pin, given a hard pin already broke early once. Trade-off: behavior can shift under an app update outside our control; acceptable for this project's needs.
- Re-verified: `vitest run` ✅ 60/60 (all Gemini tests use a mocked call, so this alone wouldn't have caught it — this bug was only reachable via the live-API path, which is exactly why Step 7's real-syllabus testing matters and can't be fully replaced by mocks).

### Next step
Owner: retry the same curl/PDF now that the model is fixed, report back what comes through.
