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

export async function GET(req: Request) {
  if (!verifyToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ transactions: [] });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const res = await pool.query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200");
    await pool.end();

    return NextResponse.json({ transactions: res.rows });
  } catch (e) {
    console.error("[TX LIST]", e);
    return NextResponse.json({ transactions: [] });
  }
}
