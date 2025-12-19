"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateDeviceId, getPlayedKeyForDate } from "@/lib/device";
import DisclaimerGate from "@/components/DisclaimerGate";

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

  const lines: string[] = [];
  lines.push("Baylordle Connections");
  lines.push(date);

  // one row per solved group, in the order they solved it
  for (const g of solved) {
    lines.push(`${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}${COLOR_EMOJI[g.color]}`);
  }

  lines.push(`Mistakes: ${mistakesUsed}`);
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

  const isGameOver = mistakesLeft === 0 || solved.length === 4;

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
          };
          setSeed(parsed.seed ?? 0);
          setMistakesLeft(parsed.mistakesLeft ?? 4);
          setSolved(parsed.solved ?? []);
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

    setMistakesLeft((m) => Math.max(0, m - 1));
    setMessage(oneAway ? "One away…" : "Nope.");
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
    const payload = { seed, mistakesLeft, solved };
    localStorage.setItem(getStateKeyForDate(puzzle.date), JSON.stringify(payload));
  }, [puzzle, seed, mistakesLeft, solved]);

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
      <main className="min-h-screen bg-white text-neutral-900">
        <div className="mx-auto max-w-xl px-4 py-8">
          <header className="mb-6 flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {formatFullDate(puzzle.date)}
              </h1>
              <div className="text-xs text-neutral-500">{puzzle.date}</div>
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
                  key={word}
                  onClick={() => toggleWord(word)}
                  className={[
                    "rounded-2xl border px-2 py-4 text-xs font-semibold tracking-wide",
                    "transition",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400",
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
              <div className="mt-2 text-neutral-600">
                Add more puzzles in <code className="px-1">src/data/puzzles.ts</code>.
              </div>
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
      </main>
    </DisclaimerGate>
  );
}