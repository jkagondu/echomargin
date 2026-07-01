"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("admin_token", data.token);
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-green-600/10 blur-[80px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-green-800/10 blur-[80px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Admin Portal</h1>
          <p className="text-zinc-500 text-sm mt-1">EchoMargin Airtime Control Panel</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card rounded-3xl p-8 animate-slide-up stagger-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
          
          <div className="mb-5">
            <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              className="input-field w-full px-4 py-3.5 rounded-xl text-sm font-medium placeholder:text-zinc-600"
              placeholder="admin@echomargin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              className="input-field w-full px-4 py-3.5 rounded-xl text-sm font-medium placeholder:text-zinc-600"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 rounded-2xl text-white font-extrabold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-4">
          <a href="/" className="text-green-600 hover:text-green-400 transition-colors">← Back to customer site</a>
        </p>
      </div>
    </div>
  );
}
