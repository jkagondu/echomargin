"use client";

import React, { useState } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { Terminal, History, ArrowUpRight, ArrowDownRight, Trash2, ArrowLeftRight, Activity, Share2, ClipboardList } from 'lucide-react';
import EchoReplayModal from '@/components/EchoReplayModal';

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

interface ActivityLogProps {
  trades: LoggedTrade[];
  onClearTrades: () => void;
}

export default function ActivityLog({ trades, onClearTrades }: ActivityLogProps) {
  const { wsLogs } = useDerivWebSocket();
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'terminal'>('positions');
  const [selectedShareTrade, setSelectedShareTrade] = useState<LoggedTrade | null>(null);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Filter positions (Open or Purchasing status)
  const openPositions = trades.filter(t => t.status === 'open' || t.status === 'purchasing');
  // Filter history (Won or Lost status)
  const completedHistory = trades.filter(t => t.status === 'won' || t.status === 'lost');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'purchasing':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse font-bold uppercase">Buying</span>;
      case 'open':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse font-bold uppercase">Active</span>;
      case 'won':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">Won</span>;
      case 'lost':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">Lost</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[400px]">
      {/* Tabs Header */}
      <div className="bg-zinc-950/80 border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 transition-colors cursor-pointer ${
              activeTab === 'positions'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-extrabold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            Open Positions ({openPositions.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-extrabold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <History className="w-4 h-4" />
            Trade History Echo ({completedHistory.length})
          </button>
          
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 transition-colors cursor-pointer ${
              activeTab === 'terminal'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-extrabold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            WS Console Log
          </button>
        </div>

        {activeTab === 'history' && completedHistory.length > 0 && (
          <button
            onClick={onClearTrades}
            className="text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950/20">
        
        {/* TAB 1: OPEN POSITIONS */}
        {activeTab === 'positions' && (
          <div className="h-full overflow-y-auto p-4">
            {openPositions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600">
                <ClipboardList className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-700" />
                <p className="text-xs font-semibold">No open derivative positions.</p>
                <p className="text-[10px] max-w-[220px] mt-0.5 text-zinc-700 leading-relaxed">
                  Enter stake and click Buy/Sell on the Right Action Panel to initiate a contract.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-850 pb-2">
                    <th className="py-2 pl-2">Time</th>
                    <th className="py-2">Asset</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 font-mono">Contract ID</th>
                    <th className="py-2 text-right">Stake</th>
                    <th className="py-2 text-right pr-4">Barrier Spot</th>
                    <th className="py-2 pr-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {openPositions.map((trade) => (
                    <tr key={trade.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 pl-2 text-zinc-500 font-medium">{formatTime(trade.timestamp)}</td>
                      <td className="py-3 text-white font-semibold">{trade.symbol.replace('R_', 'Vol ')}</td>
                      <td className="py-3">
                        <span className={`flex items-center gap-0.5 font-bold ${
                          ['CALL', 'TOUCH', 'DIGITMATCH', 'DIGITEVEN', 'DIGITOVER'].includes(trade.type) ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {['CALL', 'TOUCH', 'DIGITMATCH', 'DIGITEVEN', 'DIGITOVER'].includes(trade.type) ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[10px] text-zinc-400">
                        {trade.id.startsWith('pending') ? 'Purchasing...' : trade.id}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-400">
                        ${trade.stake.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono text-zinc-400 pr-4">
                        {trade.buyPrice?.toFixed(3) || '---'}
                      </td>
                      <td className="py-3 pr-2 text-center">{getStatusBadge(trade.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: TRADE HISTORY ECHO */}
        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto p-4">
            {completedHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600">
                <History className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold">No trade history recorded yet.</p>
                <p className="text-[10px] max-w-[200px] mt-0.5 text-zinc-700">
                  Closed and liquidated contract settlements will echo here chronologically.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-850 pb-2">
                    <th className="py-2 pl-2">Time</th>
                    <th className="py-2">Asset</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 font-mono">Contract ID</th>
                    <th className="py-2 text-right">Stake</th>
                    <th className="py-2 text-right">Profit / ROI</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 pr-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {completedHistory.map((trade) => {
                    const isWin = trade.status === 'won';
                    const roi = trade.stake > 0 ? ((trade.profit || 0) / trade.stake) * 100 : 0;
                    
                    return (
                      <tr key={trade.id} className="hover:bg-zinc-900/40 transition-colors group">
                        <td className="py-3 pl-2 text-zinc-500 font-medium">{formatTime(trade.timestamp)}</td>
                        <td className="py-3 text-zinc-300 font-semibold">{trade.symbol.replace('R_', 'Vol ')}</td>
                        <td className="py-3">
                          <span className={`flex items-center gap-0.5 font-bold ${
                            ['CALL', 'TOUCH', 'DIGITMATCH', 'DIGITEVEN', 'DIGITOVER'].includes(trade.type) ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {['CALL', 'TOUCH', 'DIGITMATCH', 'DIGITEVEN', 'DIGITOVER'].includes(trade.type) ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-[10px] text-zinc-500 group-hover:text-zinc-400">
                          {trade.id}
                        </td>
                        <td className="py-3 text-right font-mono font-medium text-zinc-400">
                          ${trade.stake.toFixed(2)}
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {trade.profit !== undefined ? (
                            <>
                              {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                              <span className="text-[9px] font-bold block text-zinc-500">
                                {trade.profit >= 0 ? '+' : ''}{roi.toFixed(0)}%
                              </span>
                            </>
                          ) : '---'}
                        </td>
                        <td className="py-3 text-center">{getStatusBadge(trade.status)}</td>
                        <td className="py-3 pr-2 text-right">
                          <button
                            onClick={() => setSelectedShareTrade(trade)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-bold text-[9px] uppercase tracking-wide transition-all border border-emerald-500/20 hover:border-emerald-500 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            Replay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: WEBSOCKET TERMINAL CONSOLE */}
        {activeTab === 'terminal' && (
          <div className="h-full overflow-y-auto p-4 font-mono text-[11px] leading-relaxed flex flex-col-reverse select-text bg-zinc-950">
            {wsLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-700">
                <Terminal className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="font-sans text-xs">Waiting for WebSocket packets...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {wsLogs.map((log) => {
                  const isSend = log.type === 'send';
                  let parsed: any = {};
                  try {
                    parsed = JSON.parse(log.content);
                  } catch (e) {
                    parsed = { raw: log.content };
                  }

                  return (
                    <div key={log.id} className="border-b border-zinc-900/60 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-600 text-[9px]">
                          {formatTime(log.timestamp)}
                        </span>
                        
                        <span className={`px-1.5 py-0.2 rounded-[4px] text-[8px] font-extrabold uppercase flex items-center gap-0.5 ${
                          isSend 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        }`}>
                          <ArrowLeftRight className="w-2 h-2" />
                          {isSend ? 'Outbound Frame' : 'Inbound Frame'}
                        </span>

                        <span className="text-zinc-500 font-bold text-[9px]">
                          {parsed.msg_type || Object.keys(parsed)[0]}
                        </span>
                      </div>
                      
                      <pre className={`p-2 rounded-lg bg-zinc-900/40 text-left overflow-x-auto whitespace-pre-wrap ${
                        isSend ? 'text-blue-300/90' : 'text-zinc-300'
                      }`}>
                        {JSON.stringify(parsed, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Share / Replay Modal Popup */}
      {selectedShareTrade && (
        <EchoReplayModal
          trade={selectedShareTrade}
          onClose={() => setSelectedShareTrade(null)}
        />
      )}
    </div>
  );
}
