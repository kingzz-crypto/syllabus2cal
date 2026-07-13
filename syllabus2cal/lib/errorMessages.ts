/**
 * lib/errorMessages.ts — Steps 14a/14b: friendly, consistent-tone copy for
 * every error/empty state in the app.
 *
 * Design: the server and lib/ functions keep precise, technical messages
 * (useful for logs/debugging — see lib/gemini.ts's ExtractionError,
 * lib/deadlineHelpers.ts's Zod-derived edit errors). This file is the ONLY
 * place raw technical detail gets translated into what a student actually
 * sees, so tone stays consistent and nothing internal (a stray Gemini SDK
 * message, a raw Zod error, a server misconfiguration string) ever reaches
 * the UI verbatim.
 */

import type { EditableField } from "./deadlineHelpers";

/** /api/extract error -> friendly copy. Unknown/missing errorType falls back to a safe generic message. */
export function getExtractErrorMessage(errorType: string | null | undefined): string {
  switch (errorType) {
    case "missing_file":
      return "Please choose a PDF file to upload.";
    case "invalid_file_type":
      return "That's not a PDF. Please upload your syllabus as a .pdf file.";
    case "empty_file":
      return "That file looks empty. Please check it and try again.";
    case "file_too_large":
      return "That file is too large (max 10 MB). Try a smaller PDF.";
    case "bad_pdf":
      return "We couldn't read that PDF. Try re-saving or re-exporting it, then upload again.";
    case "timeout":
      return "This is taking longer than expected. Please try again — if it keeps happening, try a smaller or simpler PDF.";
    case "empty_result":
      return "We didn't get anything back from the AI reader. Please try again in a moment.";
    case "invalid_response":
      return "We had trouble understanding what was extracted. Please try again.";
    case "api_error":
    case "malformed_request":
    default:
      return "Something went wrong reading that PDF. Please try again.";
  }
}

/** DownloadButton -> friendly copy. /api/ics errors are all effectively "something failed generating the file" — no per-cause detail is actionable for the student, so one consistent message covers every case. */
export const ICS_DOWNLOAD_ERROR_MESSAGE = "Couldn't generate the calendar file. Please try again.";

/** Network-level fetch failure (couldn't reach the server at all), shared wording across UploadDropzone and DownloadButton for consistent tone. */
export const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

/**
 * Inline table-edit validation error -> friendly copy, keyed by field
 * rather than by parsing Zod's message text. Native <input type="date">
 * / <input type="time"> / <select> already prevent most malformed input
 * client-side, so these are mostly a defense-in-depth backstop, not the
 * primary UX — generic-but-clear per-field copy is the right level of
 * detail here.
 */
export function getEditErrorMessage(field: EditableField): string {
  switch (field) {
    case "title":
      return "Title can't be empty.";
    case "date":
      return "Please enter a valid date.";
    case "time":
      return "Please enter a valid time.";
    case "type":
      return "Please choose a valid type.";
    case "notes":
      return "That note is too long — try shortening it.";
  }
}
