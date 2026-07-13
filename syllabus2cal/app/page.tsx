"use client";

/**
 * Step 3 — static landing copy/layout.
 * Step 4 — real UploadDropzone swapped in for the static placeholder.
 * Step 8a — page becomes a client component: owns extraction state, wires
 * UploadDropzone's result into DeadlineTable via toDeadline() (Step 2).
 * Step 12b — tracks free-tier usage (lib/usage.ts) and shows PaywallModal
 * when UploadDropzone reports the limit's been reached.
 */

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import DeadlineTable from "@/components/DeadlineTable";
import DownloadButton from "@/components/DownloadButton";
import PaywallModal from "@/components/PaywallModal";
import { toDeadline, type Deadline, type ExtractionResult } from "@/lib/types";
import { incrementUsageCount } from "@/lib/usage";

export default function Home() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [courseName, setCourseName] = useState<string>("");
  const [hasExtracted, setHasExtracted] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  function handleExtracted(result: ExtractionResult) {
    incrementUsageCount();
    setDeadlines(result.deadlines.map((d) => toDeadline(d)));
    setWarnings(result.warnings);
    setCourseName(result.courseName);
    setHasExtracted(true);
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center px-4 py-16 sm:px-6">
        <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Syllabus2Cal
          </h1>
          <p className="text-lg font-medium text-gray-800 sm:text-xl">
            Upload a syllabus PDF, get every deadline as a calendar file.{" "}
            <span className="text-blue-600">30 seconds.</span>
          </p>
          <p className="text-sm text-gray-500 sm:text-base">
            Built for college and high school students — stop losing points to
            deadlines you forgot were even on the syllabus.
          </p>
        </div>

        <UploadDropzone onExtracted={handleExtracted} onLimitReached={() => setShowPaywall(true)} />

        {hasExtracted && (
          <>
            <DeadlineTable
              deadlines={deadlines}
              warnings={warnings}
              courseName={courseName}
              onChange={setDeadlines}
            />
            <DownloadButton deadlines={deadlines} />
          </>
        )}
      </div>

      <footer className="border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Syllabus2Cal. Not affiliated with your school.</p>
      </footer>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUnlocked={() => setShowPaywall(false)}
      />
    </main>
  );
}
