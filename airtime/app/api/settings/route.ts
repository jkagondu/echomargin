import { NextResponse } from "next/server";

// Public endpoint - returns current bonus rate for display on frontend
export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ rate: 10 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const res = await pool.query("SELECT value FROM settings WHERE key = 'airtime_rate' LIMIT 1");
    await pool.end();

    const rate = res.rows[0] ? parseFloat(res.rows[0].value) : 10;
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ rate: 10 });
  }
}
