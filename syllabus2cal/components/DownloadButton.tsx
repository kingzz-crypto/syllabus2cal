"use client";

/**
 * components/DownloadButton.tsx — Step 11b.
 * Wires the client to POST /api/ics and triggers a real browser download.
 * Blob-URL + temporary-<a> is the standard pattern for a fetch-driven file
 * download (a plain <a href="/api/ics"> can't POST a body).
 * Step 14b — uses one consistent friendly message for any failure (see
 * lib/errorMessages.ts: unlike /api/extract, /api/ics's failure modes
 * aren't distinctly actionable to a student, so one clear message covers
 * all of them rather than surfacing the raw server error).
 */

import { useState } from "react";
import type { Deadline } from "@/lib/types";
import { extractFilename } from "@/lib/download";
import { ICS_DOWNLOAD_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from "@/lib/errorMessages";

interface DownloadButtonProps {
  deadlines: Deadline[];
}

export default function DownloadButton({ deadlines }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEmpty = deadlines.length === 0;

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlines }),
      });

      if (!response.ok) {
        setError(ICS_DOWNLOAD_ERROR_MESSAGE);
        return;
      }

      const blob = await response.blob();
      const filename = extractFilename(response.headers.get("Content-Disposition"));

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading || isEmpty}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isDownloading ? "Generating…" : "Download Calendar (.ics)"}
      </button>
      {isEmpty && <p className="text-xs text-gray-400">Add at least one deadline to download.</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
