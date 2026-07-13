import { NextResponse } from "next/server";
import { IcsRequestSchema } from "@/lib/types";
import { buildIcs, buildIcsFilename } from "@/lib/icsBuilder";

/**
 * Step 11a — thin route: parse + validate input, call the lib function,
 * return. All the actual ICS-building logic lives in lib/icsBuilder.ts
 * (Step 10), already unit-tested there.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = IcsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid request body: ${parsed.error.issues[0]?.message ?? "validation failed"}` },
      { status: 400 }
    );
  }

  const { deadlines } = parsed.data;
  const result = buildIcs(deadlines);

  if (!result.success) {
    // Input is already schema-validated at this point, so a build failure
    // here means an unexpected internal/library problem, not bad input.
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const filename = buildIcsFilename(deadlines);
  return new NextResponse(result.ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
