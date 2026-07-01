import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();

    if (!phone || phone.length < 9 || !password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Invalid phone or password (min 6 chars)." }, { status: 400 });
    }

    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ success: false, error: "No database." }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE phone = $1", [formattedPhone]);
    if (userCheck.rows.length > 0) {
      await pool.end();
      return NextResponse.json({ success: false, error: "Phone number already registered." }, { status: 400 });
    }

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const refCode = "ECHO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const insertRes = await pool.query(
      "INSERT INTO users (phone, password_hash, referral_code) VALUES ($1, $2, $3) RETURNING id, referral_code, wallet_balance",
      [formattedPhone, hash, refCode]
    );

    await pool.end();

    const user = insertRes.rows[0];
    const token = jwt.sign(
      { userId: user.id, phone: formattedPhone, role: "user" },
      process.env.JWT_SECRET || "echomargin_secret_change_this",
      { expiresIn: "7d" }
    );

    return NextResponse.json({ success: true, token, user });
  } catch (err) {
    console.error("[REGISTER]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
