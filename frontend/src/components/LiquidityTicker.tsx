"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Cpu } from 'lucide-react';

interface ExchangeSpread {
  name: string;
  spread: string;
  active: boolean;
}

export default function LiquidityTicker() {
  const [exchanges, setExchanges] = useState<ExchangeSpread[]>([
    { name: 'BINANCE PERP', spread: '0.01%', active: true },
    { name: 'DYDX L2', spread: '0.02%', active: false },
    { name: 'BYBIT LINEAR', spread: '0.01%', active: false },
    { name: 'DERIV PROXY', spread: '0.00%', active: true },
    { name: 'OKX FUTURES', spread: '0.03%', active: false },
    { name: 'COINBASE PROXY', spread: '0.02%', active: false }
  ]);

  // Periodically cycle the active tightest spread exchange
  useEffect(() => {
    const interval = setInterval(() => {
      setExchanges(prev => {
        const activeIdx = Math.floor(Math.random() * prev.length);
        return prev.map((item, idx) => ({
          ...item,
          active: idx === activeIdx,
          spread: idx === activeIdx ? '0.00%' : `${(0.01 + Math.random() * 0.03).toFixed(2)}%`
        }));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-950 border-b border-zinc-900 py-1.5 px-4 text-[9px] font-mono tracking-wider text-zinc-500 uppercase overflow-hidden relative z-50 flex items-center h-8 select-none">
      
      {/* Aggregator Title Badge */}
      <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 mr-6 text-emerald-400 font-bold">
        <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
        Liquidity Router Matrix
      </div>

      {/* Scrolling Ticker Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {exchanges.map((exchange, index) => (
            <div key={exchange.name} className="inline-flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${exchange.active ? 'bg-emerald-400 animate-ping' : 'bg-zinc-700'}`}></span>
              {exchange.active && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              
              <span className={`font-bold transition-colors ${exchange.active ? 'text-emerald-400 font-black' : 'text-zinc-400'}`}>
                {exchange.name}
              </span>
              
              <span className="text-zinc-600 font-medium">
                Spread: <span className={exchange.active ? 'text-white font-bold' : 'text-zinc-500'}>{exchange.spread}</span>
              </span>

              {index !== exchanges.length - 1 && <span className="text-zinc-800 font-bold mx-2">|</span>}
            </div>
          ))}

          {/* Repeat list to avoid gaps while scrolling */}
          {exchanges.map((exchange, index) => (
            <div key={`${exchange.name}-dup`} className="inline-flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${exchange.active ? 'bg-emerald-400 animate-ping' : 'bg-zinc-700'}`}></span>
              {exchange.active && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              
              <span className={`font-bold transition-colors ${exchange.active ? 'text-emerald-400 font-black' : 'text-zinc-400'}`}>
                {exchange.name}
              </span>
              
              <span className="text-zinc-600 font-medium">
                Spread: <span className={exchange.active ? 'text-white font-bold' : 'text-zinc-500'}>{exchange.spread}</span>
              </span>

              {index !== exchanges.length - 1 && <span className="text-zinc-800 font-bold mx-2">|</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 ml-6 text-zinc-400">
        <Shield className="w-3 h-3 text-emerald-500" />
        Secure SLA
      </div>
      
    </div>
  );
}
