import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractDeadlinesFromPdf, buildExtractionPrompt } from "@/lib/gemini";

const VALID_JSON = JSON.stringify({
  courseName: "BIO 101",
  deadlines: [
    {
      courseName: "BIO 101",
      title: "Midterm Exam 1",
      date: "2026-09-15",
      time: "10:00",
      type: "exam",
      confidence: "high",
    },
  ],
  warnings: [],
});

const REALISTIC_SYLLABUS_JSON = JSON.stringify({
  courseName: "CS 201",
  deadlines: [
    { courseName: "CS 201", title: "Quiz 1", date: "2026-09-05", type: "quiz", confidence: "high" },
    {
      courseName: "CS 201",
      title: "Group Project — Proposal",
      date: "2026-09-20",
      type: "project",
      confidence: "high",
    },
    {
      courseName: "CS 201",
      title: "Group Project — Final",
      date: "2026-11-10",
      type: "project",
      confidence: "high",
    },
    {
      courseName: "CS 201",
      title: "Fall Break — No Class",
      date: "2026-10-12",
      type: "other",
      confidence: "high",
    },
    {
      courseName: "CS 201",
      title: "Reading: Ch. 4",
      date: "2026-09-08",
      type: "reading",
      notes: "extra credit / optional",
      confidence: "low",
    },
  ],
  warnings: ["Could not resolve 'Week 14 presentation date' — no anchor date found."],
});

function makeFile(bytes = "dummy pdf bytes"): File {
  return new File([bytes], "syllabus.pdf", { type: "application/pdf" });
}

describe("extractDeadlinesFromPdf", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns success with a validated result on a well-formed Gemini response", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => VALID_JSON,
    });
    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.result.courseName).toBe("BIO 101");
      expect(outcome.result.deadlines).toHaveLength(1);
    }
  });

  it("handles a realistic multi-type syllabus (quiz/project milestones/no-class/reading + warnings)", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => REALISTIC_SYLLABUS_JSON,
    });
    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.result.deadlines).toHaveLength(5);
      expect(outcome.result.deadlines.map((d) => d.type)).toEqual(
        expect.arrayContaining(["quiz", "project", "other", "reading"])
      );
      expect(outcome.result.warnings).toHaveLength(1);
    }
  });

  it("strips a ```json code fence before parsing", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => "```json\n" + VALID_JSON + "\n```",
    });
    expect(outcome.success).toBe(true);
  });

  it("recovers JSON even when the model adds commentary around it despite instructions", async () => {
    const wrapped = `Sure! Here are the extracted deadlines:\n${VALID_JSON}\nLet me know if you need more.`;
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => wrapped,
    });
    expect(outcome.success).toBe(true);
  });

  it("returns api_error when GEMINI_API_KEY is not configured", async () => {
    delete process.env.GEMINI_API_KEY;
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => VALID_JSON,
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("api_error");
  });

  it("returns empty_result when Gemini responds with blank text", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => "   ",
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("empty_result");
  });

  it("returns invalid_response for text with no JSON object in it at all", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => "Sure, here are the deadlines you asked for, one moment.",
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("invalid_response");
  });

  it("returns invalid_response when JSON doesn't match the ExtractionResult schema", async () => {
    const badShape = JSON.stringify({ courseName: "BIO 101", deadlines: [{ date: "not-a-date" }] });
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => badShape,
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("invalid_response");
  });

  it("returns api_error when the Gemini call throws", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => {
        throw new Error("503 Service Unavailable");
      },
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("api_error");
  });

  it("returns bad_pdf when the thrown error mentions an unsupported file/mime type", async () => {
    const outcome = await extractDeadlinesFromPdf(makeFile(), {
      callGemini: async () => {
        throw new Error("Unsupported mime type for inline data");
      },
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.type).toBe("bad_pdf");
  });
});

describe("buildExtractionPrompt", () => {
  it("names all six type values so the model can't invent a new one", () => {
    const prompt = buildExtractionPrompt("2026-07-10");
    for (const type of ["exam", "quiz", "assignment", "project", "reading", "other"]) {
      expect(prompt).toContain(type);
    }
  });

  it("substitutes the provided date as the 'today' anchor", () => {
    expect(buildExtractionPrompt("2026-07-10")).toContain("2026-07-10");
  });

  it("instructs the model to map no-class days / holidays to a type", () => {
    const prompt = buildExtractionPrompt();
    expect(prompt.toLowerCase()).toContain("no-class");
  });
});
