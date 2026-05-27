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
import { Shield, Zap, LineChart, Cpu, Lock, Bot, Activity, Users, LayoutDashboard } from 'lucide-react';

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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-1">
            EchoMargin
          </h2>
          <p className="text-xs text-zinc-500">Initializing secure session proxy...</p>
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
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Aesthetic background mesh & glow points */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl -z-10"></div>

          <div className="max-w-4xl w-full text-center flex flex-col items-center">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-emerald-400 mb-6 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Secure OAuth & Client Session Bridge
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-6">
              Trading interface,{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                reimagined & secure.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="max-w-xl text-zinc-400 text-sm sm:text-base leading-relaxed mb-8">
              EchoMargin bridges the Deriv API via a secure backend proxy server.
              Keep OAuth credentials out of local storage, stream real-time ticks,
              and run contract calculations instantly on a beautiful, glassmorphic UI.
            </p>

            {/* Dynamic Login Trigger Card */}
            <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative mb-12">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-4 border-zinc-950 shadow-xl">
                <Lock className="w-8 h-8 text-zinc-950" />
              </div>
              
              <div className="pt-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Connect Your Account</h3>
                <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
                  Authorizing grants access to Deriv's virtual or real trading profiles under safe, encrypted session cookies.
                </p>
              </div>

              <LoginButton />
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full text-left mt-6 border-t border-zinc-900 pt-12">
              {/* Feature 1 */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-3 text-emerald-400">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-1.5">No Client Leakage</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Authentication tokens are stored strictly in secure server session maps, safeguarding credentials from browser exploits.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-3 text-emerald-400">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-1.5">Proxy Bridge</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  WebSockets bridge data seamlessly, appending security headers and handling handshakes natively over Node backend.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-3 text-emerald-400">
                  <LineChart className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-1.5">Canvas Charts</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Fluid, high-performance canvas lines trace indices in real-time. Visually track price directions instantly.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-3 text-emerald-400">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-extrabold text-white mb-1.5">Trade Simulator</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Formulate proposals, buy CALL/PUT contracts, and subscribe to open contract updates with instant result calculations.
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
