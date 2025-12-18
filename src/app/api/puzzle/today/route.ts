import { NextResponse } from "next/server";
import { PUZZLES } from "@/data/puzzles";

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  const today = isoToday();
  const puzzle = PUZZLES.find((p) => p.date === today) ?? PUZZLES[PUZZLES.length - 1];
  return NextResponse.json({ puzzle });
}
