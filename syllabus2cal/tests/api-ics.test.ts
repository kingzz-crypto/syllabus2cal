import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/ics/route";
import type { Deadline } from "@/lib/types";

function makeDeadline(overrides: Partial<Deadline> = {}): Deadline {
  return {
    id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a2",
    courseName: "BIO 101",
    title: "Midterm Exam 1",
    date: "2026-09-15",
    type: "exam",
    confidence: "high",
    ...overrides,
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ics", () => {
  it("returns 200 with a valid .ics body and download headers", async () => {
    const response = await POST(makeRequest({ deadlines: [makeDeadline()] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain(".ics");

    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("SUMMARY:BIO 101: Midterm Exam 1");
  });

  it("names the file after the course", async () => {
    const response = await POST(makeRequest({ deadlines: [makeDeadline({ courseName: "CS 201" })] }));
    expect(response.headers.get("Content-Disposition")).toContain('filename="CS_201.ics"');
  });

  it("accepts an empty deadlines array and returns a valid empty calendar", async () => {
    const response = await POST(makeRequest({ deadlines: [] }));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).not.toContain("BEGIN:VEVENT");
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when 'deadlines' is missing", async () => {
    const response = await POST(makeRequest({ notDeadlines: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when a deadline in the array is invalid", async () => {
    const response = await POST(makeRequest({ deadlines: [{ ...makeDeadline(), date: "not-a-date" }] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when a deadline is missing its id (would be a GeminiDeadline, not a Deadline)", async () => {
    const { id: _id, ...withoutId } = makeDeadline();
    const response = await POST(makeRequest({ deadlines: [withoutId] }));
    expect(response.status).toBe(400);
  });

  it("handles multiple deadlines, mixed all-day and timed", async () => {
    const response = await POST(
      makeRequest({
        deadlines: [
          makeDeadline({ id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a1", title: "Reading", type: "reading" }),
          makeDeadline({
            id: "8f14e45f-ceea-467f-a0e6-b52d17c1e4a3",
            title: "Quiz 1",
            type: "quiz",
            time: "09:00",
          }),
        ],
      })
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
  });
});
