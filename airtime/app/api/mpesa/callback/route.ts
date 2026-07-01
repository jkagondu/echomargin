import { NextResponse } from "next/server";

// M-Pesa callback - called by Safaricom after payment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { Body } = body;
    const { stkCallback } = Body;

    const checkoutId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;

    console.log("[MPESA CALLBACK]", { checkoutId, resultCode });

    if (resultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const getVal = (name: string) => metadata.find((i: { Name: string; Value: unknown }) => i.Name === name)?.Value;

      const mpesaCode = getVal("MpesaReceiptNumber") as string;
      const amount = getVal("Amount") as number;
      const phone = getVal("PhoneNumber") as string;

      // SECURITY VERIFICATION: Ensure this transaction exists and is pending
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error("No database URL");
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      
      const txCheck = await pool.query("SELECT status FROM transactions WHERE checkout_id = $1 LIMIT 1", [checkoutId]);
      
      if (txCheck.rows.length === 0) {
        await pool.end();
        console.error("[SECURITY ALERT] Received callback for unknown Checkout ID:", checkoutId);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }
      
      if (txCheck.rows[0].status !== "pending") {
        await pool.end();
        console.error("[SECURITY ALERT] Duplicate or already processed callback for:", checkoutId);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      await pool.end();

      // Get rate and calculate airtime
      const settingsRate = await getRate();
      const airtimeAmount = amount * (1 + settingsRate / 100);

      // Update transaction in DB
      await updateTransaction(checkoutId, "success", mpesaCode, phone, amount, airtimeAmount);

      // Send airtime via Africa's Talking
      await sendAirtime(String(phone), airtimeAmount);

    } else {
      // Payment failed/cancelled
      await failTransaction(checkoutId, stkCallback.ResultDesc);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("[CALLBACK ERROR]", err);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}

async function getRate(): Promise<number> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return 10;
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const res = await pool.query("SELECT value FROM settings WHERE key = 'airtime_rate' LIMIT 1");
    await pool.end();
    return res.rows[0] ? parseFloat(res.rows[0].value) : 10;
  } catch { return 10; }
}

async function updateTransaction(checkoutId: string, status: string, mpesaCode: string, phone: string, amount: number, airtimeAmount: number) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pool.query(
      "UPDATE transactions SET status = $1, mpesa_code = $2, phone = $3, amount = $4, airtime_amount = $5 WHERE checkout_id = $6",
      [status, mpesaCode, phone, amount, airtimeAmount, checkoutId]
    );
    await pool.end();
  } catch (e) { console.error("[DB UPDATE]", e); }
}

async function failTransaction(checkoutId: string, reason: string) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pool.query(
      "UPDATE transactions SET status = 'failed', failure_reason = $1 WHERE checkout_id = $2",
      [reason, checkoutId]
    );
    await pool.end();
  } catch (e) { console.error("[DB FAIL]", e); }
}

async function sendAirtime(phone: string, amount: number) {
  try {
    const AfricasTalking = (await import("africastalking")).default;
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY!,
      username: process.env.AT_USERNAME!,
    });
    const airtime = at.AIRTIME;
    await airtime.send({
      recipients: [{ phoneNumber: `+${phone}`, currencyCode: "KES", amount }],
    });
    console.log(`[AIRTIME] Sent KES ${amount} to ${phone}`);
  } catch (e) { console.error("[AIRTIME ERROR]", e); }
}
