"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  phone: string;
  amount: number;
  airtime_amount: number;
  status: string;
  mpesa_code: string;
  created_at: string;
}

interface Stats {
  total_transactions: number;
  total_revenue: number;
  total_airtime_sent: number;
  success_rate: number;
  today_transactions: number;
  today_revenue: number;
}

const StatCard = ({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) => (
  <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-green-700/40 transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-2xl font-black">{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
      </div>
      <div className={`text-2xl p-2.5 rounded-xl bg-green-900/30`}>{icon}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rate, setRate] = useState(10);
  const [newRate, setNewRate] = useState("10");
  const [serviceStatus, setServiceStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [rateMsg, setRateMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "settings">("overview");
  const router = useRouter();

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, txRes, settingsRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: headers() }),
        fetch("/api/admin/transactions", { headers: headers() }),
        fetch("/api/settings"),
      ]);
      if (statsRes.status === 401) { router.push("/admin"); return; }
      const [statsData, txData, settingsData] = await Promise.all([statsRes.json(), txRes.json(), settingsRes.json()]);
      if (statsData.stats) setStats(statsData.stats);
      if (txData.transactions) setTransactions(txData.transactions);
      if (settingsData.rate !== undefined) { 
        setRate(settingsData.rate); 
        setNewRate(String(settingsData.rate)); 
      }
      if (settingsData.status) {
        setServiceStatus(settingsData.status);
      }
    } catch { router.push("/admin"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, [fetchData]);

  const saveRate = async () => {
    setSavingRate(true); setRateMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ rate: parseFloat(newRate) }),
      });
      const data = await res.json();
      if (data.success) { setRate(parseFloat(newRate)); setRateMsg("✓ Rate updated successfully!"); }
      else setRateMsg("✗ Failed to update rate.");
    } catch { setRateMsg("✗ Network error."); }
    finally { setSavingRate(false); setTimeout(() => setRateMsg(""), 3000); }
  };

  const toggleStatus = async () => {
    setSavingStatus(true); setStatusMsg("");
    const nextStatus = serviceStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) { setServiceStatus(nextStatus); setStatusMsg("✓ Status updated!"); }
      else setStatusMsg("✗ Failed to update.");
    } catch { setStatusMsg("✗ Network error."); }
    finally { setSavingStatus(false); setTimeout(() => setStatusMsg(""), 3000); }
  };

  const logout = () => { localStorage.removeItem("admin_token"); router.push("/admin"); };

  const filteredTx = transactions.filter(t => filter === "all" || t.status === filter);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { success: "bg-green-900/30 text-green-400 border-green-700/40", failed: "bg-red-900/30 text-red-400 border-red-700/40", pending: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40" };
    return `inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${map[s] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-green-900 border-t-green-400 animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-green-900/10 blur-[100px]" />
      </div>

      {/* Top Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-green-900/30 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zm0 10L2 12l10 5 10-5-10-5z" />
            </svg>
          </div>
          <div>
            <span className="font-black text-white text-base">Echo<span className="text-gradient-green">Margin</span></span>
            <span className="ml-2 px-2 py-0.5 rounded-md bg-green-900/30 text-green-400 text-[9px] font-bold uppercase tracking-wider">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">View Site</a>
          <button onClick={logout} className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-400 text-xs font-bold hover:bg-red-900/20 transition-all">Logout</button>
        </div>
      </nav>

      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-black/20 p-1 rounded-2xl border border-green-900/20 w-fit">
          {(["overview", "transactions", "settings"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === tab ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "text-zinc-400 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="animate-slide-up">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <StatCard label="Total Revenue" value={`KES ${stats?.total_revenue?.toLocaleString() || 0}`} sub="All time" icon="💰" color="bg-green-500" />
              <StatCard label="Airtime Sent" value={`KES ${stats?.total_airtime_sent?.toLocaleString() || 0}`} sub="All time" icon="📱" color="bg-blue-500" />
              <StatCard label="Transactions" value={String(stats?.total_transactions || 0)} sub="All time" icon="📊" color="bg-purple-500" />
              <StatCard label="Success Rate" value={`${stats?.success_rate?.toFixed(1) || 0}%`} sub="All time" icon="✅" color="bg-emerald-500" />
              <StatCard label="Today Revenue" value={`KES ${stats?.today_revenue?.toLocaleString() || 0}`} sub="Today" icon="📅" color="bg-yellow-500" />
              <StatCard label="Today Tx" value={String(stats?.today_transactions || 0)} sub="Today" icon="⚡" color="bg-orange-500" />
            </div>

            {/* Current Rate */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Current Bonus Rate</p>
                  <p className="text-white text-4xl font-black">+{rate}% <span className="text-zinc-500 text-lg font-normal">bonus airtime</span></p>
                </div>
                <div className="text-5xl">🎁</div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Recent Transactions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-900/30">
                      {["Phone", "Paid", "Airtime", "M-Pesa Code", "Status", "Time"].map(h => (
                        <th key={h} className="text-left text-zinc-500 text-[10px] font-bold uppercase tracking-wider pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="border-b border-green-900/15 hover:bg-green-900/10 transition-colors">
                        <td className="py-3 pr-4 text-white font-medium text-xs">{tx.phone}</td>
                        <td className="py-3 pr-4 text-zinc-300 text-xs">KES {tx.amount}</td>
                        <td className="py-3 pr-4 text-green-400 font-bold text-xs">KES {tx.airtime_amount}</td>
                        <td className="py-3 pr-4 text-zinc-500 text-xs font-mono">{tx.mpesa_code || "-"}</td>
                        <td className="py-3 pr-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                        <td className="py-3 text-zinc-500 text-[10px]">{new Date(tx.created_at).toLocaleString("en-KE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && <p className="text-center text-zinc-600 text-sm py-8">No transactions yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl">All Transactions</h2>
              <div className="flex gap-2">
                {["all", "success", "pending", "failed"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${filter === f ? "bg-green-600 text-white" : "border border-green-900/30 text-zinc-400 hover:text-white"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-900/30">
                    {["#", "Phone", "Paid (KES)", "Airtime (KES)", "Bonus", "M-Pesa Code", "Status", "Date"].map(h => (
                      <th key={h} className="text-left text-zinc-500 text-[10px] font-bold uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((tx, i) => (
                    <tr key={tx.id} className="border-b border-green-900/10 hover:bg-green-900/10 transition-colors">
                      <td className="py-3 pr-4 text-zinc-600 text-xs">{i + 1}</td>
                      <td className="py-3 pr-4 text-white font-medium text-xs">{tx.phone}</td>
                      <td className="py-3 pr-4 text-zinc-300 text-xs font-bold">{tx.amount}</td>
                      <td className="py-3 pr-4 text-green-400 font-bold text-xs">{tx.airtime_amount}</td>
                      <td className="py-3 pr-4 text-green-600 text-xs">+{((tx.airtime_amount - tx.amount) / tx.amount * 100).toFixed(0)}%</td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs font-mono">{tx.mpesa_code || "-"}</td>
                      <td className="py-3 pr-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                      <td className="py-3 text-zinc-500 text-[10px]">{new Date(tx.created_at).toLocaleString("en-KE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTx.length === 0 && <p className="text-center text-zinc-600 text-sm py-8">No transactions found.</p>}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="animate-slide-up max-w-2xl">
            <h2 className="text-white font-bold text-xl mb-6">Platform Settings</h2>

            <div className="glass-card rounded-2xl p-8 mb-6">
              <h3 className="text-white font-bold mb-1">Airtime Bonus Rate</h3>
              <p className="text-zinc-500 text-sm mb-6">Set the percentage bonus customers receive on each purchase. Currently: <span className="text-green-400 font-bold">{rate}%</span></p>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Bonus Percentage</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      min={0} max={50} step={0.5}
                      className="input-field w-full px-4 py-3.5 rounded-xl text-sm font-bold pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-bold">%</span>
                  </div>
                </div>
                <div className="pt-5">
                  <button onClick={saveRate} disabled={savingRate}
                    className="btn-primary px-6 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 whitespace-nowrap">
                    {savingRate ? "Saving..." : "Save Rate"}
                  </button>
                </div>
              </div>

              {rateMsg && <p className={`mt-3 text-sm font-medium ${rateMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{rateMsg}</p>}

              {/* Visual preview */}
              <div className="mt-6 p-4 rounded-xl bg-green-900/15 border border-green-800/30">
                <p className="text-xs text-zinc-400 mb-2">Preview with {newRate}% rate:</p>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Customer pays KES 100</span>
                  <span className="text-green-400 font-bold">Gets KES {(100 * (1 + parseFloat(newRate || "0") / 100)).toFixed(0)} airtime</span>
                </div>
              </div>
            </div>

            {/* Service Status Toggle */}
            <div className="glass-card rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold mb-1">Service Status (Kill Switch)</h3>
                  <p className="text-zinc-500 text-sm">Instantly pause or resume all M-Pesa airtime purchases.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${serviceStatus === "active" ? "bg-green-900/30 text-green-400 border border-green-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
                  {serviceStatus}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleStatus} 
                  disabled={savingStatus}
                  className={`px-6 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ${
                    serviceStatus === "active" 
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30" 
                      : "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  }`}
                >
                  {savingStatus ? "Saving..." : serviceStatus === "active" ? "Pause Service" : "Resume Service"}
                </button>
                {statusMsg && <p className={`text-sm font-medium ${statusMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{statusMsg}</p>}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-white font-bold mb-1">API Configuration</h3>
              <p className="text-zinc-500 text-sm mb-4">Configure your M-Pesa and Africa's Talking credentials via environment variables in Railway.</p>
              <div className="space-y-2 text-xs font-mono">
                {[
                  "MPESA_CONSUMER_KEY",
                  "MPESA_CONSUMER_SECRET",
                  "MPESA_SHORTCODE",
                  "MPESA_PASSKEY",
                  "MPESA_CALLBACK_URL",
                  "AT_API_KEY",
                  "AT_USERNAME",
                  "ADMIN_EMAIL",
                  "ADMIN_PASSWORD_HASH",
                  "JWT_SECRET",
                ].map(k => (
                  <div key={k} className="flex items-center gap-3 p-2 rounded-lg bg-green-900/10 border border-green-900/20">
                    <span className="text-green-400">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
