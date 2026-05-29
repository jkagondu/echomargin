"use client";

import React, { useState } from 'react';
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
import { Shield, Zap, LineChart, Cpu, Lock, Bot, Activity, Users, LayoutDashboard, ArrowRight, Server, RefreshCw } from 'lucide-react';

interface LoggedTrade {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT';
  stake: number;
  status: 'purchasing' | 'open' | 'won' | 'lost';
  buyPrice?: number;
  exitPrice?: number;
  payout?: number;
  profit?: number;
  timestamp: number;
}

export default function Home() {
  const { authorized, isConnecting } = useDerivWebSocket();
  const [activeSymbol, setActiveSymbol] = useState('R_100');
  const [trades, setTrades] = useState<LoggedTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'trade' | 'bot' | 'scanner' | 'social'>('trade');

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
      <Navbar />

      {authorized ? (
        // Authorized Dashboard Layout
        <div className="flex-1 flex flex-col">
          
          {/* Dashboard Sub-Header with Tab Selection */}
          <div className="bg-zinc-900/40 border-b border-zinc-900 py-3.5 px-6">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <div className="flex gap-2 sm:gap-4">
                
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
                {/* Left Column: Asset Feed & Trading Controls (Span 5) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <TickerCard
                    activeSymbol={activeSymbol}
                    onSymbolChange={setActiveSymbol}
                  />
                  
                  <TradeController
                    symbol={activeSymbol}
                    onTradeStarted={handleTradeStarted}
                    onTradeUpdated={handleTradeUpdated}
                  />
                </div>

                {/* Right Column: Logs, History & Developer Terminal (Span 7) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
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
        <main className="flex-1 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Aesthetic background mesh & glow points */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-10 right-10 w-96 h-96 bg-zinc-900/10 border border-zinc-800/10 rounded-full -z-10 flex items-center justify-center">
            <div className="w-72 h-72 border border-zinc-800/20 rounded-full"></div>
          </div>

          <div className="max-w-5xl w-full text-center flex flex-col items-center">
            
            {/* Logo Header */}
            <Logo size="lg" className="mb-10" />

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-8 max-w-4xl">
              Secure Deriv Proxy Trading,{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                Redefined.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="max-w-2xl text-zinc-400 text-sm sm:text-base md:text-lg leading-relaxed mb-10">
              EchoMargin bridges the Deriv API via an enterprise-grade backend proxy server.
              Keep your sensitive OAuth tokens out of unsafe local storage, stream low-latency real-time ticks,
              and execute manual and automated trades instantly.
            </p>

            {/* Dynamic Login Trigger Card */}
            <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl relative mb-16 group">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-4 border-zinc-950 shadow-xl group-hover:scale-105 transition-transform duration-300">
                <Lock className="w-8 h-8 text-zinc-950" />
              </div>
              
              <div className="pt-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Account</h3>
                <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                  Authorizing grants access to Deriv's virtual or real trading profiles under safe, encrypted HttpOnly session cookies.
                </p>
              </div>

              <LoginButton />
              
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
                SSL & AES-256 Encrypted Session Bridge
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full text-left mt-6 border-t border-zinc-900 pt-12">
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

            {/* Detailed Info Section: The Architecture */}
            <div className="mt-24 border-t border-zinc-900 pt-16 w-full text-left">
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
            <div className="mt-24 border-t border-zinc-900 pt-16 pb-12 w-full text-left">
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
