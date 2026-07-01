import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

function verifyUserToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET || "echomargin_secret_change_this") as { userId: number, phone: string };
  } catch { return null; }
}

export async function POST(req: Request) {
  const tokenData = verifyUserToken(req);
  if (!tokenData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    // Fetch user and check balance
    const userRes = await pool.query("SELECT wallet_balance, phone FROM users WHERE id = $1", [tokenData.userId]);
    if (userRes.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const walletBalance = parseFloat(userRes.rows[0].wallet_balance);
    const phone = userRes.rows[0].phone;

    if (walletBalance < 10) {
      await pool.end();
      return NextResponse.json({ success: false, error: "Minimum withdrawal is KES 10" }, { status: 400 });
    }

    // Deduct from wallet immediately
    await pool.query("UPDATE users SET wallet_balance = 0 WHERE id = $1", [tokenData.userId]);
    await pool.end();

    // Send airtime via Africa's Talking
    const AfricasTalking = (await import("africastalking")).default;
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY!,
      username: process.env.AT_USERNAME!,
    });
    
    await at.AIRTIME.send({
      recipients: [{ phoneNumber: `+${phone}`, currencyCode: "KES", amount: walletBalance }],
    });

    return NextResponse.json({ success: true, amount: walletBalance });
  } catch (e) {
    console.error("[WITHDRAW]", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
