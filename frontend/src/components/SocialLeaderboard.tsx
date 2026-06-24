"use client";

import React, { useState, useEffect } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { Award, Users, Shield, Copy, Check, TrendingUp, DollarSign, Share2 } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  traderName: string;
  strategy: string;
  winRate: number;
  p_l: number;
  followers: number;
  accountId: string;
}

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { rank: 1, traderName: 'SyntheticsMaster_99', strategy: 'Custom Spike Hunter', winRate: 78.4, p_l: 4210.50, followers: 342, accountId: 'CR923485' },
  { rank: 2, traderName: 'Alpha_Grind_Bot', strategy: 'Oscar\'s Grind v2', winRate: 72.1, p_l: 2890.30, followers: 188, accountId: 'CR748529' },
  { rank: 3, traderName: 'V100_Scalper', strategy: 'D\'Alembert Mean-Rev', winRate: 69.8, p_l: 1980.20, followers: 95, accountId: 'CR847291' },
  { rank: 4, traderName: 'MartingaleKing', strategy: '6-Step Martingale', winRate: 64.5, p_l: 1450.00, followers: 231, accountId: 'CR638190' },
  { rank: 5, traderName: 'Echo_Copy_1', strategy: 'Custom Tick-Trend', winRate: 66.2, p_l: 890.40, followers: 42, accountId: 'CR857201' },
];

export default function SocialLeaderboard() {
  const { activeAccount } = useDerivWebSocket();
  
  // Copy trading settings
  const [copyTradingActive, setCopyTradingActive] = useState(false);
  const [masterId, setMasterId] = useState('CR923485');
  const [copyRatio, setCopyRatio] = useState('1.0');
  const [maxAllocation, setMaxAllocation] = useState('200');
  const [sharingUrl, setSharingUrl] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [copiedLogs, setCopiedLogs] = useState<Array<{time: string, type: 'info' | 'success' | 'error', prefix: string, message: string}>>([]);

  // Listen to live trade events for copy simulation
  useEffect(() => {
    if (!copyTradingActive) {
      setCopiedLogs([]);
      return;
    }

    const handleTradeEvent = (e: Event) => {
      const trade = (e as CustomEvent).detail;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const multiplier = parseFloat(copyRatio) || 1.0;
      const copiedStake = (trade.stake * multiplier).toFixed(2);

      if (trade.status === 'purchasing') {
        setCopiedLogs(prev => [
          {
            time: timeStr,
            type: 'info',
            prefix: '[COPIER SIGNAL]',
            message: `Detected Master order: ${trade.type} on ${trade.symbol.replace('R_', 'Volatility ')}. Scaling and routing order...`
          },
          ...prev
        ]);
      } else if (trade.status === 'open') {
        setCopiedLogs(prev => [
          {
            time: timeStr,
            type: 'info',
            prefix: '[COPIER PLACED]',
            message: `Successfully executed copy-trade on ${trade.symbol.replace('R_', 'Volatility ')} with stake $${copiedStake} USD. Entry Spot: ${trade.buyPrice || 'Calculating...'}`
          },
          ...prev
        ]);
      } else if (trade.status === 'won') {
        const profit = (trade.profit || 0) * multiplier;
        setCopiedLogs(prev => [
          {
            time: timeStr,
            type: 'success',
            prefix: '[COPIER SETTLED]',
            message: `Master contract won! Copied payout settled. Net Profit: +$${profit.toFixed(2)} USD.`
          },
          ...prev
        ]);
      } else if (trade.status === 'lost') {
        const loss = Math.abs((trade.profit || -trade.stake) * multiplier);
        setCopiedLogs(prev => [
          {
            time: timeStr,
            type: 'error',
            prefix: '[COPIER SETTLED]',
            message: `Master contract lost. Copied loss recorded. Net Loss: -$${loss.toFixed(2)} USD.`
          },
          ...prev
        ]);
      }
    };

    window.addEventListener('deriv-trade-event', handleTradeEvent);
    return () => {
      window.removeEventListener('deriv-trade-event', handleTradeEvent);
    };
  }, [copyTradingActive, copyRatio]);

  // Check URL query parameters for ?copyId= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const copyId = params.get('copyId');
    
    if (copyId) {
      console.log(`[COPY TRADE] Detected copyId: ${copyId} in URL. Loading configuration...`);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      
      fetch(`${backendUrl}/api/copy-links/${copyId}`)
        .then(res => {
          if (!res.ok) throw new Error('Copy configuration not found');
          return res.json();
        })
        .then(data => {
          if (data.success && data.link) {
            setMasterId(data.link.masterId);
            setCopyRatio(String(data.link.copyRatio));
            setMaxAllocation(String(data.link.maxAllocation));
            setCopyTradingActive(true);
            setSharingUrl(`${window.location.origin}/?copyId=${copyId}`);
            alert(`Successfully loaded and activated copy settings for Master Account: ${data.link.masterId}`);
          }
        })
        .catch(err => {
          console.error('[COPY TRADE] Failed to load copy link config:', err);
        });
    }
  }, []);

  const toggleCopyTrading = async () => {
    if (!copyTradingActive) {
      if (!masterId.trim()) {
        alert('Please specify a valid Master Trader ID.');
        return;
      }

      // Persist copy configuration to the backend
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/copy-links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            masterId,
            copyRatio,
            maxAllocation,
            copierAccountId: activeAccount?.accountId || 'unknown'
          })
        });

        if (!res.ok) throw new Error('Failed to save copy settings to database');
        
        const data = await res.json();
        if (data.success) {
          setSharingUrl(data.sharingUrl);
          setCopyTradingActive(true);
        }
      } catch (err: any) {
        alert('Failed to activate copy trading: ' + err.message);
      }
    } else {
      setCopyTradingActive(false);
      setSharingUrl(null);
    }
  };

  const selectMasterFromLeaderboard = (id: string) => {
    setMasterId(id);
    const index = LEADERBOARD_DATA.findIndex(entry => entry.accountId === id);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Performance Leaderboard Panel (Col Span 8) */}
      <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[480px]">
        <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">Top Performing Traders (24h)</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-850 pb-2">
                <th className="py-2 pl-2">Rank</th>
                <th className="py-2">Trader Name</th>
                <th className="py-2">Strategy</th>
                <th className="py-2 text-right">Win Rate</th>
                <th className="py-2 text-right">Net Profit</th>
                <th className="py-2 text-right">Followers</th>
                <th className="py-2 pr-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {LEADERBOARD_DATA.map((trader, index) => {
                const isSelected = masterId === trader.accountId;
                return (
                  <tr key={trader.accountId} className="hover:bg-zinc-950/30 transition-colors">
                    <td className="py-3.5 pl-2 font-bold font-mono text-zinc-400">
                      {trader.rank === 1 && <span className="text-yellow-500">🏆 1</span>}
                      {trader.rank === 2 && <span className="text-zinc-400">🥈 2</span>}
                      {trader.rank === 3 && <span className="text-amber-600">🥉 3</span>}
                      {trader.rank > 3 && trader.rank}
                    </td>
                    <td className="py-3.5 font-bold text-zinc-300">
                      {trader.traderName}
                      <span className="text-[9px] text-zinc-600 block font-mono font-medium">{trader.accountId}</span>
                    </td>
                    <td className="py-3.5 text-zinc-400 font-medium">{trader.strategy}</td>
                    <td className="py-3.5 text-right font-mono text-emerald-400 font-bold">{trader.winRate}%</td>
                    <td className="py-3.5 text-right font-mono font-bold text-emerald-400">+${trader.p_l.toFixed(2)}</td>
                    <td className="py-3.5 text-right font-mono text-zinc-400 font-semibold">{trader.followers}</td>
                    <td className="py-3.5 pr-2 text-center">
                      <button
                        onClick={() => selectMasterFromLeaderboard(trader.accountId)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          copiedIndex === index
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : isSelected
                            ? 'bg-zinc-950 border-emerald-500/30 text-emerald-400 hover:bg-zinc-800'
                            : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Copy trade setup"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy-Trading Setup controls (Col Span 4) */}
      <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-[480px]">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
            <Users className="w-5 h-5 text-emerald-400" />
            <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Copy-Trading Controls</h4>
          </div>

          <div className="space-y-4">
            {/* Master Account input */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-500/40">
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                Target Master ID
              </label>
              <input
                type="text"
                disabled={copyTradingActive}
                value={masterId}
                onChange={(e) => setMasterId(e.target.value)}
                className="bg-transparent text-white font-semibold font-mono text-xs focus:outline-none w-full"
                placeholder="e.g. CR923485"
              />
            </div>

            {/* Config metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 flex flex-col focus-within:ring-2 focus-within:ring-emerald-500/40">
                <span className="text-[8px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  Copy Ratio
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  disabled={copyTradingActive}
                  value={copyRatio}
                  onChange={(e) => setCopyRatio(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none w-full"
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 flex flex-col focus-within:ring-2 focus-within:ring-emerald-500/40">
                <span className="text-[8px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-0.5">
                  <DollarSign className="w-3 h-3" />
                  Max Limit ($)
                </span>
                <input
                  type="number"
                  min="10"
                  disabled={copyTradingActive}
                  value={maxAllocation}
                  onChange={(e) => setMaxAllocation(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Copy Trading Status indicator */}
            {copyTradingActive && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 my-2 text-center text-xs animate-pulse">
                <span className="text-zinc-500 block font-semibold mb-0.5">Copy Status:</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider font-mono">
                  ACTIVE COPYING {masterId}
                </span>
              </div>
            )}

            {/* Sharing Copy Link URL */}
            {copyTradingActive && sharingUrl && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 my-2">
                <span className="text-[8px] text-zinc-500 font-bold uppercase block mb-1 flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  Shareable Copy Link
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sharingUrl}
                    className="bg-zinc-900 text-zinc-400 font-mono text-[9px] px-2 py-1 rounded border border-zinc-800 flex-1 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sharingUrl);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[9px] rounded transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start / Stop Toggle */}
        <button
          onClick={toggleCopyTrading}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-98 ${
            copyTradingActive
              ? 'bg-rose-500 hover:bg-rose-600 text-zinc-950 shadow-rose-500/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
          }`}
        >
          {copyTradingActive ? 'DEACTIVATE COPY-TRADE' : 'ACTIVATE COPY-TRADE'}
        </button>
      </div>

      {copyTradingActive && (
        <div className="lg:col-span-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[180px] mt-2 animate-slideIn">
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-850 pb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Copier Execution Stream</span>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-850">
            {copiedLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-650 font-sans text-xs">
                Waiting for master account trade signals... Place a manual trade to trigger copier replication.
              </div>
            ) : (
              copiedLogs.map((log, idx) => (
                <div key={idx} className="text-zinc-400">
                  <span className="text-zinc-600">[{log.time}]</span>{' '}
                  <span
                    className={
                      log.type === 'error'
                        ? 'text-rose-400 font-bold'
                        : log.type === 'success'
                        ? 'text-emerald-400 font-bold'
                        : 'text-blue-400 font-bold'
                    }
                  >
                    {log.prefix}
                  </span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
