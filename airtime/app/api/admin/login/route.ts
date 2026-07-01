import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@echomargin.com";
    const adminHash = process.env.ADMIN_PASSWORD_HASH || "";

    if (email !== adminEmail) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    // If no hash set, use default password "admin123" for first run
    let valid = false;
    if (!adminHash) {
      valid = password === "admin123";
    } else {
      valid = await bcrypt.compare(password, adminHash);
    }

    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    const token = jwt.sign(
      { email, role: "admin" },
      process.env.JWT_SECRET || "echomargin_secret_change_this",
      { expiresIn: "24h" }
    );

    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error("[ADMIN LOGIN]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
