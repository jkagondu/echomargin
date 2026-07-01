import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

function verifyToken(req: Request): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET || "echomargin_secret_change_this");
    return true;
  } catch { return false; }
}

// Save rate to DB
export async function POST(req: Request) {
  if (!verifyToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rate } = await req.json();
    if (typeof rate !== "number" || rate < 0 || rate > 50) {
      return NextResponse.json({ success: false, error: "Rate must be between 0 and 50." }, { status: 400 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ success: false, error: "No database." }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('airtime_rate', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [String(rate)]
    );
    await pool.end();

    return NextResponse.json({ success: true, rate });
  } catch (e) {
    console.error("[SAVE RATE]", e);
    return NextResponse.json({ success: false, error: "Failed to save rate." }, { status: 500 });
  }
}
