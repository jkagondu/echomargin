import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

function verifyUserToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET || "echomargin_secret_change_this") as { userId: number, phone: string };
  } catch { return null; }
}

export async function GET(req: Request) {
  const tokenData = verifyUserToken(req);
  if (!tokenData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    const userRes = await pool.query("SELECT referral_code, wallet_balance FROM users WHERE id = $1", [tokenData.userId]);
    
    // Get total referrals (transactions where this code was used)
    const referralCode = userRes.rows[0]?.referral_code;
    const statsRes = await pool.query(`
      SELECT COUNT(*) as total_referrals, SUM(amount) as total_volume 
      FROM transactions 
      WHERE referral_code_used = $1 AND status = 'success'
    `, [referralCode]);

    await pool.end();

    if (userRes.rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      user: {
        referral_code: referralCode,
        wallet_balance: parseFloat(userRes.rows[0].wallet_balance),
        total_referrals: parseInt(statsRes.rows[0].total_referrals) || 0,
        total_volume: parseFloat(statsRes.rows[0].total_volume) || 0,
      }
    });
  } catch (e) {
    console.error("[DASHBOARD]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
