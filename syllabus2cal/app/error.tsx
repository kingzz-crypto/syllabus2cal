"use client";

/**
 * app/error.tsx — Step 14b: global error fallback.
 * Next.js's error-boundary convention: catches any unhandled error thrown
 * during rendering anywhere in this route and shows this instead of a
 * blank page / the framework's raw error screen. This is the backstop for
 * genuinely unexpected failures — every *anticipated* failure mode already
 * has its own specific handling (lib/errorMessages.ts) upstream of this.
 */

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged for whoever's watching server/browser logs — never shown to
    // the user, who only sees the friendly message below.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-600">
        Sorry about that — an unexpected error occurred. Your PDF and progress weren&apos;t saved anywhere,
        so it&apos;s safe to try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Try again
      </button>
    </main>
  );
}
