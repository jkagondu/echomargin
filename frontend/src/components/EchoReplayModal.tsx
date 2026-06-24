"use client";

import React, { useRef, useState } from 'react';
import Logo from '@/components/Logo';
import { X, Send, Copy, Check, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

interface EchoReplayModalProps {
  trade: LoggedTrade;
  onClose: () => void;
}

export default function EchoReplayModal({ trade, onClose }: EchoReplayModalProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const stake = trade.stake;
  const profit = trade.profit || 0;
  const isWon = profit >= 0;
  const roi = stake > 0 ? (profit / stake) * 100 : 0;
  const formattedRoi = roi.toFixed(1);

  const shareText = `Just secured a ${isWon ? '+' : ''}${formattedRoi}% return on EchoMargin trading ${trade.symbol.replace('R_', 'Volatility ')} index! 🚀 Connected securely via Deriv Proxy. https://echomargin.com`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://echomargin.com')}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
      {/* Modal Container */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            Echo Replay Social Card
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shareable Card Canvas Mockup */}
        <div className="p-6 flex flex-col items-center">
          <div 
            ref={cardRef}
            className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-emerald-500/20 p-6 relative overflow-hidden shadow-2xl aspect-[1.91/1] flex flex-col justify-between group"
          >
            {/* Mesh Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0596690c_1px,transparent_1px),linear-gradient(to_bottom,#0596690c_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
            
            {/* Card Top */}
            <div className="flex items-center justify-between relative z-10">
              <Logo size="sm" iconOnly={false} />
              <div className="text-right">
                <span className="text-[8px] font-mono text-zinc-500 block uppercase">SECURE PROXY RECEIPT</span>
                <span className="text-[10px] font-mono text-zinc-400">ID: #{trade.id.slice(0, 8)}</span>
              </div>
            </div>

            {/* Card Middle: ROI / DIRECTION */}
            <div className="my-3 relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[8px] text-zinc-500 block uppercase font-bold tracking-wider">CONTRACT</span>
                <span className="text-base font-extrabold text-white flex items-center gap-1">
                  {trade.symbol.replace('R_', 'Vol ')}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                    ['CALL', 'TOUCH', 'DIGITMATCH', 'DIGITEVEN', 'DIGITOVER'].includes(trade.type) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {trade.type}
                  </span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[8px] text-zinc-500 block uppercase font-bold tracking-wider">RETURN ON STAKE</span>
                <div className={`text-2xl font-black font-mono tracking-tight flex items-center justify-end ${
                  isWon ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isWon ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                  {isWon ? '+' : ''}{formattedRoi}%
                </div>
              </div>
            </div>

            {/* Card Bottom: Entry / Exit Details */}
            <div className="border-t border-zinc-900/60 pt-3 relative z-10 grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-zinc-600 block uppercase font-bold text-[8px]">Stake</span>
                <span className="text-zinc-300 font-bold">${stake.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-600 block uppercase font-bold text-[8px]">Profit</span>
                <span className={`font-bold ${isWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isWon ? '+' : ''}${profit.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-600 block uppercase font-bold text-[8px]">Execution Spot</span>
                <span className="text-zinc-300 font-bold">{trade.buyPrice?.toFixed(3) || '---'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="px-6 pb-6 pt-2 border-t border-zinc-850 bg-zinc-950/20 flex flex-col gap-3">
          <p className="text-xs text-zinc-500 leading-relaxed text-center">
            Share this trade card directly with your followers to demonstrate secure proxy performance.
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleCopyText}
              className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  Copy Link
                </>
              )}
            </button>

            <button
              onClick={handleShareTwitter}
              className="py-3 px-4 rounded-xl bg-[#1DA1F2] hover:bg-[#1a90da] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share X
            </button>

            <button
              onClick={handleShareTelegram}
              className="py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 fill-white" />
              Telegram
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
