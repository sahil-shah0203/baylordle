"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateDeviceId, getPlayedKeyForDate } from "@/lib/device";
import DisclaimerGate from "@/components/DisclaimerGate";
import Image from "next/image";
import { LayoutGroup, motion, useAnimationControls } from "framer-motion";

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

type PlayerStats = {
  totalPlayed: number;
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  totalMistakesUsed: number;
  totalSeconds: number;
};

const STATS_KEY = "baylordle_player_stats_v1";

function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return {
        totalPlayed: 0,
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalMistakesUsed: 0,
        totalSeconds: 0,
      };
    }
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return {
      totalPlayed: 0,
      totalCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalMistakesUsed: 0,
      totalSeconds: 0,
    };
  }
}

function WordTile({
  word,
  disabled,
  selected,
  onClick,
  bounceKey = 0,
}: {
  word: string;
  disabled: boolean;
  selected: boolean;
  onClick?: () => void;
  bounceKey?: number;
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (!selected) return;

    if (bounceKey > 0) {
      controls.start({
        scale: [1, 1.06, 1],
        transition: { duration: 0.22 },
      });
    }
  }, [bounceKey, selected, controls]);

  return (
    <motion.div layout="position" layoutId={`tile-${word}`}>
      <motion.button
        layout={false}                  // <— important: don’t let layout touch the shaker
        onClick={onClick}
        disabled={disabled}
        animate={controls}
        className={[
          "w-full rounded-2xl border px-2 py-4 text-xs font-semibold tracking-wide",
          "transition",
          selected
            ? "bg-neutral-900 text-white border-neutral-900"
            : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {word}
      </motion.button>
    </motion.div>
  );
}

function saveStats(s: PlayerStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string) {
  // a/b are YYYY-MM-DD (treat as UTC midnight to avoid tz drift)
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

function getDebriefDismissKey(dateStr: string) {
  return `baylordle_debrief_dismissed_${dateStr}`;
}

function DebriefModal({
  open,
  onClose,
  puzzleDate,
  didWin,
  seconds,
  mistakesLeft,
  stats,
  copied,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  puzzleDate: string;
  didWin: boolean;
  seconds: number;
  mistakesLeft: number;
  stats: PlayerStats | null;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!open) return null;

  const imgSrc = didWin ? "/currywin.png" : "/currylose.png";
  const mistakesUsed = 4 - mistakesLeft;

  const completionPct = stats
    ? Math.round((stats.totalCompleted / Math.max(1, stats.totalPlayed)) * 100)
    : null;

  const avgMistakes = stats
    ? (stats.totalMistakesUsed / Math.max(1, stats.totalPlayed)).toFixed(1)
    : null;

  const avgTime = stats
    ? formatDuration(stats.totalSeconds / Math.max(1, stats.totalPlayed))
    : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/20"
        aria-label="Close"
        onClick={onClose}
        type="button"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white shadow-xl overflow-hidden relative">
          {/* close */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white/90 text-neutral-800 border border-neutral-200 hover:bg-white flex items-center justify-center z-10"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>

          {/* header image */}
          <div className="relative h-[180px] w-full">
            <Image
              src={imgSrc}
              alt="Stephen Curry"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute left-4 bottom-3 text-white">
              <div className="text-lg font-semibold">
                {didWin ? "Daily Debrief ✅" : "Daily Debrief"}
              </div>
              <div className="text-xs opacity-90">{puzzleDate}</div>
            </div>
          </div>

          {/* body */}
          <div className="p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Time
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatDuration(seconds)}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Mistakes
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {mistakesUsed} / 4
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Completion
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {completionPct !== null ? `${completionPct}%` : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Games Played
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {stats ? stats.totalPlayed : "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Current Streak
                </div>
                <div className="mt-1 text-base font-semibold">
                  {stats ? stats.currentStreak : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Longest Streak
                </div>
                <div className="mt-1 text-base font-semibold">
                  {stats ? stats.longestStreak : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Avg Mistakes
                </div>
                <div className="mt-1 text-base font-semibold">
                  {avgMistakes ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Avg Time
                </div>
                <div className="mt-1 text-base font-semibold">
                  {avgTime ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Result
                </div>
                <div className="mt-1 text-base font-semibold">
                  {didWin ? "Completed" : "Not completed"}
                </div>
              </div>
            </div>

            <button
              onClick={onCopy}
              className="mt-4 w-full rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              {copied ? "Copied!" : "Copy results"}
            </button>

            <div className="mt-2 text-center text-xs text-neutral-500">
              Share today's results to your friends!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default function HomePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalSeconds, setFinalSeconds] = useState<number | null>(null);
  const [seed, setSeed] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(4);
  const [solved, setSolved] = useState<SolvedGroup[]>([]);
  const [message, setMessage] = useState("");
  const [lockedOut, setLockedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guessedSets, setGuessedSets] = useState<string[]>([]);
  const [easterClicks, setEasterClicks] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const isGameOver = mistakesLeft === 0 || solved.length === 4;
  const [revealMode, setRevealMode] = useState(false);
  const [revealGroupIndex, setRevealGroupIndex] = useState(0);
  const [revealStepInGroup, setRevealStepInGroup] = useState(0); // 0..4
  const [revealedGroups, setRevealedGroups] = useState<SolvedGroup[]>([]);
  const didWin = solved.length === 4;
  const isLoss = isGameOver && !didWin;
  const [oneAwayPulse, setOneAwayPulse] = useState(0);
  const gridShake = useAnimationControls();
  
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

  useEffect(() => {
    if (!puzzle) return;

    // load stats once per session (client-side only)
    setStats(loadStats());

    // start timer
    const startedAt = Date.now();
    let raf: number | null = null;

    const tick = () => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setSecondsElapsed(secs);
      raf = window.setTimeout(tick, 250);
    };

    tick();

    return () => {
      if (raf) window.clearTimeout(raf);
    };
  }, [puzzle]);

  useEffect(() => {
    if (!puzzle) return;
    if (!isGameOver) return;

    // prevent double-counting if effect re-runs
    const doneKey = `baylordle_stats_recorded_${puzzle.date}`;
    if (localStorage.getItem(doneKey) === "true") return;

    const mistakesUsed = 4 - mistakesLeft;
    const didWin = solved.length === 4;

    const prev = loadStats();
    const next: PlayerStats = { ...prev };

    next.totalPlayed += 1;
    next.totalMistakesUsed += mistakesUsed;
    next.totalSeconds += secondsElapsed;

    if (didWin) {
      next.totalCompleted += 1;

      if (!prev.lastCompletedDate) {
        next.currentStreak = 1;
      } else {
        const diff = daysBetween(prev.lastCompletedDate, puzzle.date);
        next.currentStreak = diff === 1 ? prev.currentStreak + 1 : 1;
      }

      next.longestStreak = Math.max(next.longestStreak, next.currentStreak);
      next.lastCompletedDate = puzzle.date;
    } else {
      // losing breaks the streak
      next.currentStreak = 0;
    }

    saveStats(next);
    setStats(next);
    localStorage.setItem(doneKey, "true");
  }, [puzzle, isGameOver, mistakesLeft, solved.length, secondsElapsed]);
  
  useEffect(() => {
    if (!puzzle) return;
    if (!isGameOver) return;
    if (finalSeconds !== null) return; // already locked
    setFinalSeconds(secondsElapsed);
  }, [puzzle, isGameOver, finalSeconds, secondsElapsed]);

  useEffect(() => {
    if (!puzzle) return;
    if (!isGameOver) return;

    // If loss: board reveal will open the modal AFTER animation finishes
    if (!didWin) return;

    const dismissed =
      localStorage.getItem(getDebriefDismissKey(puzzle.date)) === "true";
    if (!dismissed) setDebriefOpen(true);
  }, [puzzle, isGameOver, didWin]);

  useEffect(() => {
    if (!puzzle) return;
    if (!isLoss) return;

    // prevent reruns on refresh for same date if you want:
    const key = `baylordle_board_reveal_done_${puzzle.date}`;
    if (localStorage.getItem(key) === "true") return;

    localStorage.setItem(key, "true");

    // close modal if it was open
    setDebriefOpen(false);

    // start reveal
    setRevealMode(true);
    setRevealGroupIndex(0);
    setRevealStepInGroup(0);
    setRevealedGroups([]);
  }, [puzzle, isLoss]);

  useEffect(() => {
    if (!puzzle) return;
    if (!revealMode) return;

    // Finished all 4 groups -> pause, then open the modal
    if (revealGroupIndex >= groupsToReveal.length) {
      const t = setTimeout(() => {
        setRevealMode(false);
        setDebriefOpen(true);
      }, 1200);
      return () => clearTimeout(t);
    }

    // Move 1 tile at a time into the active row
    if (revealStepInGroup < 4) {
      const t = setTimeout(() => {
        setRevealStepInGroup((s) => s + 1);
      }, 320);
      return () => clearTimeout(t);
    }

    // Row is complete -> lock it into revealedGroups (colored), then go next group
    const t = setTimeout(() => {
      const g = groupsToReveal[revealGroupIndex];
      setRevealedGroups((prev) => [
        ...prev,
        { id: g.id, title: g.title, color: g.color, words: [...g.words] },
      ]);
      setRevealGroupIndex((i) => i + 1);
      setRevealStepInGroup(0);
    }, 750);

    return () => clearTimeout(t);
  }, [puzzle, revealMode, revealGroupIndex, revealStepInGroup]);

  function closeDebrief() {
    if (puzzle) localStorage.setItem(getDebriefDismissKey(puzzle.date), "true");
    setDebriefOpen(false);
  }

  const finalSolutionRows = useMemo(() => {
    if (!puzzle) return [];
    // Always display rows in puzzle order at the end (NYT style)
    return puzzle.groups.map((g) => ({
      id: g.id,
      title: g.title,
      color: g.color,
      words: g.words.map(String),
    }));
  }, [puzzle]);

  const solvedIds = useMemo(() => new Set(solved.map((g) => g.id)), [solved]);

  const groupsToReveal = useMemo(() => {
    if (!puzzle) return [];
    return puzzle.groups.filter((g) => !solvedIds.has(g.id));
  }, [puzzle, solvedIds]);

  const activeRevealGroup =
  puzzle && revealMode ? puzzle.groups[revealGroupIndex] : null;

  const activeRevealWords =
    activeRevealGroup && revealMode
      ? activeRevealGroup.words.slice(0, revealStepInGroup).map(String)
      : [];

  const movedOut = useMemo(() => {
    const s = new Set<string>();
    for (const g of revealedGroups) for (const w of g.words) s.add(String(w));
    for (const w of activeRevealWords) s.add(String(w));
    return s;
  }, [revealedGroups, activeRevealWords]);

  const boardRows = useMemo(() => {
    // While reveal is running, show what we have so far + what user solved
    if (revealMode) return [...solved, ...revealedGroups];

    // After losing, ALWAYS show the full correct puzzle
    if (isGameOver && !didWin) return finalSolutionRows;

    // Win or in-progress: show user's solved
    return solved;
  }, [revealMode, solved, revealedGroups, isGameOver, didWin, finalSolutionRows]);

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

    if (oneAway) {
      setOneAwayPulse((p) => p + 1);
    } else {
      gridShake.stop(); // helps if you spam submit
      gridShake.set({ x: 0 }); // reset immediately
      gridShake.start({
        x: [-10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.32 },});
    }

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

          <LayoutGroup>
            {/* On loss reveal, show revealedGroups; otherwise show player's solved */}
            <div className="mb-4 space-y-2">
              {boardRows.map((g) => (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ scale: 0.96, opacity: 0.9 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className={`rounded-2xl p-3 ${COLOR_CLASS[g.color]} border border-neutral-200`}
                >
                  <div className="text-xs font-semibold tracking-wide">{g.title}</div>
                  <div className="mt-1 text-sm text-neutral-800">{g.words.join(" · ")}</div>
                </motion.div>
              ))}
            </div>

            {/* Active reveal row (loss only) */}
            {revealMode && activeRevealGroup && (
              <motion.div
                layout
                className="mb-4 rounded-2xl border border-neutral-200 bg-white p-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="grid grid-cols-4 gap-2">
                  {activeRevealWords.map((w) => (
                    <WordTile key={w} word={w} selected={false} disabled={true} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Grid */}
            <motion.div
              animate={gridShake}
              className="grid grid-cols-4 gap-2"
            >
              {remainingWords
                .map(String)
                .filter((w) => !movedOut.has(w))
                .map((word) => {
                  const isSelected = selected.includes(word);
                  return (
                    <WordTile
                      key={word}
                      word={word}
                      selected={isSelected}
                      bounceKey={isSelected ? oneAwayPulse : 0}
                      disabled={lockedOut || isGameOver || revealMode}
                      onClick={() => toggleWord(word)}
                    />
                  );
                })}
            </motion.div>
          </LayoutGroup>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={clear}
              className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-50"
              disabled={lockedOut || isGameOver || revealMode || selected.length === 0}
            >
              Clear
            </button>

            <div className="flex gap-2">
              <button
                onClick={shuffleNow}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-50"
                disabled={lockedOut || isGameOver || revealMode}
              >
                Shuffle
              </button>
              <button
                onClick={submit}
                className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                disabled={lockedOut || isGameOver || revealMode || selected.length !== 4}
              >
                Submit
              </button>
            </div>
          </div>

          {message && <div className="mt-3 text-center text-sm text-neutral-700">{message}</div>}
          {isGameOver && (
            <button
              onClick={() => setDebriefOpen(true)}
              className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:border-neutral-400"
            >
              View Debrief
            </button>
          )}
        </div>
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
        {puzzle && (
          <DebriefModal
            open={debriefOpen}
            onClose={closeDebrief}
            puzzleDate={puzzle.date}
            didWin={didWin}
            seconds={finalSeconds ?? secondsElapsed}
            mistakesLeft={mistakesLeft}
            stats={stats}
            copied={copied}
            onCopy={copyResults}
          />
        )}
      </main>
    </DisclaimerGate>
  );
}
