import { NextResponse } from "next/server";
import { PUZZLES } from "@/data/puzzles";

function isoTodayChicago() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
}

export async function GET() {
  const today = isoTodayChicago();
  const puzzle = PUZZLES.find((p) => p.date === today) ?? PUZZLES[PUZZLES.length - 1];
  return NextResponse.json({ puzzle });
}
