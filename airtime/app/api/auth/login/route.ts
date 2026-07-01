import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ success: false, error: "No database." }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    const userRes = await pool.query("SELECT * FROM users WHERE phone = $1", [formattedPhone]);
    await pool.end();

    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: "user" },
      process.env.JWT_SECRET || "echomargin_secret_change_this",
      { expiresIn: "7d" }
    );

    return NextResponse.json({ 
      success: true, 
      token, 
      user: { id: user.id, phone: user.phone, referral_code: user.referral_code, wallet_balance: parseFloat(user.wallet_balance) } 
    });
  } catch (err) {
    console.error("[LOGIN]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
