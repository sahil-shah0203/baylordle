"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateDeviceId, getPlayedKeyForDate } from "@/lib/device";
import DisclaimerGate from "@/components/DisclaimerGate";
import Image from "next/image";

type Color = "yellow" | "green" | "blue" | "purple";

type Group = {
  id: string;
  title: string;
  color: Color;
  words: [string, string, string, string];
};

type Puzzle = {
  date: string;
  groups: [Group, Group, Group, Group];
};

type SolvedGroup = {
  id: string;
  title: string;
  color: Color;
  words: string[];
};

const COLOR_CLASS: Record<Color, string> = {
  yellow: "bg-yellow-200",
  green: "bg-green-200",
  blue: "bg-blue-200",
  purple: "bg-purple-200",
};

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatFullDate(dateStr: string) {
  // dateStr = YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

  const month = date.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return `${weekday}, ${month} ${ordinal(d)}, ${y}`;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(date: string) {
  // "2025-12-18" -> 20251218
  return Number(date.replaceAll("-", ""));
}

function seededShuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COLOR_EMOJI: Record<Color, string> = {
  yellow: "🟨",
  green: "🟩",
  blue: "🟦",
  purple: "🟪",
};

function buildShareText(args: {
  date: string;
  solved: { color: Color }[];
  mistakesLeft: number;
}) {
  const { date, solved, mistakesLeft } = args;
  const mistakesUsed = 4 - mistakesLeft;
  const [y, m, d] = date.split("-").map(Number);
  const shareDate = `${m}/${d}/${y}`;

  const lines: string[] = [];
  lines.push("Baylordle");
  lines.push(shareDate);

  // one row per solved group, in the order they solved it
  for (const g of solved) {
    lines.push(`${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}`);
  }

  lines.push(`Mistakes: ${mistakesUsed}`);
  lines.push("baylordle.com");
  return lines.join("\n");
}

function getStateKeyForDate(date: string) {
  return `connections_state_${date}`;
}

function MistakesDots({ mistakesLeft }: { mistakesLeft: number }) {
  const total = 4;
  const used = total - mistakesLeft;

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-neutral-600">Mistakes</div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const isUsed = i < used;
          return (
            <span
              key={i}
              className={[
                "inline-block h-2.5 w-2.5 rounded-full border",
                isUsed
                  ? "bg-neutral-200 border-neutral-300"
                  : "bg-neutral-900 border-neutral-900",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}

const CURRY_WIN_MESSAGES = [
  "Buckets. Pure buckets.",
  "Greatness looks familiar.",
  "Locked in and lethal.",
  "That was automatic.",
  "You showed up today.",
  "Elite focus.",
  "Nothing but net.",
  "Another day, another win.",
  "Calm under pressure.",
  "Championship habits.",
];

const CURRY_LOSE_MESSAGES = [
  "Misses happen. Shooters shoot.",
  "Come back stronger tomorrow.",
  "Progress isn’t linear.",
  "Every great run has bricks.",
  "Film it. Fix it.",
  "Losses teach more than wins.",
  "You’ll get the next one.",
  "Stay patient. Stay hungry.",
  "Trust the process.",
  "Reset and reload.",
];

function getCurryDismissKey(dateStr: string) {
  return `baylordle_curry_dismissed_${dateStr}`;
}

function CurryCongrats({
  show,
  didWin,
  dateSeed,
  dateStr,
}: {
  show: boolean;
  didWin: boolean;
  dateSeed: number;
  dateStr: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      setDismissed(false);
    } else {
      setMounted(false);
    }
  }, [show]);

  if (!show || dismissed) return null;

  const messages = didWin ? CURRY_WIN_MESSAGES : CURRY_LOSE_MESSAGES;
  const msg = messages[dateSeed % messages.length];
  const imgSrc = didWin ? "/currywin.png" : "/currylose.png";

  function close() {
    localStorage.setItem(getCurryDismissKey(dateStr), "true");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/10" />

      <div
        className={[
          "absolute right-0 top-1/2 -translate-y-1/2",
          "w-[320px] sm:w-[380px]",
          "transition-transform duration-700 ease-out",
          mounted ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="mr-4 rounded-3xl border border-neutral-200 bg-white shadow-lg overflow-hidden pointer-events-auto">
          <div className="relative h-[260px] w-full">
            <Image
              src={imgSrc}
              alt="Stephen Curry"
              fill
              className="object-cover"
              priority
            />
            <button
              type="button"
              aria-label="Close"
              onClick={() => setDismissed(true)}
              className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-800 shadow hover:bg-white"
            >
              X
            </button>
          </div>

          <div className="p-4">
            <div className="text-sm font-semibold text-neutral-900">{msg}</div>
            <div className="mt-1 text-xs text-neutral-500">See you tomorrow.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);

  const [seed, setSeed] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(4);
  const [solved, setSolved] = useState<SolvedGroup[]>([]);
  const [message, setMessage] = useState("");
  const [lockedOut, setLockedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guessedSets, setGuessedSets] = useState<string[]>([]);
  const [shakeSelected, setShakeSelected] = useState(false);
  const [easterClicks, setEasterClicks] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const isGameOver = mistakesLeft === 0 || solved.length === 4;

  const didWin = solved.length === 4;
  const dateSeed = puzzle ? seedFromDate(puzzle.date) : 0;

  const [wrongPulse, setWrongPulse] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  useEffect(() => {
    getOrCreateDeviceId();
    (async () => {
      setLoading(true);
      const res = await fetch("/api/puzzle/today", { cache: "no-store" });
      const data = await res.json();
      setPuzzle(data.puzzle);
      const saved = localStorage.getItem(getStateKeyForDate(data.puzzle.date));
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            seed: number;
            mistakesLeft: number;
            solved: SolvedGroup[];
            guessedSets: string[];
          };
          setSeed(parsed.seed ?? 0);
          setMistakesLeft(parsed.mistakesLeft ?? 4);
          setSolved(parsed.solved ?? []);
          setGuessedSets(parsed.guessedSets ?? []);
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!puzzle) return;
    setLockedOut(localStorage.getItem(getPlayedKeyForDate(puzzle.date)) === "true");
  }, [puzzle]);

  const allWords = useMemo(() => {
    if (!puzzle) return [];
    const words = puzzle.groups.flatMap((g) => g.words).map(String);
    return seededShuffle(words, seedFromDate(puzzle.date) + seed);
  }, [puzzle, seed]);

  const remainingWords = useMemo(() => {
    const solvedWords = new Set(solved.flatMap((g) => g.words));
    return allWords.filter((w) => !solvedWords.has(w));
  }, [allWords, solved]);

  function toggleWord(word: string) {
    if (lockedOut || isGameOver) return;
    setMessage("");
    setSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  }

  function normalizeSet(arr: string[]) {
    return [...arr].slice().sort().join("|");
  }

  function submit() {
    if (!puzzle || lockedOut || isGameOver) return;
    setMessage("");

    if (selected.length !== 4) {
      setMessage("Select 4 words.");
      return;
    }

    const picked = normalizeSet(selected);

    if (guessedSets.includes(picked)) {
      setMessage("Already guessed.");
      return;
    }

    setGuessedSets((prev) => (prev.includes(picked) ? prev : [...prev, picked]));

    const match = puzzle.groups.find(
      (g) => normalizeSet(g.words as unknown as string[]) === picked
    );

    if (match) {
      setSolved((prev) => [
        ...prev,
        { id: match.id, title: match.title, color: match.color, words: [...match.words] },
      ]);
      setSelected([]);
      setMessage("Correct!");
      return;
    }

    const oneAway = puzzle.groups.some((g) => {
      const set = new Set(g.words);
      const overlap = selected.filter((w) => set.has(w)).length;
      return overlap === 3;
    });

    setWrongPulse((x) => x + 1);
    setWrongFlash(true);
    setTimeout(() => setWrongFlash(false), 220);
    setMistakesLeft((m) => Math.max(0, m - 1));
    setMessage(oneAway ? "One away…" : "Nope.");
    if (!oneAway) {
      setShakeSelected(true);
      setTimeout(() => setShakeSelected(false), 450);
    }
  }

  function clear() {
    if (lockedOut || isGameOver) return;
    setSelected([]);
    setMessage("");
    setCopied(false);
  }

  function shuffleNow() {
    if (lockedOut || isGameOver || !puzzle) return;
    setSelected([]);
    setMessage("");
    setSeed((s) => s + 1);
    setCopied(false);
  }

  function handleEasterClick() {
    if (showEasterEgg) return;
    setEasterClicks((c) => {
      const next = c + 1;
      if (next >= 10) {
        setShowEasterEgg(true);
        return 10;
      }
      return next;
    });
  }

  async function copyResults() {
    if (!puzzle) return;
    const text = buildShareText({ date: puzzle.date, solved, mistakesLeft });

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: prompt (works even if clipboard blocked)
      window.prompt("Copy your results:", text);
    }
  }

  useEffect(() => {
    if (!puzzle) return;
    if (isGameOver) localStorage.setItem(getPlayedKeyForDate(puzzle.date), "true");
  }, [isGameOver, puzzle]);

  useEffect(() => {
    if (!puzzle) return;
    const payload = { seed, mistakesLeft, solved, guessedSets };
    localStorage.setItem(getStateKeyForDate(puzzle.date), JSON.stringify(payload));
  }, [puzzle, seed, mistakesLeft, solved, guessedSets]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-600">Loading…</div>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-red-600">Failed to load puzzle.</div>
      </main>
    );
  }

  return (
    <DisclaimerGate>
      <main className="min-h-screen bg-white text-neutral-900 relative">
        <div className="mx-auto max-w-xl px-4 py-8">
          <header className="mb-6 flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {formatFullDate(puzzle.date)}
              </h1>
            </div>
            <MistakesDots mistakesLeft={mistakesLeft} />
          </header>

          {lockedOut && (
            <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              You’ve already played today’s puzzle on this device.
            </div>
          )}

          <div className="mb-4 space-y-2">
            {solved.map((g) => (
              <div key={g.id} className={`rounded-2xl p-3 ${COLOR_CLASS[g.color]} border border-neutral-200`}>
                <div className="text-xs font-semibold tracking-wide">{g.title}</div>
                <div className="mt-1 text-sm text-neutral-800">{g.words.join(" · ")}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {remainingWords.map((word) => {
              const isSelected = selected.includes(word);
              return (
                <button
                  key={`${word}-${selected.includes(word) ? wrongPulse : 0}`}
                  onClick={() => toggleWord(word)}
                  className={[
                    "rounded-2xl border px-2 py-4 text-xs font-semibold tracking-wide",
                    "transition",
                    isSelected && shakeSelected ? "shake" : "",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400",
                    isSelected && wrongFlash ? "baylordle-wrongflash" : "",
                    isSelected && wrongPulse ? "baylordle-shake" : "",
                  ].join(" ")}
                >
                  {word}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={clear}
              className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-50"
              disabled={lockedOut || isGameOver || selected.length === 0}
            >
              Clear
            </button>

            <div className="flex gap-2">
              <button
                onClick={shuffleNow}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-50"
                disabled={lockedOut || isGameOver}
              >
                Shuffle
              </button>
              <button
                onClick={submit}
                className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                disabled={lockedOut || isGameOver || selected.length !== 4}
              >
                Submit
              </button>
            </div>
          </div>

          {message && <div className="mt-3 text-center text-sm text-neutral-700">{message}</div>}

          {isGameOver && (
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
              <div className="font-semibold">{solved.length === 4 ? "You solved it 🎉" : "Game over"}</div>
              <button
                onClick={copyResults}
                className="mt-3 w-full rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
              >
                {copied ? "Copied!" : "Copy results"}
              </button>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800">
                {buildShareText({ date: puzzle.date, solved, mistakesLeft })}
              </pre>
            </div>
          )}
        </div>
        <CurryCongrats show={isGameOver} didWin={didWin} dateSeed={dateSeed} />
        <button
          type="button"
          aria-label="Easter egg trigger"
          onClick={handleEasterClick}
          className="absolute bottom-0 left-0 h-1/4 w-1/4 opacity-0"
        />
        {showEasterEgg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-lg">
              <div className="text-sm text-neutral-800 leading-relaxed">
                Hi Thara! Just wanted to say im so happy to have met you, and
                love spending time with you. You are so caring, hard-working,
                and beautiful. I was wondering if I could ask you a lil
                question...
              </div>
              <button
                onClick={() => setShowEasterEgg(false)}
                className="mt-5 w-full rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </DisclaimerGate>
  );
}
