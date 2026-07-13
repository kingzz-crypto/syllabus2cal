import { NextResponse } from "next/server";
import { extractDeadlinesFromPdf } from "@/lib/gemini";

// Mirrors the client-side limit in UploadDropzone (Step 4) and PROJECT_PLAN §3.
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPE = "application/pdf";

/**
 * Step 6 — real Gemini extraction, replacing the Step 5 hardcoded mock.
 * Step 14a — every error path now carries an `errorType`, not just the
 * Gemini-taxonomy ones. The client maps these to friendly copy
 * (lib/errorMessages.ts); this route keeps precise, technical messages —
 * useful for logs/debugging, not meant to reach the user verbatim.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data.", errorType: "malformed_request" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No PDF file was provided under the 'file' field.", errorType: "missing_file" },
      { status: 400 }
    );
  }
  if (file.type !== ACCEPTED_TYPE) {
    return NextResponse.json(
      { error: "Uploaded file must be a PDF.", errorType: "invalid_file_type" },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "Uploaded file is empty.", errorType: "empty_file" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 10 MB limit.", errorType: "file_too_large" },
      { status: 400 }
    );
  }

  const outcome = await extractDeadlinesFromPdf(file);

  if (!outcome.success) {
    // bad_pdf is the client's fault (400); timeout is a distinct upstream
    // condition (504); everything else is a generic upstream failure (502)
    // — see lib/gemini.ts's ExtractionError taxonomy.
    const status = outcome.error.type === "bad_pdf" ? 400 : outcome.error.type === "timeout" ? 504 : 502;
    return NextResponse.json(
      { error: outcome.error.message, errorType: outcome.error.type },
      { status }
    );
  }

  return NextResponse.json(outcome.result);
}
