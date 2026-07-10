"use client";

/**
 * Step 4 — UploadDropzone.
 * Drag-drop + file picker with client-side validation only (PDF, <=10MB).
 * Deliberately does NOT call any API — that's Step 5. Selecting a file just
 * surfaces it (name/size) or an error; nothing is uploaded yet.
 */

import { useRef, useState } from "react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, per PROJECT_PLAN §3
const ACCEPTED_TYPE = "application/pdf";

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

export default function UploadDropzone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Reserved for Step 5, when a real extraction request is in flight.
  const [isLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
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
        className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:px-10 sm:py-16 ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />

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

        {isLoading ? (
          <p className="font-medium text-gray-700">Reading your syllabus…</p>
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
