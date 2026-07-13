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

---

## Plan revision — v1.1 adopted, Steps 8a–10b tightened for precision
**Date:** 2026-07-11
**Model:** Claude Sonnet 5

`PROJECT_PLAN.md` replaced with the owner's v1.1 (Steps 8–20 split into a/b half-steps, one half-step per session). Before building starts on them, reviewed 8a–10b specifically — the next three steps — for gaps and ambiguity (11 onward left as drafted, out of scope for this pass):

- **8a**: draft said "render `Deadline[]`" with no data source. Added the missing piece explicitly — `UploadDropzone` → `POST /api/extract` → `toDeadline()` → lifted state in `page.tsx` → `DeadlineTable`. Also activates the `isLoading`/error states Step 4 built but left unused for exactly this.
- **9a**: extended the editable-field list to include `notes` (draft omitted it). Added a decision: editing a `confidence: "low"` row flips it to `"high"` (user just confirmed it) — flagged as reversible if that's not wanted.
- **9b**: clarified defaults for a newly-added row and that row keys must stay stable across add/delete.
- **10a**: pinned to the `ics` npm package per §2 (not hand-rolled RFC 5545), UID = `deadline.id`.
- **10b**: flagged a real risk to check at build time — some ICS libraries force UTC and don't support floating local times cleanly; verify before assuming `ics` does.

Full refined text lives in `PROJECT_PLAN.md` §5.

### Next step
**8a** — `DeadlineTable` (read-only) + the real UploadDropzone→/api/extract wiring.

---

## Step 8a — DeadlineTable (read-only) + real UploadDropzone→API wiring
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `lib/deadlineHelpers.ts` (new): pure, tested logic split out of the UI — `getFieldValue`, `sortDeadlinesByDate`, `formatDateDisplay`/`formatTimeDisplay` (UTC-anchored so display can't shift a day/hour in any timezone — regression-tested).
- `components/DeadlineTable.tsx` + `components/DeadlineRow.tsx` (new): renders Type/Title/Date/Time/Notes as a real `<table>`, sorted chronologically. Type shown as a color-coded pill.
- `components/UploadDropzone.tsx`: now actually `POST`s to `/api/extract` on a valid file — activates the `isLoading` state reserved since Step 4 (spinner replaces the static icon), reuses the existing error display for extraction failures (400/502), converts the JSON response via `readErrorMessage`.
- `app/page.tsx`: promoted to a client component (`"use client"`) to hold lifted `deadlines`/`warnings`/`courseName` state; converts each `GeminiDeadline` → `Deadline` via `toDeadline()` (Step 2) on a successful extraction; renders `DeadlineTable` once something's been extracted.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅, `next lint` ✅, `next build` ✅ (page bundle 87.4kB → 107kB for the added UI).

### Intentionally left out
- No editing, no low-confidence highlighting yet (8b).
- No polished per-failure-mode copy — extraction errors show the raw API message (Step 14a).

### Next step
8b.

---

## Step 8b — Low-confidence highlighting, warnings banner, empty state
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `DeadlineRow`: `confidence: "low"` rows get an amber left-border + tint + a small "Needs review" label.
- `DeadlineTable`: `warnings[]` rendered as an amber banner above the table when non-empty; a friendly empty state (with its own "+ Add a deadline" entry point) when `deadlines` is `[]`, instead of a blank table.
- Same data flow as 8a — no new wiring needed.
- Verified alongside 8a/9a/9b in one combined test run (see 9b's entry) — all four sub-steps share the same two component files, tested together rather than four separate isolated passes.

### Intentionally left out
- Polished copy per specific failure mode (Step 14a) — the empty state and warnings banner use one generic message each, not tailored per cause.

### Next step
9a.

---

## Step 9a — Inline editing (title/date/time/type/notes)
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `lib/deadlineHelpers.ts`: `applyDeadlineEdit()` — applies one field edit, re-validates the **whole row** against `DeadlineSchema` (not just the touched field, so a row can't end up internally inconsistent), and promotes `confidence` to `"high"` on any successful edit (the decision flagged in the plan revision — reversible if unwanted).
- `DeadlineRow`: click any cell to edit it in place — text input (title/notes), native `<input type="date">` / `<input type="time">` (date/time — these natively return exactly the `YYYY-MM-DD`/`HH:MM` strings the Zod schemas expect), `<select>` (type, so it can't produce an invented value by construction). Enter commits, Escape cancels, blur commits.
- On an invalid edit: inline error shown, input stays in edit mode with the user's (invalid) draft visible so they can fix it — the underlying committed data never becomes invalid, only the in-progress draft can transiently be wrong.
- **Extended scope vs. the plan draft**: added `notes` to the editable fields (the draft's list omitted it).
- 12 new unit tests in `tests/deadlineHelpers.test.ts` covering every field's valid/invalid edit path, confidence promotion, and the "clearing time/notes removes the field" behavior.

### Intentionally left out
- No visible transition/animation on entering edit mode (not required, avoided per frontend-design guidance against unnecessary motion).

### Next step
9b.

---

## Step 9b — Row management (delete + add)
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `DeadlineRow`: delete button (icon, red on hover) → `window.confirm()` → removes the row. Native confirm chosen over a custom modal as the pragmatic choice for now; a styled modal is reasonable later polish, not required now.
- `DeadlineTable`: "+ Add a deadline" button (also shown in the empty state) → `createBlankDeadline()` (always schema-valid on creation — title defaults to "New deadline", date to today, type "other", confidence "high" since it's user-authored) → appended to the array → **immediately enters edit mode on its title field** via the same `startEdit` path 9a already built, so the user's very next keystroke overwrites the placeholder.
- Row `key={row.id}` (stable uuid, not array index) means edits/deletes never get misattributed to the wrong row across re-sorts or additions.
- Combined verification for 8a/8b/9a/9b together: `tsc --noEmit` ✅, `vitest run` ✅ **97/97** (across all 5 test files), `next lint` ✅, `next build` ✅ — then a full clean `npm ci` reinstall + retest ✅, to rule out anything being an artifact of incremental sandbox state.

### Intentionally left out
- No undo for delete (confirm dialog is the only safety net).
- No drag-to-reorder (rows are always chronologically sorted, which was treated as sufficient ordering).

### Next step
10a.

---

## Step 10a — `lib/icsBuilder.ts` core (all-day events)
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- Installed `ics@3.12.0` (per PROJECT_PLAN §2 — not hand-rolled RFC 5545).
- **Verified empirically before writing any test assertions** (not assumed from memory): probed the raw library output for all-day events, escaping, and — critically — the floating-local-time claim flagged as a risk during the plan revision. Generated the identical event under `TZ=America/Los_Angeles` and `TZ=Asia/Kolkata`: byte-identical `DTSTART` output, no shift. `startInputType`/`startOutputType: "local"` genuinely means floating, not "server's local time." This closes the risk noted in `PROJECT_PLAN.md` §5.
- `lib/icsBuilder.ts`: `buildIcs(deadlines: Deadline[]): IcsBuildResult` (discriminated union, matching the `ExtractionOutcome` pattern from Step 6 rather than inventing a new error-handling shape). All-day deadlines → `DTSTART;VALUE=DATE`, `UID` = `${deadline.id}@syllabus2cal`, `SUMMARY` = `"{courseName}: {title}"`, `CATEGORIES` = the deadline type, `DESCRIPTION` = notes (omitted entirely when there are none), calendar name derived from the first deadline's course (falls back to "Syllabus2Cal" for an empty array).
- 11 unit tests: VCALENDAR/VEVENT structure, date-only DTSTART format, UID derivation, comma/semicolon escaping (confirmed handled by the library, not hand-rolled), categories, empty array (valid empty calendar), calendar naming, and RFC 5545 line-folding on a long `notes` field (confirmed: continuation lines ≤75 octets, tab-prefixed).

### Intentionally left out
- Timed events (10b).

### Assumptions & decisions
- Title is prefixed with course name (`"BIO 101: Midterm Exam 1"`) — not specified in the plan, added because it's useful context in an exported calendar the student will see alongside other calendars, and sets up cleanly for the paid "merge all courses" feature later.
- `categories` (not part of the original plan) set from `deadline.type` — a natural fit for an ICS field designed exactly for this, at near-zero cost.

### Next step
10b.

---

## Step 10b — `icsBuilder` timed events + edge cases
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- Same `deadlineToEvent()` now branches on `deadline.time`: timed deadlines get a 5-element `start` array + `startInputType`/`startOutputType: "local"` (the empirically-verified floating-time config from 10a) + a **30-minute nominal duration** (documented decision: a Deadline is a due date, not a meeting, but a 0-minute block renders oddly in some calendar apps).
- 6 more unit tests: timed `DTSTART` format, floating-time assertion (no `Z`, no `TZID`), midnight (`00:00`), end-of-day (`23:59`), non-zero duration, and a mixed array (one all-day + one timed deadline in the same calendar, both correctly formatted).
- Final combined verification across the whole Steps 8a-10b build: `tsc --noEmit` ✅, `vitest run` ✅ **97/97**, `next lint` ✅, `next build` ✅, then a from-scratch `npm ci` + full retest ✅.

### Intentionally left out
- `POST /api/ics` route and `DownloadButton` — that's 11a/11b, not asked for in this batch.
- `icsBuilder` is not yet called from anywhere in the app (no route wires it up yet) — same "built but not yet connected" pattern as Steps 5→6 and 4→8a earlier in this project.

### Next step
**11a** — `POST /api/ics` route: validate body with Zod, call `buildIcs`, return the .ics file with correct headers (test via curl, per the plan). **11b** — `DownloadButton` component wiring it to the browser, plus manual verification importing into Google Calendar and Apple Calendar.

---

## Step 11a — `POST /api/ics` route
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `lib/types.ts`: added `IcsRequestSchema` (`{ deadlines: Deadline[] }`) — the request contract, living alongside the other shared schemas rather than defined ad hoc in the route.
- `lib/icsBuilder.ts`: added `buildIcsFilename(deadlines)` — slugifies the first deadline's course name for the download filename ("BIO 101" → "BIO_101.ics"), falls back to a generic name for an empty array.
- `app/api/ics/route.ts` (new): thin route per the architecture rule — parse JSON → `IcsRequestSchema.safeParse` → `buildIcs()` → return. Malformed JSON or failed validation → 400; an internal `buildIcs` failure (shouldn't happen against already-validated input) → 500; success → 200 with `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="..."`.
- **Deviated from the plan's "test via curl only"**: curl-against-a-live-server is a known sandbox hang here (documented since Step 5). Used the same proven approach as every other route instead — calling the exported `POST` directly with constructed `Request` objects. 8 new tests: valid request, filename-from-course-name, empty array, malformed JSON, missing field, invalid deadline, missing `id` (rejects a bare `GeminiDeadline` masquerading as a `Deadline`), and a mixed all-day+timed multi-item request.
- `lib/download.ts` (new): `extractFilename()` — tiny pure helper for 11b to read the server-chosen filename back out of the response header. 4 tests.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **112/112**, `next lint` ✅.

### Next step
11b.

---

## Step 11b — `DownloadButton` component
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `components/DownloadButton.tsx` (new): `POST`s the current `deadlines` to `/api/ics`, then triggers a real browser download via `Blob` + a temporary `<a download>` (the standard pattern for a fetch-driven download — a plain `<a href>` can't carry a POST body). Filename comes from the server's `Content-Disposition` header via `extractFilename()`, not hardcoded client-side. Disabled while downloading and when there are zero deadlines (with a small explanatory note); errors reuse the same inline-message pattern as the rest of the app.
- Wired into `app/page.tsx`, rendered directly below `DeadlineTable`, sharing the same lifted `deadlines` state.
- Combined verification: `tsc --noEmit` ✅, `vitest run` ✅ **112/112**, `next lint` ✅, `next build` ✅ (`/api/ics` registered as a dynamic route) — then a from-scratch `npm ci` + full retest ✅.

### Manual verification — genuinely needs the owner, not skipped
The plan calls for manually confirming the .ics file imports cleanly into **Google Calendar and Apple Calendar**. I can't click through either of those myself. To make this checkable right now without even running the dev server, generated a real sample file (`sample-BIO_101.ics`, delivered alongside this zip) using the exact same field-mapping logic as `lib/icsBuilder.ts` — 7 events covering every type (exam, assignment, quiz, reading, two project milestones, a no-class day), one low-confidence-style item, one all-day, several timed. **Please import this into both calendar apps and report back** — that closes the one part of 10/11 that unit tests structurally can't cover (RFC-5545-valid text is necessary but not sufficient proof a specific calendar app's importer is happy with it).

### Intentionally left out
- No progress bar/percentage during generation (a single "Generating…" label was judged sufficient — ICS generation is near-instant, not a long-running operation).
- No "copy link" / share option, only direct download — not requested.

### Next step
Phase C (Steps 8–11) is now fully built. Phase D starts at **12a** (`lib/usage.ts` — localStorage free-tier counter, pure + unit tested, no UI yet).

---

## Step 12a — `lib/usage.ts` (free-tier counter)
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `lib/usage.ts` (new): `FREE_SYLLABUS_LIMIT = 1`. Split per the plan's own phrasing — pure logic (`parseUsageCount`, `hasExceededFreeLimit`) separate from the storage wrapper (`getUsageCount`, `incrementUsageCount`, `resetUsageCount`, `isOverFreeLimit`). Storage is injectable (same DI pattern as `lib/gemini.ts`'s `callGemini`), defaulting to real `window.localStorage`, so this is fully unit-testable without jsdom.
- Safe no-op fallback (treats the user as having 0 uses) when storage is unavailable (SSR, private browsing) — fails open, not closed; never blocks a legitimate user because of an environment quirk.
- 21 tests: count parsing (including corrupt/negative/non-integer values), limit-checking, increment/reset persistence, and the storage-unavailable fallback path.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **21/21** (this file), no UI yet per scope.

### Not yet accounted for
`isOverFreeLimit()` only checks the counter — it doesn't yet know about a paid/unlocked state, because that storage key doesn't exist until Step 13b wires the unlock flow. Noted explicitly so this isn't mistaken for an oversight when 13b revisits this check.

### Next step
12b.

---

## Step 12b — `PaywallModal`
**Date:** 2026-07-12
**Model:** Claude Sonnet 5

### Done
- `components/PaywallModal.tsx` (new): dialog (`role="dialog"`, `aria-modal`, labelled, closes on Escape or backdrop click) with a PayPal link and a **disabled** unlock-code input + button ("Coming soon") — intentionally non-functional per the plan; Step 13 builds the actual validation.
- Wired the trigger: `UploadDropzone` now calls `isOverFreeLimit()` (Step 12a) before extracting — if the limit's been hit, it calls a new `onLimitReached` callback instead of proceeding, and `page.tsx` owns `showPaywall` state and renders the modal. `incrementUsageCount()` is called on a *successful* extraction only — a failed upload (bad PDF, API error) doesn't consume the user's free syllabus.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **133/133**, `next lint` ✅, `next build` ✅, then a from-scratch `npm ci` + full retest ✅.

### ⚠️ Needs your action before this is real
`PAYPAL_LINK` in `PaywallModal.tsx` is a placeholder (`https://paypal.me/REPLACE_ME_4USD`), clearly marked `TODO(owner)` in the code. Swap in the real PayPal.me link (brother's account, per the plan) before this feature does anything useful.

### Intentionally left out
- Unlock code input/button are inert by design (Step 13a/13b).
- No focus-trapping inside the modal (Escape + backdrop-click covers the common cases; full trap treated as later polish, not required now).
- The enforcement is entirely client-side localStorage — trivially bypassable (clear storage, private window). This is the plan's own stated v1 approach (§13: "static codes validated client-side v1 ... documented upgrade path to server-side later"), not a new gap introduced here.

### Assumptions & decisions
- Free limit enforced by blocking *before* the API call (not just hiding the download after) — protects Gemini API quota, not just UX.

### Next step
**13a** — Unlock code logic: client-side SHA-256 hash check as pure functions + unit tests (no wiring yet). **13b** — wire the unlock flow end to end, including teaching `isOverFreeLimit()`'s caller about the unlocked state.

### Suggestion, not built
This project now has a meaningful amount of interactive UI (UploadDropzone, DeadlineTable/Row, DownloadButton, PaywallModal) verified only via type-check + build + manual review — there's no jsdom/React Testing Library setup, so click/keyboard interactions themselves aren't automated. Worth a deliberate decision at some point, not assumed here since it's not on the roadmap.

---

## Step 13a — Unlock code logic (hash check, pure)
**Date:** 2026-07-13
**Model:** Claude Sonnet 5

### Done
- `lib/unlock.ts` (new): `hashCode()` — SHA-256 hex digest via the standard Web Crypto API (`crypto.subtle.digest`), which is available identically in the browser and in Node's test environment — **cross-checked against Node's own `crypto` module before writing any code** to confirm they agree (they do, byte for byte).
- `isValidUnlockCode()`: normalizes (trim + lowercase) before hashing, checks against a `Set` of valid hashes — never stores/compares plaintext codes.
- Seeded with one real, working demo code so the flow is testable today: `"SYLLABUS2CAL-DEMO"`. Its hash was generated using the exact same `hashCode()` function being shipped (not computed separately/by hand), so it's guaranteed consistent.
- 9 tests: determinism, correct digest length/format, case/whitespace normalization, rejecting wrong/empty codes.

### ⚠️ Needs your action before this is real
The demo code is a placeholder. Before launch, generate a real code's hash (a one-liner is in the code comment) and replace `VALID_CODE_HASHES` in `lib/unlock.ts`.

### Security note (documented per the plan's own "v1" framing)
This is intentionally lightweight: hashing beats shipping the code in plaintext, but the hash and comparison logic both still ship in the client bundle. It can't detect a code being shared or revoke a leaked one. Upgrade path if that becomes a real problem: move validation to a server route backed by a database of issued/redeemed codes.

### Next step
13b.

---

## Step 13b — Unlock flow wired end-to-end
**Date:** 2026-07-13
**Model:** Claude Sonnet 5

### Done
- `lib/unlock.ts`: added `isUnlocked()`/`setUnlocked()` — localStorage-backed, same injectable-storage pattern as `lib/usage.ts`.
- `lib/usage.ts`: `isOverFreeLimit()` now checks `isUnlocked()` first — an unlocked user is never paywalled, regardless of usage count. This closes the exact gap flagged in Step 12a's entry ("doesn't yet know about a paid/unlocked state").
- `PaywallModal`: the input/button are no longer disabled. Enter or the Unlock button calls `isValidUnlockCode()`; on success, `setUnlocked()` persists the state and an `onUnlocked` callback tells the parent to close the modal; on failure, an inline error ("That code doesn't look right..."). Button shows "Checking…" while the (async) hash check runs, so it can't be double-submitted.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **147/147**, `next lint` ✅, `next build` ✅ — then a from-scratch `npm ci` + full retest ✅.
- Try it yourself right now: hit the paywall (upload a 2nd syllabus), enter `SYLLABUS2CAL-DEMO`, confirm it unlocks and the modal closes.

### Intentionally left out
- No visible "you're unlocked" indicator elsewhere in the UI (e.g. a footer badge) — not part of 13b's stated scope, closing the modal is the confirmation.
- Server-side upgrade path documented (see 13a) but not built — correctly out of scope for v1 per the plan.

### Next step
**14a** — Error/empty/loading polish for the upload → extract flow (friendly copy for every failure mode). **14b** — same for table → download → paywall.

---

## Step 14a — Error/empty/loading polish: upload → extract
**Date:** 2026-07-13
**Model:** Claude Sonnet 5

### Done
- **Audited every error path in the upload→extract flow** and found it was showing several raw, technical, or server-internal messages directly to students (e.g. a live Gemini SDK error message we actually saw pass through in Step 7's real-world test; "Gemini API key is not configured on the server"; raw Zod schema errors). This step closes that.
- `lib/errorMessages.ts` (new): `getExtractErrorMessage(errorType)` — the single place raw/technical detail gets translated to student-facing copy. Server keeps precise messages (logs/debugging); this is the only place that copy gets shown to a user.
- `app/api/extract/route.ts`: every error path now carries an `errorType` — previously only Step 6's Gemini-taxonomy errors did; Step 5's basic validation errors (`missing_file`, `invalid_file_type`, `empty_file`, `file_too_large`) didn't, so the client had no reliable way to map them.
- **Added real timeout handling** (was completely missing before, and explicitly named in this step's scope): `lib/gemini.ts` now races the Gemini call against a 30s timer, returns a distinct `"timeout"` error type, mapped to HTTP `504`. **Verified the timeout actually fires** via a fake-timers test (simulated a request that never resolves, advanced 30s, confirmed the timeout branch is hit) rather than just trusting the `Promise.race` logic looks right.
- `UploadDropzone`: reads `errorType` and maps through `getExtractErrorMessage()` instead of showing the raw server message; loading state now shows "Still working — this can take up to 30 seconds" if extraction is taking more than 8s, so a slow request doesn't read as a frozen/broken page.
- 19 new tests for the message-mapping (every errorType produces a distinct, non-technical message; unrecognized types fall back safely) + 3 new route tests (errorType on every basic-validation branch, the timeout→504 mapping).
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **168/168**, `next lint` ✅, `next build` ✅.

### Honest limitation
The 30s timeout abandons the *client-side* wait but can't confirm the underlying Gemini request was actually cancelled — unverifiable whether `@google/genai`'s `generateContent` honors an abort signal without live API access (same caveat as Step 6). The user gets a fast, friendly timeout regardless; the in-flight request may still complete server-side and simply be discarded.

### Next step
14b.

---

## Step 14b — Error/empty/loading polish: table → download → paywall
**Date:** 2026-07-13
**Model:** Claude Sonnet 5

### Done
- `DownloadButton`: was passing through the raw `/api/ics` server error verbatim (risk: a raw Zod message like "Invalid request body: ..." reaching a student). Replaced with one consistent friendly message (`lib/errorMessages.ts`'s `ICS_DOWNLOAD_ERROR_MESSAGE`) — justified because, unlike extraction, `/api/ics`'s failure modes aren't distinctly actionable for a student (they didn't cause it; it's either an internal bug or a transient issue either way).
- Inline table-edit errors (Step 9a): was showing Zod's raw validation message (e.g. regex-format errors). Now maps by **field**, not by parsing Zod text (`getEditErrorMessage("date")` → "Please enter a valid date.", etc.) — more robust than string-matching, and appropriately generic given the native `<input type="date">`/`<input type="time">`/`<select>` already prevent most malformed input before Zod ever sees it.
- Shared `NETWORK_ERROR_MESSAGE` constant now used identically by both `UploadDropzone` and `DownloadButton` for the "couldn't reach the server" case — same wording everywhere, per this step's "consistent tone" goal.
- **`app/error.tsx`** (new): route-level error boundary — Next.js's convention for catching genuinely unexpected/unhandled errors (a React crash, not one of the anticipated failure modes above) and showing a friendly "Something went wrong" screen with a "Try again" button, instead of a blank page or the framework's raw error overlay in production. Logs the real error to the console (for whoever's watching logs) without ever showing technical detail to the user.
- Reviewed the existing empty-state (Step 8b) and paywall/unlock copy (12b/13b) — both already reasonably friendly and consistent; left unchanged rather than rewriting working copy for its own sake.
- Verified: `tsc --noEmit` ✅, `vitest run` ✅ **168/168**, `next lint` ✅, `next build` ✅ (7 static pages, `error.tsx` compiles and registers correctly) — then a from-scratch `npm ci` + full retest ✅.

### Intentionally left out
- No "show technical details" toggle anywhere — this is a student tool, not a dev tool; the friendly message is the only message shown.
- No `global-error.tsx` (the even-higher-level boundary for root-layout crashes) — genuinely rare edge case, judged not worth the extra file for this app's size; `error.tsx` covers the realistic cases.

### Next step
**Phase D is now fully built** (Steps 12–14). **15a** — Mobile responsiveness pass: landing page + upload flow. **15b** — mobile pass for the deadline table, modal, and download button.
