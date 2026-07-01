"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AffiliatePage() {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [token, setToken] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("affiliate_token");
    if (t) {
      setToken(t);
      fetchDashboard(t);
    }
  }, []);

  const fetchDashboard = async (t: string) => {
    try {
      const res = await fetch("/api/affiliate/dashboard", {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserData(data.user);
      } else {
        localStorage.removeItem("affiliate_token");
        setToken("");
      }
    } catch {
      localStorage.removeItem("affiliate_token");
      setToken("");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("affiliate_token", data.token);
        setToken(data.token);
        fetchDashboard(data.token);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true); setWithdrawMsg("");
    try {
      const res = await fetch("/api/affiliate/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawMsg(`🎉 KES ${data.amount} airtime sent to your phone!`);
        fetchDashboard(token); // refresh balance
      } else {
        setWithdrawMsg(`✗ ${data.error}`);
      }
    } catch {
      setWithdrawMsg("✗ Failed to withdraw.");
    } finally {
      setWithdrawing(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("affiliate_token");
    setToken("");
    setUserData(null);
  };

  const copyLink = () => {
    if (!userData) return;
    const link = `https://airtime.echomargin.com/?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(link);
    alert("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-green-900/30 backdrop-blur-md bg-black/20">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zm0 10L2 12l10 5 10-5-10-5z" />
            </svg>
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight">Echo<span className="text-gradient-green">Margin</span></span>
            <span className="block text-[9px] text-orange-400 font-bold uppercase tracking-widest -mt-0.5">Affiliates</span>
          </div>
        </Link>
        {token && (
          <button onClick={logout} className="text-zinc-500 text-xs font-bold hover:text-white transition-colors">Logout</button>
        )}
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {!token ? (
          <div className="w-full max-w-md animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-2">Earn Free Airtime</h1>
              <p className="text-zinc-400 text-sm">Share your link and earn <strong className="text-green-400">2% commission</strong> on every purchase your friends make.</p>
            </div>
            
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <div className="flex gap-2 mb-6 p-1 rounded-xl bg-black/40 border border-green-900/30">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${isLogin ? "bg-green-600 text-white" : "text-zinc-400 hover:text-white"}`}>Login</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${!isLogin ? "bg-green-600 text-white" : "text-zinc-400 hover:text-white"}`}>Sign Up</button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5">Phone Number</label>
                  <input 
                    type="tel" 
                    value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="07XX XXX XXX"
                    className="input-field w-full px-4 py-3.5 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5">Password</label>
                  <input 
                    type="password" 
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field w-full px-4 py-3.5 rounded-xl text-sm"
                    required minLength={6}
                  />
                </div>
                
                {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-xs font-medium">{error}</div>}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 rounded-xl text-white font-bold text-sm mt-2 disabled:opacity-50">
                  {loading ? "Please wait..." : isLogin ? "Login to Dashboard" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        ) : userData ? (
          <div className="w-full max-w-xl animate-slide-up">
            <h1 className="text-3xl font-black text-white mb-6">Your Dashboard</h1>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card rounded-2xl p-5 border border-green-500/20">
                <p className="text-zinc-400 text-xs font-bold uppercase mb-1">Wallet Balance</p>
                <p className="text-white text-3xl font-black">KES {userData.wallet_balance}</p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-zinc-400 text-xs font-bold uppercase mb-1">Total Referrals</p>
                <p className="text-white text-3xl font-black">{userData.total_referrals}</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              <h3 className="text-white font-bold mb-2">Your Referral Link</h3>
              <p className="text-zinc-400 text-sm mb-4">Share this link. When anyone buys airtime using it, you earn 2% instantly.</p>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={`https://airtime.echomargin.com/?ref=${userData.referral_code}`}
                  className="input-field flex-1 px-4 py-3 rounded-xl text-sm font-medium text-green-400 bg-green-900/10"
                />
                <button onClick={copyLink} className="px-5 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors">
                  Copy
                </button>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
              <h3 className="text-white font-bold mb-2">Withdraw to Airtime</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">Convert your earned commission directly into airtime sent to your registered phone number.</p>
              
              <button 
                onClick={handleWithdraw} 
                disabled={withdrawing || userData.wallet_balance < 10}
                className="btn-primary w-full max-w-xs mx-auto py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40"
              >
                {withdrawing ? "Processing..." : "Withdraw Airtime"}
              </button>
              {userData.wallet_balance < 10 && <p className="text-xs text-zinc-500 mt-3">Minimum withdrawal is KES 10.</p>}
              {withdrawMsg && <p className={`text-sm font-medium mt-4 ${withdrawMsg.startsWith("🎉") ? "text-green-400" : "text-red-400"}`}>{withdrawMsg}</p>}
            </div>

          </div>
        ) : (
          <div className="w-12 h-12 rounded-full border-4 border-green-900 border-t-green-400 animate-spin" />
        )}
      </main>
    </div>
  );
}
