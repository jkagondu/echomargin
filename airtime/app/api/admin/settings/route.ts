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
    const { rate, status } = await req.json();
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ success: false, error: "No database." }, { status: 500 });
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    if (rate !== undefined) {
      if (typeof rate !== "number" || rate < 0 || rate > 50) {
        await pool.end();
        return NextResponse.json({ success: false, error: "Rate must be between 0 and 50." }, { status: 400 });
      }
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('airtime_rate', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [String(rate)]
      );
    }

    if (status !== undefined) {
      if (status !== "active" && status !== "paused") {
        await pool.end();
        return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
      }
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('service_status', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [status]
      );
    }

    await pool.end();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[SAVE RATE]", e);
    return NextResponse.json({ success: false, error: "Failed to save rate." }, { status: 500 });
  }
}
