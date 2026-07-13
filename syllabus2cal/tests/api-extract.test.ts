import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/extract/route";

const { mockExtract } = vi.hoisted(() => ({ mockExtract: vi.fn() }));

vi.mock("@/lib/gemini", () => ({
  extractDeadlinesFromPdf: mockExtract,
}));

function makeRequest(formData: FormData): Request {
  return new Request("http://localhost/api/extract", { method: "POST", body: formData });
}

function makeFormDataWithFile(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

describe("POST /api/extract", () => {
  beforeEach(() => {
    mockExtract.mockReset();
  });

  it("returns 200 + the extraction result on success", async () => {
    mockExtract.mockResolvedValue({
      success: true,
      result: { courseName: "BIO 101", deadlines: [], warnings: [] },
    });

    const file = new File(["dummy pdf bytes"], "syllabus.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.courseName).toBe("BIO 101");
  });

  it("returns 400 with errorType 'missing_file' when the 'file' field is missing (and never calls extraction)", async () => {
    const formData = new FormData();
    formData.append("other", "hello");

    const response = await POST(makeRequest(formData));
    expect(response.status).toBe(400);
    expect((await response.json()).errorType).toBe("missing_file");
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("returns 400 with errorType 'invalid_file_type' for a non-PDF mime type", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(400);
    expect((await response.json()).errorType).toBe("invalid_file_type");
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("returns 400 with errorType 'empty_file' for an empty file", async () => {
    const file = new File([], "empty.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(400);
    expect((await response.json()).errorType).toBe("empty_file");
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("returns 400 with errorType 'file_too_large' for a file over 10 MB", async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([oversized], "big.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(400);
    expect((await response.json()).errorType).toBe("file_too_large");
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("returns 400 with errorType 'bad_pdf' when extraction reports a bad PDF", async () => {
    mockExtract.mockResolvedValue({
      success: false,
      error: { type: "bad_pdf", message: "Could not read the uploaded PDF." },
    });
    const file = new File(["dummy"], "syllabus.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorType).toBe("bad_pdf");
  });

  it("returns 502 when extraction reports an api_error", async () => {
    mockExtract.mockResolvedValue({
      success: false,
      error: { type: "api_error", message: "Gemini API key is not configured on the server." },
    });
    const file = new File(["dummy"], "syllabus.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.errorType).toBe("api_error");
  });

  it("returns 504 when extraction reports a timeout (Step 14a)", async () => {
    mockExtract.mockResolvedValue({
      success: false,
      error: { type: "timeout", message: "Gemini did not respond within 30s." },
    });
    const file = new File(["dummy"], "syllabus.pdf", { type: "application/pdf" });
    const response = await POST(makeRequest(makeFormDataWithFile(file)));
    expect(response.status).toBe(504);
    const body = await response.json();
    expect(body.errorType).toBe("timeout");
  });
});
