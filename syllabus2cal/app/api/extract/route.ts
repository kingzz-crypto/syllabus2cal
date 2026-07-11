import { NextResponse } from "next/server";
import { extractDeadlinesFromPdf } from "@/lib/gemini";

// Mirrors the client-side limit in UploadDropzone (Step 4) and PROJECT_PLAN §3.
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPE = "application/pdf";

/**
 * Step 6 — real Gemini extraction, replacing the Step 5 hardcoded mock.
 * Request validation (below) is unchanged from Step 5 by design.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No PDF file was provided under the 'file' field." },
      { status: 400 }
    );
  }
  if (file.type !== ACCEPTED_TYPE) {
    return NextResponse.json(
      { error: "Uploaded file must be a PDF." },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 10 MB limit." },
      { status: 400 }
    );
  }

  const outcome = await extractDeadlinesFromPdf(file);

  if (!outcome.success) {
    // bad_pdf is the client's fault (400); everything else is an upstream
    // extraction failure (502) — see lib/gemini.ts's ExtractionError taxonomy.
    const status = outcome.error.type === "bad_pdf" ? 400 : 502;
    return NextResponse.json(
      { error: outcome.error.message, errorType: outcome.error.type },
      { status }
    );
  }

  return NextResponse.json(outcome.result);
}
