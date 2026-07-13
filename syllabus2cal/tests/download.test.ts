import { describe, it, expect } from "vitest";
import { extractFilename } from "@/lib/download";

describe("extractFilename", () => {
  it("extracts the filename from a standard Content-Disposition header", () => {
    expect(extractFilename('attachment; filename="BIO_101.ics"')).toBe("BIO_101.ics");
  });

  it("falls back to a generic name when the header is null", () => {
    expect(extractFilename(null)).toBe("syllabus2cal.ics");
  });

  it("falls back to a generic name when the header doesn't match the expected shape", () => {
    expect(extractFilename("attachment")).toBe("syllabus2cal.ics");
  });

  it("falls back to a generic name for an empty string", () => {
    expect(extractFilename("")).toBe("syllabus2cal.ics");
  });
});
