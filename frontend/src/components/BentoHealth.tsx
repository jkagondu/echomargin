"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Percent, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';

interface HealthMetric {
  exchange: string;
  asset: string;
  leverage: string;
  marginRatio: number;
  unrealizedPnl: number;
  status: 'safe' | 'warning' | 'critical';
}

export default function BentoHealth() {
  const [healthFactor, setHealthFactor] = useState(98.4);
  const [pulse, setPulse] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    { exchange: 'Deriv Proxy', asset: 'Volatility 100', leverage: '1:100', marginRatio: 12.4, unrealizedPnl: 45.20, status: 'safe' },
    { exchange: 'dYdX L2', asset: 'BTC-USD Perp', leverage: '20x', marginRatio: 2.1, unrealizedPnl: 124.80, status: 'safe' },
    { exchange: 'Binance Perp', asset: 'ETH-USDT', leverage: '10x', marginRatio: 5.8, unrealizedPnl: -12.40, status: 'safe' },
    { exchange: 'Bybit Linear', asset: 'SOL-USDT', leverage: '15x', marginRatio: 8.4, unrealizedPnl: 88.90, status: 'safe' }
  ]);

  // Simulate real-time adjustments to health factor and margins
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 800);

      setHealthFactor(prev => {
        const delta = (Math.random() - 0.5) * 0.4;
        const next = Math.max(90, Math.min(100, prev + delta));
        return parseFloat(next.toFixed(2));
      });

      setMetrics(prev => prev.map(m => {
        const pnlDelta = (Math.random() - 0.5) * 4;
        const newPnl = m.unrealizedPnl + pnlDelta;
        return {
          ...m,
          unrealizedPnl: parseFloat(newPnl.toFixed(2))
        };
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (val: number) => {
    if (val > 95) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (val > 85) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  const getHealthBarColor = (val: number) => {
    if (val > 95) return 'bg-emerald-500';
    if (val > 85) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {/* Box 1: Health Factor Circular/Indicator (Large) */}
      <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between group min-h-[160px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Global Risk Profile
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${
            healthFactor > 95 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            Low Risk
          </span>
        </div>

        <div className="my-3 relative z-10 flex items-baseline gap-2">
          <span className="text-3xl font-black font-mono tracking-tight text-white">
            {healthFactor}%
          </span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase">Health Factor</span>
        </div>

        <div className="relative z-10 w-full">
          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase mb-1">
            <span>Liquidation Threshold</span>
            <span>{healthFactor > 95 ? 'Excellent' : 'Stable'}</span>
          </div>
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getHealthBarColor(healthFactor)}`}
              style={{ width: `${healthFactor}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Box 2: Open Position Count & Margin Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between group min-h-[160px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl"></div>

        <div className="flex items-center justify-between relative z-10">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            Derivatives Margin
          </span>
          <span className="text-[9px] font-mono text-zinc-500 font-bold">CROSS-MARGIN</span>
        </div>

        <div className="my-3 relative z-10 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black font-mono tracking-tight text-white">4</span>
            <span className="text-xs text-zinc-500 font-semibold uppercase ml-1.5">Active Contracts</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-zinc-500 font-bold block uppercase leading-none">COLLATERAL</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">$1,240.50</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 leading-relaxed border-t border-zinc-850 pt-2 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            Proxy Liquidation Guard Active
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </div>
      </div>

      {/* Box 3: Live Aggregated PnL across Derivatives */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between group min-h-[160px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>

        <div className="flex items-center justify-between relative z-10">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            Aggregate PnL (Net)
          </span>
          <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${pulse ? 'bg-emerald-400 scale-125' : 'bg-emerald-500/40'}`}></span>
        </div>

        <div className="my-2 relative z-10">
          <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
            +$246.50
          </span>
          <div className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            ROI: +19.87% (Today)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-850 pt-2 text-[9px] font-mono">
          <div>
            <span className="text-zinc-500 block uppercase font-bold">dYdX</span>
            <span className="text-emerald-400 font-bold">+$124.80</span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase font-bold">Deriv</span>
            <span className="text-emerald-400 font-bold">+$45.20</span>
          </div>
        </div>
      </div>
    </div>
  );
}
