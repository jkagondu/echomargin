"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const PRESETS = [20, 50, 100, 200, 500, 1000];

type Step = "idle" | "processing" | "waiting" | "success" | "failed";

export default function HomePage() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [rate, setRate] = useState(10); // Default bonus %, loaded from admin settings
  const [serviceStatus, setServiceStatus] = useState("active");
  const [error, setError] = useState("");
  const [txRef, setTxRef] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const selectedAmount = amount ?? (customAmount ? parseFloat(customAmount) : null);
  const airtimeAmount = selectedAmount ? selectedAmount * (1 + rate / 100) : null;

  // Fetch current rate from admin settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { 
        if (d.rate) setRate(d.rate); 
        if (d.status) setServiceStatus(d.status);
      })
      .catch(() => {});
  }, []);

  // Poll payment status after STK push
  useEffect(() => {
    if (step !== "waiting" || !txRef) return;
    if (pollCount > 24) { setStep("failed"); setError("Payment timeout. Please try again."); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mpesa/status?ref=${txRef}`);
        const data = await res.json();
        if (data.status === "success") setStep("success");
        else if (data.status === "failed") { setStep("failed"); setError(data.message || "Payment failed."); }
        else setPollCount((c) => c + 1);
      } catch { setPollCount((c) => c + 1); }
    }, 5000);
    return () => clearTimeout(timer);
  }, [step, txRef, pollCount]);

  const handleBuy = async () => {
    setError("");
    if (serviceStatus === "paused") { setError("Service is temporarily paused for maintenance."); return; }
    if (!phone || phone.length < 9) { setError("Please enter a valid phone number."); return; }
    if (!selectedAmount || selectedAmount < 10) { setError("Minimum purchase is KES 10."); return; }
    if (selectedAmount > 10000) { setError("Maximum purchase is KES 10,000."); return; }
    setStep("processing");
    try {
      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/^0/, "254").replace(/^\+/, ""), amount: selectedAmount }),
      });
      const data = await res.json();
      if (data.success) { setTxRef(data.CheckoutRequestID); setStep("waiting"); setPollCount(0); }
      else { setStep("failed"); setError(data.error || "Failed to initiate payment."); }
    } catch { setStep("failed"); setError("Network error. Please try again."); }
  };

  const reset = () => { setStep("idle"); setError(""); setPhone(""); setAmount(null); setCustomAmount(""); setTxRef(""); };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-green-600/10 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-green-700/8 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full bg-green-900/6 blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-green-900/30 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zm0 10L2 12l10 5 10-5-10-5z" />
            </svg>
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight">Echo<span className="text-gradient-green">Margin</span></span>
            <span className="block text-[9px] text-green-500/70 font-bold uppercase tracking-widest -mt-0.5">Airtime</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#how" className="hidden sm:block text-zinc-400 hover:text-white text-sm font-medium transition-colors">How it works</a>
          <a href="#faq" className="hidden sm:block text-zinc-400 hover:text-white text-sm font-medium transition-colors">FAQ</a>
          <Link href="/admin" className="px-4 py-2 rounded-xl border border-green-700/40 text-green-400 text-xs font-bold hover:bg-green-900/20 transition-all hover:border-green-600/60 uppercase tracking-wider">
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
        {/* Hero Text */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Powered by M-Pesa · Instant Delivery
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight mb-4">
            Top Up Airtime.{" "}
            <span className="text-gradient-green block sm:inline">Get More, Always.</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
            Pay via M-Pesa and receive{" "}
            <span className="text-green-400 font-bold">{rate}% bonus airtime</span> directly to any Safaricom number. Fast, secure, 24/7.
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md animate-slide-up stagger-2">
          <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            {/* Card top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-60" />

            {/* Rate Badge */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Buy Airtime</h2>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-extrabold">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                +{rate}% Bonus
              </div>
            </div>

            {step === "success" ? (
              <div className="text-center py-8 animate-slide-up">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-5 green-glow">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Airtime Sent! 🎉</h3>
                <p className="text-zinc-400 text-sm mb-1">KES <span className="text-white font-bold">{airtimeAmount?.toFixed(0)}</span> airtime sent to</p>
                <p className="text-green-400 font-bold text-lg mb-6">{phone}</p>
                <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 mb-6 text-sm text-left space-y-1.5">
                  <div className="flex justify-between"><span className="text-zinc-400">Paid</span><span className="text-white font-bold">KES {selectedAmount}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Airtime Received</span><span className="text-green-400 font-bold">KES {airtimeAmount?.toFixed(0)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Bonus</span><span className="text-green-300 font-bold">+{rate}%</span></div>
                </div>
                <button onClick={reset} className="btn-primary w-full py-4 rounded-2xl text-white font-bold text-base">Buy More Airtime</button>
              </div>
            ) : step === "waiting" ? (
              <div className="text-center py-8 animate-slide-up">
                <div className="w-20 h-20 rounded-full border-4 border-green-900 border-t-green-400 animate-spin mx-auto mb-5" />
                <h3 className="text-xl font-bold text-white mb-2">Check Your Phone</h3>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto">An M-Pesa STK push prompt has been sent to <span className="text-white font-bold">{phone}</span>. Enter your PIN to complete.</p>
                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  Waiting for confirmation...
                </div>
                <button onClick={() => setStep("idle")} className="mt-6 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
              </div>
            ) : step === "processing" ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full border-4 border-green-900 border-t-green-400 animate-spin mx-auto mb-5" />
                <p className="text-zinc-300 font-medium">Initiating STK Push...</p>
              </div>
            ) : (
              <>
                {/* Phone Number */}
                <div className="mb-5">
                  <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Recipient Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">🇰🇪</span>
                    <input
                      type="tel"
                      className="input-field w-full pl-12 pr-4 py-4 rounded-2xl text-base font-medium placeholder:text-zinc-600"
                      placeholder="07XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      maxLength={12}
                    />
                  </div>
                </div>

                {/* Preset Amounts */}
                <div className="mb-5">
                  <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-3">Select Amount (KES)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setAmount(p); setCustomAmount(""); }}
                        className={`amount-btn rounded-xl py-3 text-center cursor-pointer font-bold text-sm ${amount === p ? "active" : "text-zinc-300"}`}
                      >
                        <div className="text-base">{p}</div>
                        <div className="text-[9px] text-zinc-500 font-normal">KES</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="number"
                      className="input-field w-full px-4 py-3 rounded-xl text-sm font-medium placeholder:text-zinc-600"
                      placeholder="Or enter custom amount..."
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                      min={10}
                      max={10000}
                    />
                  </div>
                </div>

                {/* Summary */}
                {selectedAmount && selectedAmount >= 10 && (
                  <div className="mb-5 p-4 rounded-2xl bg-green-900/15 border border-green-800/30 text-sm">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-zinc-400">You Pay</span>
                      <span className="text-white font-bold">KES {selectedAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-zinc-400">Bonus ({rate}%)</span>
                      <span className="text-green-400 font-bold">+ KES {(selectedAmount * rate / 100).toFixed(0)}</span>
                    </div>
                    <div className="border-t border-green-800/30 pt-1.5 flex justify-between">
                      <span className="text-zinc-300 font-semibold">Airtime Received</span>
                      <span className="text-green-300 font-extrabold">KES {airtimeAmount?.toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={!phone || !selectedAmount || serviceStatus === "paused"}
                  className="btn-primary w-full py-4 rounded-2xl text-white font-extrabold text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="flex items-center justify-center gap-2">
                    {serviceStatus === "paused" ? "Service Paused" : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Pay with M-Pesa
                      </>
                    )}
                  </span>
                </button>

                <p className="text-center text-[10px] text-zinc-600 mt-4 font-medium">
                  🔒 Secured by Safaricom M-Pesa · Instant delivery guaranteed
                </p>
              </>
            )}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-md animate-slide-up stagger-3">
          {[
            { icon: "⚡", label: "Instant Delivery", sub: "Under 30 seconds" },
            { icon: "🔒", label: "Secure Payment", sub: "M-Pesa Encrypted" },
            { icon: "🎧", label: "24/7 Support", sub: "Always available" },
          ].map((b) => (
            <div key={b.label} className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="text-white text-xs font-bold">{b.label}</div>
              <div className="text-zinc-500 text-[9px] mt-0.5">{b.sub}</div>
            </div>
          ))}
        </div>

        {/* How it Works */}
        <section id="how" className="mt-20 w-full max-w-2xl animate-slide-up stagger-4">
          <h2 className="text-2xl font-black text-center text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Enter Details", desc: "Input recipient phone number and select the amount to purchase." },
              { step: "02", title: "Pay via M-Pesa", desc: "Receive an STK push prompt on your phone. Enter your M-Pesa PIN to confirm." },
              { step: "03", title: "Get Airtime", desc: "Airtime is instantly delivered to the recipient with your bonus included." },
            ].map((s) => (
              <div key={s.step} className="glass-card rounded-2xl p-5 relative overflow-hidden">
                <div className="text-4xl font-black text-green-900/60 absolute top-3 right-4">{s.step}</div>
                <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-600/30 flex items-center justify-center text-green-400 font-black text-sm mb-3">{s.step}</div>
                <h3 className="text-white font-bold text-sm mb-1.5">{s.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-16 w-full max-w-lg animate-slide-up stagger-5">
          <h2 className="text-2xl font-black text-center text-white mb-8">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "How long does delivery take?", a: "Airtime is delivered within 30 seconds of payment confirmation." },
              { q: "What networks are supported?", a: "Currently we support Safaricom. More networks coming soon." },
              { q: "What if my payment fails?", a: "If the M-Pesa payment is deducted but airtime not received, contact support immediately for a refund." },
              { q: "Is there a minimum purchase?", a: "The minimum purchase is KES 10 and the maximum is KES 10,000 per transaction." },
            ].map((f, i) => (
              <details key={i} className="glass-card rounded-2xl p-5 cursor-pointer group">
                <summary className="text-white font-semibold text-sm flex justify-between items-center list-none">
                  {f.q}
                  <span className="text-green-500 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-green-900/30 py-8 px-4 text-center mt-16">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zm0 10L2 12l10 5 10-5-10-5z" />
            </svg>
          </div>
          <span className="font-black text-white text-sm">Echo<span className="text-gradient-green">Margin</span> Airtime</span>
        </div>
        <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} EchoMargin. All rights reserved. Not affiliated with Safaricom PLC.</p>
        <p className="text-zinc-700 text-[10px] mt-1">M-Pesa is a registered trademark of Safaricom PLC.</p>
      </footer>
    </div>
  );
}
