import { NextResponse } from "next/server";

export async function GET() {
  try {
    const adminPhone = process.env.ADMIN_PHONE;
    if (!adminPhone) {
      return NextResponse.json({ success: false, error: "ADMIN_PHONE is not set in Railway variables." });
    }

    const AfricasTalking = (await import("africastalking")).default;
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY!,
      username: process.env.AT_USERNAME!,
    });
    
    const formattedPhone = `+${adminPhone.replace(/^0/, "254").replace(/^\+/, "")}`;

    await at.SMS.send({
      to: [formattedPhone],
      message: `🚨 ECHO AIRTIME TEST: This is a test message to confirm your Low Balance Alerts are working!`,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Test SMS successfully sent to ${formattedPhone}! Check your phone (or the AT Simulator if using sandbox keys).` 
    });
  } catch (e) {
    console.error("[SMS TEST ERROR]", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
