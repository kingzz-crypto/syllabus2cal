"use client";

/**
 * Step 4 — drag-drop + file picker with client-side validation.
 * Step 8a — calls POST /api/extract on a valid file, activating isLoading.
 * Step 12b — checks the free-tier limit (lib/usage.ts) before extracting;
 * over the limit, notifies the parent to show PaywallModal instead.
 * Step 14a — every server error maps through lib/errorMessages.ts for
 * friendly, consistent-tone copy (never shows a raw server/SDK message);
 * loading copy reassures the user if extraction is taking a while.
 */

import { useEffect, useRef, useState } from "react";
import type { ExtractionResult } from "@/lib/types";
import { isOverFreeLimit } from "@/lib/usage";
import { getExtractErrorMessage, NETWORK_ERROR_MESSAGE } from "@/lib/errorMessages";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, per PROJECT_PLAN §3
const ACCEPTED_TYPE = "application/pdf";
const SLOW_LOADING_THRESHOLD_MS = 8_000;

interface UploadDropzoneProps {
  onExtracted: (result: ExtractionResult) => void;
  onLimitReached: () => void;
}

function validateFile(file: File): string | null {
  if (file.type !== ACCEPTED_TYPE) {
    return "That's not a PDF. Please upload your syllabus as a .pdf file.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "That file is too large (max 10 MB). Try a smaller PDF.";
  }
  return null;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/** Maps a failed response's errorType to friendly copy — never surfaces the raw server message. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return getExtractErrorMessage(typeof body?.errorType === "string" ? body.errorType : undefined);
  } catch {
    return getExtractErrorMessage(undefined);
  }
}

export default function UploadDropzone({ onExtracted, onLimitReached }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reassure the user rather than leave them staring at a static spinner
  // once a request is taking a while (independent of the server's own
  // internal 30s Gemini timeout — this is purely a client-side UX signal).
  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  async function extract(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract", { method: "POST", body: formData });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }
      const result: ExtractionResult = await response.json();
      onExtracted(result);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    if (isOverFreeLimit()) {
      onLimitReached();
      return;
    }
    setError(null);
    setSelectedFile(file);
    void extract(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
  }

  function handleClick() {
    if (isLoading) return;
    inputRef.current?.click();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-label="Upload syllabus PDF"
        aria-busy={isLoading}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:px-10 sm:py-16 ${
          isLoading ? "cursor-wait border-gray-300 bg-gray-50" : "cursor-pointer"
        } ${
          !isLoading && isDragActive
            ? "border-blue-400 bg-blue-50"
            : !isLoading
              ? "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
        ) : (
          <svg
            className="h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16.5V9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3.75 3.75 0 0 1 4.163 4.163A4.5 4.5 0 0 1 17.25 19.5H6.75Z"
            />
          </svg>
        )}

        {isLoading ? (
          <>
            <p className="font-medium text-gray-700">Reading your syllabus…</p>
            {isSlow && (
              <p className="text-sm text-gray-400">Still working — this can take up to 30 seconds.</p>
            )}
          </>
        ) : selectedFile ? (
          <>
            <p className="font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-sm text-gray-400">{formatBytes(selectedFile.size)}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-700">
              Drag &amp; drop your syllabus PDF here
            </p>
            <p className="text-sm text-gray-400">or click to browse</p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
