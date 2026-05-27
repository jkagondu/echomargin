"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { Activity, Bell, AlertTriangle, ChevronUp, ChevronDown, Volume2, VolumeX } from 'lucide-react';

interface AssetScan {
  symbol: string;
  name: string;
  price: number | null;
  prevPrice: number | null;
  priceHistory: number[];
  rsi: number | null;
  status: 'Normal' | 'Overbought' | 'Oversold' | 'Spike';
  changePct: number;
}

const MONITORED_ASSETS = [
  { symbol: 'R_10', name: 'Volatility 10 Index' },
  { symbol: 'R_25', name: 'Volatility 25 Index' },
  { symbol: 'R_50', name: 'Volatility 50 Index' },
  { symbol: 'R_75', name: 'Volatility 75 Index' },
  { symbol: 'R_100', name: 'Volatility 100 Index' },
  { symbol: 'CRASH500', name: 'Crash 500 Index' },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index' }
];

export default function MarketScanner() {
  const { subscribeTicks, unsubscribeTicks, isConnected } = useDerivWebSocket();
  const [assets, setAssets] = useState<AssetScan[]>(
    MONITORED_ASSETS.map(a => ({
      symbol: a.symbol,
      name: a.name,
      price: null,
      prevPrice: null,
      priceHistory: [],
      rsi: null,
      status: 'Normal',
      changePct: 0
    }))
  );
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; msg: string; timestamp: number }[]>([]);

  // Ref to hold current state to access in the subscribe callback
  const assetsRef = useRef<AssetScan[]>([]);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const addAlert = (msg: string) => {
    const newAlert = {
      id: Math.random().toString(36).substring(2, 9),
      msg,
      timestamp: Date.now()
    };
    setRecentAlerts(prev => [newAlert, ...prev].slice(0, 8));

    // Audio alarm beep using Web Audio API
    if (audioEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 523.25; // C5 note
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }
  };

  // RSI-14 calculator
  const calculateRSI = (history: number[]): number | null => {
    if (history.length < 15) return null;
    
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < 15; i++) {
      const diff = history[history.length - 15 + i] - history[history.length - 15 + i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  };

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to each asset tick updates
    MONITORED_ASSETS.forEach((asset) => {
      subscribeTicks(asset.symbol, (tick) => {
        const price = parseFloat(tick.quote);
        
        setAssets(prevAssets => {
          return prevAssets.map(item => {
            if (item.symbol !== asset.symbol) return item;

            const prev = item.price;
            const updatedHistory = [...item.priceHistory, price].slice(-30); // keep last 30 quotes
            const rsi = calculateRSI(updatedHistory);
            
            // Calculate change percentage from initial historical quote
            const initialPrice = updatedHistory[0];
            const changePct = initialPrice ? ((price - initialPrice) / initialPrice) * 100 : 0;

            let status: 'Normal' | 'Overbought' | 'Oversold' | 'Spike' = 'Normal';
            if (rsi !== null) {
              if (rsi >= 70) status = 'Overbought';
              else if (rsi <= 30) status = 'Oversold';
            }

            // Spike detection for Crash / Boom
            // Crash Index: sudden downward spike
            if (asset.symbol === 'CRASH500' && prev !== null) {
              const diff = price - prev;
              // If drops > 3 points in a single tick
              if (diff < -3) {
                status = 'Spike';
                addAlert(`SPIKE DETECTED: ${asset.name} crashed by ${diff.toFixed(2)} points!`);
              }
            }
            
            // Boom Index: sudden upward spike
            if (asset.symbol === 'BOOM1000' && prev !== null) {
              const diff = price - prev;
              // If jumps > 3 points in a single tick
              if (diff > 3) {
                status = 'Spike';
                addAlert(`SPIKE DETECTED: ${asset.name} boomed by +${diff.toFixed(2)} points!`);
              }
            }

            // General RSI warnings
            if (rsi !== null && item.rsi !== null) {
              if (rsi >= 70 && item.rsi < 70) {
                addAlert(`RSI Alert: ${asset.name} is Overbought (RSI: ${rsi.toFixed(1)})`);
              } else if (rsi <= 30 && item.rsi > 30) {
                addAlert(`RSI Alert: ${asset.name} is Oversold (RSI: ${rsi.toFixed(1)})`);
              }
            }

            return {
              ...item,
              price,
              prevPrice: prev,
              priceHistory: updatedHistory,
              rsi,
              status,
              changePct
            };
          });
        });
      });
    });

    return () => {
      MONITORED_ASSETS.forEach(a => unsubscribeTicks(a.symbol));
    };
  }, [isConnected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Multi-Asset Grid Panel (Col Span 8) */}
      <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[400px]">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">Multi-Asset Pattern Scanner</h3>
          </div>
          
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition-colors cursor-pointer"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Audio Alerts On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-500" />
                Audio Alerts Muted
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-850 pb-2">
                <th className="py-2 pl-2">Index Name</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Trend (1hr)</th>
                <th className="py-2 text-center">RSI (14)</th>
                <th className="py-2 pr-2 text-center">Scanner Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {assets.map((item) => {
                const isUp = item.price && item.prevPrice && item.price > item.prevPrice;
                const isDown = item.price && item.prevPrice && item.price < item.prevPrice;
                
                return (
                  <tr key={item.symbol} className="hover:bg-zinc-950/30 transition-colors">
                    <td className="py-3.5 pl-2 font-semibold text-zinc-300">{item.name}</td>
                    
                    <td className="py-3.5 text-right font-mono font-bold">
                      <span className={`transition-colors duration-150 ${
                        isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-white'
                      }`}>
                        {item.price !== null ? item.price.toFixed(4) : 'Loading...'}
                      </span>
                    </td>

                    <td className="py-3.5 text-right font-mono">
                      {item.price !== null && (
                        <span className={`inline-flex items-center gap-0.5 ${
                          item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {item.changePct >= 0 ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                          {item.changePct.toFixed(2)}%
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-center font-mono font-bold">
                      {item.rsi !== null ? (
                        <span className={`${
                          item.rsi >= 70 ? 'text-rose-400' : item.rsi <= 30 ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {item.rsi.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Calc...</span>
                      )}
                    </td>

                    <td className="py-3.5 pr-2 text-center">
                      {item.status === 'Normal' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-950 text-zinc-500 font-bold uppercase border border-zinc-900">
                          Normal
                        </span>
                      )}
                      {item.status === 'Overbought' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-bold uppercase border border-rose-500/20 animate-pulse">
                          Overbought
                        </span>
                      )}
                      {item.status === 'Oversold' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/20 animate-pulse">
                          Oversold
                        </span>
                      )}
                      {item.status === 'Spike' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-zinc-950 font-black uppercase border border-amber-400 animate-bounce">
                          Spike!
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Alerts Stream (Col Span 4) */}
      <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[400px] justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Alert History</h4>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[290px] pr-1">
            {recentAlerts.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center text-zinc-600 p-4">
                <AlertTriangle className="w-8 h-8 mb-2 text-zinc-700 stroke-[1.5]" />
                <p className="text-xs font-semibold">No alerts triggered yet.</p>
                <p className="text-[10px] max-w-[160px] mt-0.5 text-zinc-700">
                  RSI and Crash/Boom spike alarms will sound and log here.
                </p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-zinc-950/60 border-l-2 border-amber-500 border-zinc-850 p-2.5 rounded-lg text-[10px] flex flex-col gap-1 transition-all duration-300 animate-slideIn"
                >
                  <span className="text-zinc-400 leading-normal font-semibold">
                    {alert.msg}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
