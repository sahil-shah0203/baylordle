import { NextResponse } from "next/server";
import { google } from "googleapis";

type Color = "yellow" | "green" | "blue" | "purple";

function isoTodayChicago() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET() {
  try {
    const spreadsheetId = requireEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
    const client_email = requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const private_key = requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: client_email,
      key: private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const today = isoTodayChicago();

    // rows: [date, color, title, w1, w2, w3, w4]
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Puzzles!A2:G",
    });

    const values = res.data.values ?? [];
    const rowsForDate = values.filter((r) => (r?.[0] ?? "") === today);

    if (rowsForDate.length < 4) {
      return NextResponse.json(
        { error: `No (or incomplete) puzzle found for ${today}. Need 4 rows in Puzzles tab.` },
        { status: 404 }
      );
    }

    const groups = rowsForDate.slice(0, 4).map((r, idx) => {
      const color = String(r[1] ?? "").toLowerCase() as Color;
      const title = String(r[2] ?? "").trim();
      const words = [r[3], r[4], r[5], r[6]].map((x) => String(x ?? "").trim()) as [
        string,
        string,
        string,
        string
      ];

      return {
        id: `${color[0]}${idx + 1}`,
        title,
        color,
        words,
      };
    });

    return NextResponse.json({ puzzle: { date: today, groups } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
