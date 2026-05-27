"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const SUPPORTED_ASSETS = [
  { symbol: 'R_10', name: 'Volatility 10 Index' },
  { symbol: 'R_25', name: 'Volatility 25 Index' },
  { symbol: 'R_50', name: 'Volatility 50 Index' },
  { symbol: 'R_75', name: 'Volatility 75 Index' },
  { symbol: 'R_100', name: 'Volatility 100 Index' },
];

interface TickerCardProps {
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export default function TickerCard({ activeSymbol, onSymbolChange }: TickerCardProps) {
  const { subscribeTicks, unsubscribeTicks, isConnected } = useDerivWebSocket();
  const [currentTick, setCurrentTick] = useState<any>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>('flat');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to WebSocket tick feed
  useEffect(() => {
    if (!isConnected) return;

    let mounted = true;
    setPriceHistory([]);
    setPrevPrice(null);
    setCurrentTick(null);
    setPriceDirection('flat');

    const handleNewTick = (tickData: any) => {
      if (!mounted) return;
      
      const price = parseFloat(tickData.quote);
      setCurrentTick(tickData);

      setPrevPrice(prev => {
        if (prev !== null) {
          if (price > prev) setPriceDirection('up');
          else if (price < prev) setPriceDirection('down');
          else setPriceDirection('flat');
        }
        return price;
      });

      setPriceHistory(history => {
        const updated = [...history, price];
        // Limit history to 60 ticks
        if (updated.length > 60) updated.shift();
        return updated;
      });
    };

    // Trigger subscription
    subscribeTicks(activeSymbol, handleNewTick)
      .then(subId => console.log(`[TICKER] Subscribed to ${activeSymbol} (Sub ID: ${subId})`))
      .catch(err => console.error(`[TICKER] Subscription error for ${activeSymbol}:`, err));

    return () => {
      mounted = false;
      unsubscribeTicks(activeSymbol);
    };
  }, [activeSymbol, isConnected]);

  // Render canvas sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    // Draw grid lines
    ctx.strokeStyle = '#18181b'; // zinc-900
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Prepare line path
    ctx.beginPath();
    priceHistory.forEach((price, index) => {
      const x = (width / (priceHistory.length - 1)) * index;
      // Flip vertical coords (y=0 is top) and leave 10px padding
      const y = height - 12 - ((price - min) / range) * (height - 24);
      
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Color gradient based on direction
    const isUp = priceDirection === 'up' || (priceHistory[priceHistory.length - 1] >= priceHistory[0]);
    const strokeColor = isUp ? '#10b981' : '#f43f5e'; // emerald-500 or rose-500
    
    // Draw line
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill area below the curve
    ctx.lineTo((width / (priceHistory.length - 1)) * (priceHistory.length - 1), height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)');
    fillGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // Draw last point glowing dot
    const lastX = width;
    const lastY = height - 12 - ((priceHistory[priceHistory.length - 1] - min) / range) * (height - 24);
    
    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 12, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
    ctx.fill();

  }, [priceHistory, priceDirection]);

  // Calculate statistics
  const currentPrice = currentTick ? parseFloat(currentTick.quote) : null;
  const initialPrice = priceHistory.length > 0 ? priceHistory[0] : null;
  const priceChange = currentPrice && initialPrice ? currentPrice - initialPrice : 0;
  const pctChange = initialPrice && priceChange ? (priceChange / initialPrice) * 100 : 0;
  const assetName = SUPPORTED_ASSETS.find(a => a.symbol === activeSymbol)?.name || activeSymbol;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-[320px]">
      {/* Background Subtle Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${
        priceDirection === 'up' ? 'bg-emerald-500' : priceDirection === 'down' ? 'bg-rose-500' : 'bg-zinc-500'
      }`}></div>

      {/* Header with Selector */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Asset Feed</h3>
            <span className="text-white text-sm font-semibold block">{assetName}</span>
          </div>
        </div>

        <select
          value={activeSymbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {SUPPORTED_ASSETS.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>
              {asset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Real-time Streaming Value */}
      <div className="flex items-baseline justify-between mb-3 relative z-10">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500 font-semibold uppercase">Live Quote</span>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-extrabold font-mono tracking-tight transition-colors duration-300 ${
              priceDirection === 'up'
                ? 'text-emerald-400'
                : priceDirection === 'down'
                ? 'text-rose-400'
                : 'text-white'
            }`}>
              {currentPrice !== null ? currentPrice.toFixed(4) : 'Connecting...'}
            </span>
            {currentPrice !== null && (
              <span className={`flex items-center text-xs font-bold rounded-lg px-2 py-0.5 ${
                priceChange >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}>
                {priceChange >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 inline" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 inline" />
                )}
                {priceChange >= 0 ? '+' : ''}
                {priceChange.toFixed(2)} ({pctChange.toFixed(3)}%)
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Direction indicators */}
        <div className="flex items-center gap-2">
          {priceDirection === 'up' && (
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase bg-emerald-500/10 px-2 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4 animate-bounce" />
              Rise
            </div>
          )}
          {priceDirection === 'down' && (
            <div className="flex items-center gap-1 text-rose-400 font-bold text-xs uppercase bg-rose-500/10 px-2 py-1 rounded-lg">
              <TrendingDown className="w-4 h-4 animate-bounce" />
              Fall
            </div>
          )}
        </div>
      </div>

      {/* Sparkline Canvas Chart */}
      <div className="flex-1 w-full bg-zinc-950/40 border border-zinc-800/40 rounded-xl overflow-hidden mt-2 p-1.5 relative">
        {priceHistory.length < 2 ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-semibold">
            Accumulating tick data for chart...
          </div>
        ) : null}
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
