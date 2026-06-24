"use client";

import React, { useState, useEffect } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import Navbar from '@/components/Navbar';
import TickerCard from '@/components/TickerCard';
import TradeController from '@/components/TradeController';
import ActivityLog from '@/components/ActivityLog';
import LoginButton from '@/components/LoginButton';
import BotBuilder from '@/components/BotBuilder';
import MarketScanner from '@/components/MarketScanner';
import SocialLeaderboard from '@/components/SocialLeaderboard';
import Logo from '@/components/Logo';
import LiquidityTicker from '@/components/LiquidityTicker';
import BentoHealth from '@/components/BentoHealth';
import { Shield, Zap, LineChart, Cpu, Lock, Bot, Activity, Users, LayoutDashboard, ArrowRight, Server, RefreshCw } from 'lucide-react';

interface LoggedTrade {
  id: string;
  symbol: string;
  type: string;
  stake: number;
  status: 'purchasing' | 'open' | 'won' | 'lost';
  buyPrice?: number;
  exitPrice?: number;
  payout?: number;
  profit?: number;
  timestamp: number;
}

function AppShowcasePreview() {
  const [mockTick, setMockTick] = useState(1284.50);
  const [mockTrend, setMockTrend] = useState<'up' | 'down'>('up');
  const [mockTrades, setMockTrades] = useState([
    { id: '1', symbol: 'Volatility 100 Index', type: 'CALL', stake: 50, profit: '+$47.50', status: 'won' },
    { id: '2', symbol: 'Volatility 75 Index', type: 'PUT', stake: 100, profit: '+$95.00', status: 'won' },
    { id: '3', symbol: 'Volatility 25 Index', type: 'CALL', stake: 25, profit: '-$25.00', status: 'lost' }
  ]);

  // Simulate tick updates for active mock chart
  useEffect(() => {
    const timer = setInterval(() => {
      setMockTick(prev => {
        const change = (Math.random() - 0.48) * 1.5;
        setMockTrend(change >= 0 ? 'up' : 'down');
        return parseFloat((prev + change).toFixed(2));
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-zinc-900/40 rounded-3xl border border-zinc-800/80 shadow-2xl p-6 font-sans relative overflow-hidden backdrop-blur-md">
      {/* Window Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-4">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">ECHO_TERMINAL_LIVE_PREVIEW.SH</div>
        <div className="w-12"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-left">
        {/* Mock Chart & Tickers */}
        <div className="lg:col-span-8 bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Real-time Asset Feed</span>
              <span className="text-sm font-bold text-white">Volatility 100 Index</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Spot Price</span>
              <span className={`text-base font-mono font-black ${mockTrend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${mockTick.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Simple Simulated Chart Waveform */}
          <div className="h-24 flex items-end gap-1.5 px-1 my-4 relative overflow-hidden">
            {/* Draw a subtle chart path grid */}
            <div className="absolute inset-0 grid grid-rows-3 opacity-5">
              <div className="border-b border-zinc-600"></div>
              <div className="border-b border-zinc-600"></div>
              <div className="border-b border-zinc-600"></div>
            </div>
            {/* Simulated bar nodes */}
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded h-12 animate-pulse"></div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded h-16"></div>
            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded h-8"></div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded h-20"></div>
            <div className="flex-1 bg-emerald-500/15 border border-emerald-400/30 rounded h-24"></div>
            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded h-14 animate-pulse"></div>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded h-18"></div>
          </div>

          <div className="flex justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-900/60 pt-2">
            <span>MODE: SECURE_WS_PROXY</span>
            <span className="text-emerald-400 font-bold animate-pulse">● LIVE HEARTBEAT</span>
          </div>
        </div>

        {/* Mock Stats/Settings */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Bot Automation Mock */}
          <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono block">AUTO BOT STATE</span>
              <span className="text-xs font-bold text-white">Martingale Compounder</span>
            </div>
            <div className="my-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 text-left">
              <span className="text-[9px] text-emerald-400 font-bold block uppercase">Active Logic Trigger</span>
              <span className="text-[10px] text-zinc-300">Purchase CALL contract on 3 consecutive red ticks.</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-zinc-500">PROPOSALS: 42</span>
              <span className="text-emerald-400 font-bold">RUNNING</span>
            </div>
          </div>

          {/* Copy Trading Mock */}
          <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono block">COPY LEADERBOARD</span>
              <span className="text-xs font-bold text-white">Master Pool Feed</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] text-zinc-400">Replicating active trade: #392844</span>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-1 font-mono">
              <span className="text-zinc-500">Ratio: 1.5x</span>
              <span className="text-emerald-400 font-extrabold">+94.20%</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-12 bg-zinc-950/20 border border-zinc-850 rounded-2xl p-4 mt-2">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-3">Simulated Live Log Feed</span>
          <div className="space-y-2">
            {mockTrades.map(trade => (
              <div key={trade.id} className="flex justify-between items-center text-xs font-mono bg-zinc-950/60 border border-zinc-900/50 rounded-xl p-2 px-4">
                <div className="flex items-center gap-4">
                  <span className={trade.type === 'CALL' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {trade.type}
                  </span>
                  <span className="text-zinc-200 font-bold">{trade.symbol}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500">Stake: ${trade.stake}</span>
                  <span className={trade.status === 'won' ? 'text-emerald-400 font-black' : 'text-rose-500 font-black'}>
                    {trade.profit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { authorized, isConnecting, enableDemoMode } = useDerivWebSocket();
  const [activeSymbol, setActiveSymbol] = useState('R_100');
  const [trades, setTrades] = useState<LoggedTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'trade' | 'bot' | 'scanner' | 'social'>('trade');

  // Fetch initial trade history
  useEffect(() => {
    if (authorized) {
      const fetchHistory = async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
          const res = await fetch(`${baseUrl}/api/trades`, { credentials: 'include' });
          const data = await res.json();
          if (data.success && data.trades) {
            // Merge database trades into state
            setTrades(data.trades);
          }
        } catch (e) {
          console.error("Failed to load trade history", e);
        }
      };
      fetchHistory();
    }
  }, [authorized]);

  const handleTradeStarted = (newTrade: LoggedTrade) => {
    setTrades((prev) => [newTrade, ...prev]);
  };

  const handleTradeUpdated = (updatedTrade: LoggedTrade) => {
    setTrades((prev) => {
      const index = prev.findIndex(
        (t) => t.id === updatedTrade.id || (updatedTrade.id.startsWith('pending') === false && t.id.startsWith('pending'))
      );

      if (index !== -1) {
        const copy = [...prev];
        copy[index] = { ...copy[index], ...updatedTrade };
        return copy;
      } else {
        return [updatedTrade, ...prev];
      }
    });

    // Save trade to backend if it just closed
    if (updatedTrade.status === 'won' || updatedTrade.status === 'lost') {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      fetch(`${baseUrl}/api/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedTrade)
      }).catch(console.error);
    }
  };

  const handleClearTrades = () => {
    setTrades([]);
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4 relative overflow-hidden">
        {/* Glow point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col items-center relative z-10">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-teal-400 animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <Logo size="md" iconOnly className="mb-4" />
          <h2 className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-1 animate-pulse">
            Establishing Secure Proxy Bridge
          </h2>
          <p className="text-xs text-zinc-500 tracking-wide uppercase font-semibold">Validating session mapping on Node backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white selection:bg-emerald-500 selection:text-zinc-950">
      <LiquidityTicker />
      <Navbar />

      {authorized ? (
        // Authorized Dashboard Layout
        <div className="flex-1 flex flex-col">
          
          {/* Dashboard Sub-Header with Tab Selection */}
          <div className="bg-zinc-900/40 border-b border-zinc-900 py-3.5 px-4 md:px-6">
            <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide whitespace-nowrap w-full">
                
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                    activeTab === 'trade'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 border border-transparent hover:bg-zinc-850'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Manual Terminal
                </button>

                <button
                  onClick={() => setActiveTab('bot')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                    activeTab === 'bot'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 border border-transparent hover:bg-zinc-850'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Auto Bot Builder
                </button>

                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                    activeTab === 'scanner'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 border border-transparent hover:bg-zinc-850'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Pattern Scanner
                </button>

                <button
                  onClick={() => setActiveTab('social')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                    activeTab === 'social'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 border border-transparent hover:bg-zinc-850'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Copy Trading
                </button>

              </div>
              
              <div className="hidden sm:block text-zinc-500 text-xs font-mono font-bold uppercase">
                Active Index: {activeSymbol.replace('R_', 'Vol ')}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 relative z-10">
            {activeTab === 'trade' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Asset Chart & Bento Health Matrix (Span 8) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <TickerCard
                    activeSymbol={activeSymbol}
                    onSymbolChange={setActiveSymbol}
                  />
                  
                  <BentoHealth />
                </div>

                {/* Right Column: Action panel with Leverage Slider (Span 4) */}
                <div className="lg:col-span-4">
                  <TradeController
                    symbol={activeSymbol}
                    onTradeStarted={handleTradeStarted}
                    onTradeUpdated={handleTradeUpdated}
                  />
                </div>

                {/* Bottom Row: Tabbed Workspace Grid (Span 12) */}
                <div className="lg:col-span-12">
                  <ActivityLog
                    trades={trades}
                    onClearTrades={handleClearTrades}
                  />
                </div>
              </div>
            )}

            {activeTab === 'bot' && (
              <BotBuilder symbol={activeSymbol} />
            )}

            {activeTab === 'scanner' && (
              <MarketScanner />
            )}

            {activeTab === 'social' && (
              <SocialLeaderboard />
            )}
          </main>
        </div>
      ) : (
        // Landing Page / Login Flow
        <main className="flex-1 py-12 md:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden max-w-7xl mx-auto w-full">
          {/* Aesthetic background mesh & glow points */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

          {/* Premium Hero Section - Two Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
            
            {/* Left Column: Headline and Trust Signals */}
            <div className="lg:col-span-7 text-left flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6 border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5" />
                Delegated Secure Authentication
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none mb-6 text-white">
                Secure Deriv Proxy Trading,{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                  Redefined.
                </span>
              </h1>
              
              <p className="text-zinc-400 text-sm sm:text-base md:text-lg leading-relaxed mb-8 max-w-2xl">
                EchoMargin bridges the official Deriv API via a secure, enterprise-grade backend proxy. 
                Keep your private keys out of unsafe browser variables, stream real-time ticks with zero delay, and trade securely.
              </p>

              {/* Bulleted trust factors */}
              <div className="space-y-3.5 text-zinc-300 text-xs sm:text-sm font-medium w-full">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">✓</span>
                  </div>
                  <span><strong className="text-white">Zero Token Leakage:</strong> Credentials stored strictly in HttpOnly server sessions.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">✓</span>
                  </div>
                  <span><strong className="text-white">Low-Latency WebSockets:</strong> Native proxying for real-time tick streaming.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">✓</span>
                  </div>
                  <span><strong className="text-white">Complete Automation:</strong> Martingale, D'Alembert & Custom indicator bots.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">✓</span>
                  </div>
                  <span><strong className="text-white">Social Leaderboard:</strong> Instantly share and copy trades with secure URLs.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Connection / Login Portal Card */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 w-full shadow-2xl relative group max-w-md">
                
                {/* Glowing status indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active
                </div>

                <div className="pt-4 mb-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border border-zinc-850 shadow-xl group-hover:scale-105 transition-transform duration-300 mb-4">
                    <Lock className="w-5 h-5 text-zinc-950" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect Your Account</h3>
                  <p className="text-xs text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
                    Authorize via Deriv OAuth. Rest assured, your credentials are saved in safe, encrypted cookies.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <LoginButton />
                  <button
                    onClick={enableDemoMode}
                    className="w-full py-3.5 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-750 active:scale-[0.98] transition-all text-emerald-400 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Explore Demo Terminal
                  </button>
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
                  SSL & AES-256 Encrypted Session Bridge
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Showcase Preview */}
          <div className="mb-24 text-center">
            <div className="max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-850 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Cpu className="w-3.5 h-3.5" />
                Feature Tour Preview
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Step inside the trading cockpit
              </h2>
              <p className="text-zinc-400 text-sm">
                Get a glimpse of our automated system, pattern scanner, copy trading panel, and low-latency execution log feeds.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <AppShowcasePreview />
            </div>
          </div>

          {/* Core Features Grid */}
          <div className="border-t border-zinc-900 pt-16 mb-24 w-full">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-12">
              Engineered for Speed & Security
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
              {/* Feature 1 */}
              <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-900/40 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">No Client Leakage</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Authentication tokens are stored strictly in secure server-side session maps, shielding your private key credentials from third-party browser extensions or XSS injection exploits.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-900/40 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Proxy Bridge</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  WebSockets bridge data seamlessly, appending security headers, controlling heartbeat pings, and handling rate-limiting natively on our high-performance Node backend.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-900/40 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                  <LineChart className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Canvas Charts</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fluid, high-performance HTML5 canvas lines trace Volatility Indices in real-time. Analyze tick history and pinpoint exact entry and exit points instantly.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-900/40 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-2 tracking-wide uppercase">Trade Simulator</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Formulate proposals, buy contracts, and subscribe to open contract updates. Get instant result notifications and calculations with zero lag.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Info Section: The Architecture */}
          <div className="border-t border-zinc-900 pt-16 mb-24 w-full text-left font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-500/20">
                  <Server className="w-3.5 h-3.5" />
                  Secure Infrastructure Architecture
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
                  Why Proxying the Deriv API is Essential for Serious Traders
                </h3>
                <div className="space-y-6 text-zinc-400 text-sm">
                  <p>
                    Traditional trading frontends communicate directly with broker endpoints from the browser. This requires loading your API keys, OAuth tokens, and account identifiers into the browser state, exposing them to potential session-hijacking scripts or client-side threats.
                  </p>
                  <p>
                    <strong>EchoMargin resolves this vulnerability.</strong> By utilizing a secure backend proxy server, all sensitive credentials remain strictly serverside inside HTTP-Only session cookies. The frontend client only handles UI state and UI-rendered tickers, providing complete protection.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  EchoMargin Security Layers
                </h4>
                
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                    <div>
                      <h5 className="text-sm font-bold text-white mb-1">HttpOnly Cookie Storage</h5>
                      <p className="text-xs text-zinc-500 leading-relaxed">Deriv API tokens are saved in secure, cookie-header restricted maps, invisible to JavaScript.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                    <div>
                      <h5 className="text-sm font-bold text-white mb-1">Encrypted Tunneling</h5>
                      <p className="text-xs text-zinc-500 leading-relaxed">WebSocket messages are routed through an encrypted SSL/TLS tunnel using Railway's secure edge routing.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                    <div>
                      <h5 className="text-sm font-bold text-white mb-1">Real-Time Heartbeats</h5>
                      <p className="text-xs text-zinc-500 leading-relaxed">Automatic ping/pong checks keep WebSocket connections active, avoiding timeouts and reconnections during trade execution.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Suite Details */}
          <div className="border-t border-zinc-900 pt-16 pb-12 w-full text-left font-sans">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-12">
              A Complete Automation & Trading Suite
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Bot Builder */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-6 rounded-2xl hover:border-zinc-800 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-850 mb-4 text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">Automated Bot Builder</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Set up Martingale, D'Alembert, or simple flat-stake trading bots. Program criteria based on tick triggers and execute trades programmatically without writing a single line of code.
                </p>
              </div>

              {/* Pattern Scanner */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-6 rounded-2xl hover:border-zinc-800 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-850 mb-4 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">Market Trend Scanner</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Scan multiple Volatility Indices simultaneously. Get notified when trends break, or when specific rise/fall patterns emerge to secure high-probability trade setups.
                </p>
              </div>

              {/* Copy Trading */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-6 rounded-2xl hover:border-zinc-800 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-850 mb-4 text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">Copy Trading Network</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Generate unique session invitation links directly from your dashboard. Share them with other traders to replicate your trades and build a collaborative social group.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 text-center text-zinc-600 text-xs font-medium">
        &copy; {new Date().getFullYear()} EchoMargin. Built for secure WebSocket Deriv integration.
      </footer>
    </div>
  );
}
