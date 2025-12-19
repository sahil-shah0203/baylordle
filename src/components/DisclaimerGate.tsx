"use client";

import { useEffect, useState } from "react";

const KEY = "baylordle_disclaimer_accepted_v1";

export default function DisclaimerGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(KEY) === "true";
    setAccepted(v);
    setReady(true);
  }, []);

  function continueToGame() {
    localStorage.setItem(KEY, "true");
    setAccepted(true);
  }

  // prevents flicker while reading localStorage
  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-neutral-600">Loading…</div>
      </div>
    );
  }

  if (accepted) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mt-3 space-y-2 text-sm text-neutral-700 leading-relaxed">
          <p>
            <span className="font-semibold">Not medical advice</span>.
          </p>
          <p>
            <span className="font-semibold">Not affiliated</span>{" "}
            with any institution.
          </p>
        </div>

        <button
          onClick={continueToGame}
          className="mt-5 w-full rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          Continue
        </button>

        <div className="mt-3 text-xs text-neutral-500">
          By continuing, you acknowledge this notice.
        </div>
      </div>
    </div>
  );
}