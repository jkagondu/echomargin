import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get("ref");

    if (!ref) return NextResponse.json({ status: "failed", message: "No reference provided." });

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ status: "pending" });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const res = await pool.query(
      "SELECT status, failure_reason FROM transactions WHERE checkout_id = $1 LIMIT 1",
      [ref]
    );
    await pool.end();

    if (!res.rows[0]) return NextResponse.json({ status: "pending" });

    const { status, failure_reason } = res.rows[0];
    return NextResponse.json({ status, message: failure_reason || "" });
  } catch {
    return NextResponse.json({ status: "pending" });
  }
}
