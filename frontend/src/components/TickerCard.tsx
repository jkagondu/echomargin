"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

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
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const currentCandleRef = useRef<any>(null);

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#A1A1AA', // zinc-400
      },
      grid: {
        vertLines: { color: 'rgba(39, 39, 42, 0.5)' }, // zinc-800
        horzLines: { color: 'rgba(39, 39, 42, 0.5)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(39, 39, 42, 1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(39, 39, 42, 1)',
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981', // emerald-500
      downColor: '#f43f5e', // rose-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

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
        if (prev === null) {
          // Set initial price to calculate % change
          setPriceHistory([price]);
        }
        return price;
      });

      // Aggregate into 5-second candles
      const timeSec = tickData.epoch || Math.floor(Date.now() / 1000);
      const candleDuration = 5; 
      const candleTime = Math.floor(timeSec / candleDuration) * candleDuration;

      // Ensure time moves strictly forward
      if (
        !currentCandleRef.current || 
        candleTime > currentCandleRef.current.time
      ) {
         currentCandleRef.current = { time: candleTime, open: price, high: price, low: price, close: price };
      } else if (candleTime === currentCandleRef.current.time) {
         currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price);
         currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price);
         currentCandleRef.current.close = price;
      }
      
      if (seriesRef.current && currentCandleRef.current) {
        seriesRef.current.update(currentCandleRef.current);
      }
    };

    if (seriesRef.current) {
      seriesRef.current.setData([]);
      currentCandleRef.current = null;
    }

    // Trigger subscription
    subscribeTicks(activeSymbol, handleNewTick)
      .then(subId => console.log(`[TICKER] Subscribed to ${activeSymbol} (Sub ID: ${subId})`))
      .catch(err => console.error(`[TICKER] Subscription error for ${activeSymbol}:`, err));

    return () => {
      mounted = false;
      unsubscribeTicks(activeSymbol);
    };
  }, [activeSymbol, isConnected]);

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
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-3 relative z-10 gap-2 sm:gap-0">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500 font-semibold uppercase">Live Quote</span>
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Lightweight Candlestick Chart */}
      <div className="flex-1 w-full bg-zinc-950/40 border border-zinc-800/40 rounded-xl mt-2 relative">
        <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
      </div>
    </div>
  );
}
