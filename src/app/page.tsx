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

function WordTile({
  word,
  disabled,
  selected,
  onClick,
  bounceKey = 0,
  withLayoutId = true,
}: {
  word: string;
  disabled: boolean;
  selected: boolean;
  onClick?: () => void;
  bounceKey?: number;
  withLayoutId?: boolean;
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
    <motion.div layout="position" layoutId={withLayoutId ? `tile-${word}` : undefined}>
      <motion.button
        layout={false} // IMPORTANT: don’t let layout interfere with shaker
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

export default function HomePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealMode, setRevealMode] = useState(false);
  const [revealGroupIndex, setRevealGroupIndex] = useState(0);
  const [revealStepInGroup, setRevealStepInGroup] = useState(0); // 0..4
  const [revealedGroups, setRevealedGroups] = useState<SolvedGroup[]>([]);
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
  
  const isGameOver = mistakesLeft === 0 || solved.length === 4;

  const didWin = solved.length === 4;
  const dateSeed = puzzle ? seedFromDate(puzzle.date) : 0;
  const gridShake = useAnimationControls();
  const [oneAwayPulse, setOneAwayPulse] = useState(0);
  const isLoss = isGameOver && !didWin;
  const showGrid = !isGameOver || revealMode; 

  const finalSolutionRows = useMemo(() => {
  if (!puzzle) return [];
    // Always puzzle order (NYT style)
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
    puzzle && revealMode ? groupsToReveal[revealGroupIndex] : null;

  const activeRevealWords =
    activeRevealGroup && revealMode
      ? activeRevealGroup.words.slice(0, revealStepInGroup).map(String)
      : [];

  const boardRows = useMemo(() => {
    if (revealMode) return [...solved, ...revealedGroups];
    if (isLoss) return finalSolutionRows; // after reveal completes, show full solution
    return solved;
  }, [revealMode, solved, revealedGroups, isLoss, finalSolutionRows]);

  useEffect(() => {
    if (!puzzle) return;
    if (!isLoss) return;

    // prevent reruns if user refreshes after losing (optional)
    const key = `baylordle_board_reveal_done_${puzzle.date}`;
    if (localStorage.getItem(key) === "true") return;
    localStorage.setItem(key, "true");

    setRevealMode(true);
    setRevealGroupIndex(0);
    setRevealStepInGroup(0);
    setRevealedGroups([]);
  }, [puzzle, isLoss]);
  
  useEffect(() => {
    if (!puzzle) return;
    if (!revealMode) return;

    // finished all groups -> stop reveal after a beat
    if (revealGroupIndex >= groupsToReveal.length) {
      const t = setTimeout(() => {
        setRevealMode(false);
      }, 800);
      return () => clearTimeout(t);
    }

    // step tiles 1..4 into the row
    if (revealStepInGroup < 4) {
      const t = setTimeout(() => {
        setRevealStepInGroup((s) => s + 1);
      }, 320);
      return () => clearTimeout(t);
    }

    // row complete -> lock it into revealedGroups with color, then next group
    const t = setTimeout(() => {
      const g = groupsToReveal[revealGroupIndex];
      setRevealedGroups((prev) => [
        ...prev,
        { id: g.id, title: g.title, color: g.color, words: [...g.words] },
      ]);
      setRevealGroupIndex((i) => i + 1);
      setRevealStepInGroup(0);
    }, 650);

    return () => clearTimeout(t);
  }, [puzzle, revealMode, revealGroupIndex, revealStepInGroup, groupsToReveal]);

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
    if (lockedOut || isGameOver || revealMode) return;
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
      gridShake.stop();
      gridShake.set({ x: 0, y: 0, scale: 1 });
      gridShake.start({
        y: [0, -8, 0],
        transition: { duration: 0.28, ease: "easeOut" },
      });

      // optional: makes selected tiles “pop” again
      setOneAwayPulse((p) => p + 1);
    } else {
      gridShake.stop();
      gridShake.set({ x: 0, y: 0, scale: 1 });
      gridShake.start({
        x: [-10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.32 },
      });
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

          <div className="mb-4 space-y-2">
            {boardRows.map((g) => (
              <div
                key={g.id}
                className={`rounded-2xl p-3 ${COLOR_CLASS[g.color]} border border-neutral-200`}
              >
                <div className="text-xs font-semibold tracking-wide">{g.title}</div>
                <div className="mt-1 text-sm text-neutral-800">{g.words.join(" · ")}</div>
              </div>
            ))}
          </div>

          {revealMode && activeRevealGroup && (
            <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-2">
              <div className="grid grid-cols-4 gap-2">
                {activeRevealWords.map((w) => (
                  <WordTile key={w} word={w} selected={false} disabled={true} />
                ))}
              </div>
            </div>
          )}
          {showGrid && (
            <LayoutGroup>
              <motion.div animate={gridShake} className="grid grid-cols-4 gap-2">
                {remainingWords.map((word) => {
                  const isSelected = selected.includes(word);
                  const isMovingNow = revealMode && activeRevealWords.includes(word);
                  return (
                    <div key={word} className="relative">
                      {/* base tile that stays in the grid (NO layoutId) */}
                      <WordTile
                        word={word}
                        selected={isSelected}
                        bounceKey={isSelected ? oneAwayPulse : 0}
                        disabled={lockedOut || isGameOver || revealMode}
                        onClick={() => toggleWord(word)}
                        withLayoutId={false}
                      />

                      {/* proxy tile that flies up (HAS layoutId), only visible when active */}
                      {revealMode && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ opacity: isMovingNow ? 1 : 0 }}
                        >
                          <WordTile
                            word={word}
                            selected={false}
                            disabled={true}
                            withLayoutId
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </LayoutGroup>
          )}

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
        <CurryCongrats
          show={isGameOver && !revealMode}
          didWin={didWin}
          dateSeed={dateSeed}
          dateStr={puzzle.date}
        />
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
