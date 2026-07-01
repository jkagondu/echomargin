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
    if (!dbUrl) return NextResponse.json({ stats: { total_transactions: 0, total_revenue: 0, total_airtime_sent: 0, success_rate: 0, today_transactions: 0, today_revenue: 0 } });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    const [totalRes, successRes, todayRes] = await Promise.all([
      pool.query("SELECT COUNT(*) as count, SUM(amount) as revenue, SUM(airtime_amount) as airtime FROM transactions"),
      pool.query("SELECT COUNT(*) as count FROM transactions WHERE status = 'success'"),
      pool.query("SELECT COUNT(*) as count, SUM(amount) as revenue FROM transactions WHERE status = 'success' AND DATE(created_at) = CURRENT_DATE"),
    ]);

    await pool.end();

    const total = totalRes.rows[0];
    const success = successRes.rows[0];
    const today = todayRes.rows[0];

    return NextResponse.json({
      stats: {
        total_transactions: parseInt(total.count) || 0,
        total_revenue: parseFloat(total.revenue) || 0,
        total_airtime_sent: parseFloat(total.airtime) || 0,
        success_rate: total.count > 0 ? (parseInt(success.count) / parseInt(total.count)) * 100 : 0,
        today_transactions: parseInt(today.count) || 0,
        today_revenue: parseFloat(today.revenue) || 0,
      }
    });
  } catch (e) {
    console.error("[STATS]", e);
    return NextResponse.json({ stats: {} });
  }
}
