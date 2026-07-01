import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ error: "No DB URL" }, { status: 500 });

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50);
    `);

    await pool.end();
    return NextResponse.json({ success: true, message: "Migration complete!" });
  } catch (err) {
    console.error("[MIGRATE]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
