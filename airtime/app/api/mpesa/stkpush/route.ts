import { NextResponse } from "next/server";
import axios from "axios";

// Get M-Pesa access token
async function getMpesaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

export async function POST(req: Request) {
  try {
    const { phone, amount } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json({ success: false, error: "Phone and amount are required." }, { status: 400 });
    }

    const token = await getMpesaToken();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const callbackUrl = process.env.MPESA_CALLBACK_URL!;

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "EchoAirtime",
      TransactionDesc: "Airtime Purchase",
    };

    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      body,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { CheckoutRequestID, ResponseCode } = stkRes.data;

    if (ResponseCode !== "0") {
      return NextResponse.json({ success: false, error: "STK push failed." }, { status: 400 });
    }

    // Store pending transaction in DB
    await storePendingTransaction(phone, amount, CheckoutRequestID);

    return NextResponse.json({ success: true, CheckoutRequestID });
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.error("[MPESA STK]", error.response?.data || error.message);
    return NextResponse.json({ success: false, error: "Failed to initiate payment." }, { status: 500 });
  }
}

async function storePendingTransaction(phone: string, amount: number, checkoutId: string) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pool.query(
      "INSERT INTO transactions (phone, amount, airtime_amount, status, checkout_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
      [phone, amount, 0, "pending", checkoutId]
    );
    await pool.end();
  } catch (e) { console.error("[DB]", e); }
}
