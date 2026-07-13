"use client";

/**
 * components/PaywallModal.tsx — Step 12b (UI) + Step 13b (unlock flow wired).
 * Shown when UploadDropzone detects the free limit has been reached
 * (lib/usage.ts). Unlock code is validated via lib/unlock.ts's SHA-256
 * check (Step 13a); on success, persists the unlocked state and notifies
 * the parent so it can close the modal.
 */

import { useEffect, useState } from "react";
import { isValidUnlockCode, setUnlocked } from "@/lib/unlock";

// TODO(owner): replace with the real PayPal.me link before launch.
const PAYPAL_LINK = "https://paypal.me/REPLACE_ME_4USD";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export default function PaywallModal({ isOpen, onClose, onUnlocked }: PaywallModalProps) {
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Reset transient state each time the modal is (re)opened.
    setCode("");
    setError(null);
    setIsChecking(false);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleUnlock() {
    if (!code.trim() || isChecking) return;
    setIsChecking(true);
    setError(null);
    try {
      const valid = await isValidUnlockCode(code);
      if (valid) {
        setUnlocked();
        onUnlocked();
      } else {
        setError("That code doesn't look right. Double-check and try again.");
      }
    } finally {
      setIsChecking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="paywall-title" className="text-lg font-semibold text-gray-900">
          You&apos;ve used your free syllabus
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Unlock unlimited syllabi — and merge all your courses into one calendar — for a one-time $4.
        </p>

        <a
          href={PAYPAL_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Unlock for $4 via PayPal
        </a>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <label htmlFor="unlock-code" className="block text-xs font-medium text-gray-500">
            Already paid? Enter your unlock code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="unlock-code"
              type="text"
              placeholder="Unlock code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleUnlock();
                }
              }}
              disabled={isChecking}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={() => void handleUnlock()}
              disabled={isChecking || !code.trim()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              {isChecking ? "Checking…" : "Unlock"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
