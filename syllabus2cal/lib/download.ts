/**
 * lib/download.ts — tiny client-side helper for Step 11b.
 * Kept as a pure function (not inlined in the component) so it's testable
 * without a DOM/jsdom environment, which this project doesn't have set up.
 */

/**
 * Extracts the filename from a `Content-Disposition: attachment;
 * filename="foo.ics"` header value. Falls back to a generic name if the
 * header is missing or doesn't match the expected shape.
 */
export function extractFilename(contentDisposition: string | null): string {
  const fallback = "syllabus2cal.ics";
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}
