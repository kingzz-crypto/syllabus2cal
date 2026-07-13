import { describe, it, expect } from "vitest";
import { getExtractErrorMessage, getEditErrorMessage, ICS_DOWNLOAD_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from "@/lib/errorMessages";

describe("getExtractErrorMessage", () => {
  it.each([
    "missing_file",
    "invalid_file_type",
    "empty_file",
    "file_too_large",
    "bad_pdf",
    "timeout",
    "empty_result",
    "invalid_response",
    "api_error",
    "malformed_request",
  ])("returns a non-empty, student-friendly string for '%s'", (errorType) => {
    const message = getExtractErrorMessage(errorType);
    expect(message.length).toBeGreaterThan(0);
    // Nothing technical/internal should leak through.
    expect(message.toLowerCase()).not.toContain("gemini");
    expect(message.toLowerCase()).not.toContain("api key");
    expect(message.toLowerCase()).not.toContain("json");
    expect(message.toLowerCase()).not.toContain("zod");
  });

  it("falls back to a generic message for an unrecognized errorType", () => {
    expect(getExtractErrorMessage("some_future_error_type_i_didnt_anticipate")).toBe(
      getExtractErrorMessage("api_error")
    );
  });

  it("falls back to a generic message for null/undefined (errorType missing entirely)", () => {
    expect(getExtractErrorMessage(null).length).toBeGreaterThan(0);
    expect(getExtractErrorMessage(undefined).length).toBeGreaterThan(0);
  });

  it("gives distinct messages for distinct, actionable failure modes", () => {
    const messages = new Set([
      getExtractErrorMessage("invalid_file_type"),
      getExtractErrorMessage("file_too_large"),
      getExtractErrorMessage("bad_pdf"),
      getExtractErrorMessage("timeout"),
    ]);
    expect(messages.size).toBe(4); // no accidental duplicates
  });
});

describe("getEditErrorMessage", () => {
  it.each(["title", "date", "time", "type", "notes"] as const)(
    "returns a non-empty message for field '%s'",
    (field) => {
      expect(getEditErrorMessage(field).length).toBeGreaterThan(0);
    }
  );
});

describe("shared constants", () => {
  it("ICS_DOWNLOAD_ERROR_MESSAGE and NETWORK_ERROR_MESSAGE are non-empty and distinct", () => {
    expect(ICS_DOWNLOAD_ERROR_MESSAGE.length).toBeGreaterThan(0);
    expect(NETWORK_ERROR_MESSAGE.length).toBeGreaterThan(0);
    expect(ICS_DOWNLOAD_ERROR_MESSAGE).not.toBe(NETWORK_ERROR_MESSAGE);
  });
});
