import { NextResponse } from "next/server";

// Public endpoint - returns current bonus rate for display on frontend
export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ rate: 10 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const res = await pool.query("SELECT key, value FROM settings WHERE key IN ('airtime_rate', 'service_status')");
    await pool.end();

    let rate = 10;
    let status = "active";

    for (const row of res.rows) {
      if (row.key === "airtime_rate") rate = parseFloat(row.value);
      if (row.key === "service_status") status = row.value;
    }

    return NextResponse.json({ rate, status });
  } catch {
    return NextResponse.json({ rate: 10, status: "active" });
  }
}
