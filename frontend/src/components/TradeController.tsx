"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { TrendingUp, TrendingDown, DollarSign, Clock, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';

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

interface TradeControllerProps {
  symbol: string;
  onTradeStarted: (trade: LoggedTrade) => void;
  onTradeUpdated: (trade: LoggedTrade) => void;
}

export default function TradeController({ symbol, onTradeStarted, onTradeUpdated }: TradeControllerProps) {
  const { sendRequest, subscribeContract, unsubscribeContract, activeAccount, authorized, isConnected } = useDerivWebSocket();
  const [stake, setStake] = useState('10');
  const [duration, setDuration] = useState('5');
  const [tradingState, setTradingState] = useState<'idle' | 'proposing' | 'buying' | 'running' | 'completed' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState('');
  
  // Track active running contract details in local state
  const [activeContract, setActiveContract] = useState<any>(null);
  const activeContractId = useRef<string | null>(null);
  const activeSubId = useRef<string | null>(null);

  const cleanUpContractSub = async () => {
    if (activeContractId.current) {
      unsubscribeContract(activeContractId.current);
    }
    if (activeSubId.current) {
      try {
        await sendRequest({ forget: activeSubId.current });
      } catch (err) {
        console.error('Failed to forget contract subscription:', err);
      }
    }
    activeContractId.current = null;
    activeSubId.current = null;
  };

  useEffect(() => {
    return () => {
      cleanUpContractSub();
    };
  }, []);

  const executeTrade = async (contractType: 'CALL' | 'PUT') => {
    if (!isConnected || !authorized || !activeAccount) {
      setErrorDetails('You must be connected and authorized to execute trades.');
      setTradingState('error');
      return;
    }

    const stakeVal = parseFloat(stake);
    const durationVal = parseInt(duration);

    if (isNaN(stakeVal) || stakeVal < 0.35) {
      setErrorDetails('Minimum stake is $0.35.');
      setTradingState('error');
      return;
    }

    if (isNaN(durationVal) || durationVal < 1 || durationVal > 10) {
      setErrorDetails('Duration must be between 1 and 10 ticks.');
      setTradingState('error');
      return;
    }

    setTradingState('proposing');
    setErrorDetails('');
    setActiveContract(null);
    await cleanUpContractSub();

    const tempId = 'pending-' + Date.now();
    const initialTrade: LoggedTrade = {
      id: tempId,
      symbol,
      type: contractType,
      stake: stakeVal,
      status: 'purchasing',
      timestamp: Date.now()
    };
    onTradeStarted(initialTrade);

    try {
      // 1. Get contract proposal from Deriv
      console.log('[TRADE] Requesting proposal...');
      const proposalRes = await sendRequest({
        proposal: 1,
        amount: stakeVal,
        basis: 'stake',
        contract_type: contractType,
        currency: activeAccount.currency,
        duration: durationVal,
        duration_unit: 't', // ticks
        symbol: symbol
      });

      if (proposalRes.error) {
        throw new Error(proposalRes.error.message);
      }

      const proposalId = proposalRes.proposal.id;
      console.log(`[TRADE] Proposal received: ${proposalId}. Executing buy...`);
      setTradingState('buying');

      // 2. Execute buy using the proposal ID
      const buyRes = await sendRequest({
        buy: proposalId,
        price: stakeVal
      });

      if (buyRes.error) {
        throw new Error(buyRes.error.message);
      }

      const contractId = String(buyRes.buy.contract_id);
      console.log(`[TRADE] Purchase successful! Contract ID: ${contractId}`);
      activeContractId.current = contractId;
      setTradingState('running');

      const runningTrade: LoggedTrade = {
        ...initialTrade,
        id: contractId,
        status: 'open',
        buyPrice: buyRes.buy.start_val
      };
      onTradeUpdated(runningTrade);

      // 3. Subscribe to the contract's outcome
      const contractSub = await sendRequest({
        proposal_open_contract: 1,
        contract_id: buyRes.buy.contract_id,
        subscribe: 1
      });

      if (contractSub.error) {
        throw new Error(contractSub.error.message);
      }

      activeSubId.current = contractSub.subscription.id;

      // Handle contract stream updates
      subscribeContract(contractId, (contract) => {
        setActiveContract(contract);

        // Update parent log with latest status
        const isSold = contract.is_sold === 1;
        let status: 'open' | 'won' | 'lost' = 'open';
        if (isSold) {
          status = contract.status === 'won' ? 'won' : 'lost';
          setTradingState('completed');
          cleanUpContractSub();
        }

        onTradeUpdated({
          id: contractId,
          symbol: contract.underlying,
          type: contract.contract_type === 'CALL' ? 'CALL' : 'PUT',
          stake: parseFloat(contract.buy_price),
          status,
          buyPrice: contract.barrier ? parseFloat(contract.barrier) : undefined,
          exitPrice: contract.exit_tick ? parseFloat(contract.exit_tick) : undefined,
          payout: contract.payout ? parseFloat(contract.payout) : undefined,
          profit: contract.profit ? parseFloat(contract.profit) : undefined,
          timestamp: contract.date_start * 1000
        });
      });

    } catch (err: any) {
      console.error('[TRADE] Error during execution:', err);
      setErrorDetails(err.message || 'Trade execution failed.');
      setTradingState('error');
      
      // Update parent log to fail
      onTradeUpdated({
        id: tempId,
        symbol,
        type: contractType,
        stake: stakeVal,
        status: 'lost',
        profit: -stakeVal,
        timestamp: Date.now()
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-emerald-400';
      case 'lost': return 'text-rose-400';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-[320px] justify-between">
      {/* Background glow when trade is running */}
      {tradingState === 'running' && (
        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>
      )}
      {tradingState === 'completed' && activeContract?.status === 'won' && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
      )}
      {tradingState === 'completed' && activeContract?.status === 'lost' && (
        <div className="absolute inset-0 bg-rose-500/5 pointer-events-none"></div>
      )}

      {/* Main UI Panel States */}
      {tradingState === 'idle' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Trading Controller</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Stake input */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-500/40">
                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                  Stake ({activeAccount?.currency || 'USD'})
                </label>
                <input
                  type="number"
                  min="0.35"
                  step="0.5"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="bg-transparent text-white font-semibold font-mono text-base focus:outline-none w-full"
                />
              </div>

              {/* Duration input */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-500/40">
                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  Duration (Ticks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-transparent text-white font-semibold font-mono text-base focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => executeTrade('CALL')}
              className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <TrendingUp className="w-4.5 h-4.5 stroke-[3]" />
              RISE / BUY
            </button>
            <button
              onClick={() => executeTrade('PUT')}
              className="py-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-rose-500/20 cursor-pointer"
            >
              <TrendingDown className="w-4.5 h-4.5 stroke-[3]" />
              FALL / SELL
            </button>
          </div>
        </>
      )}

      {/* Loading States (Proposing / Buying) */}
      {(tradingState === 'proposing' || tradingState === 'buying') && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
          <h4 className="text-sm font-bold text-white mb-1">
            {tradingState === 'proposing' ? 'Requesting Proposal Details' : 'Executing Market Order'}
          </h4>
          <p className="text-xs text-zinc-500 max-w-[240px]">
            Please wait while EchoMargin secures your rate and purchases the contract.
          </p>
        </div>
      )}

      {/* Running State */}
      {tradingState === 'running' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                Live Contract Tracking
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-bold uppercase">
                {activeContract?.contract_type || 'Contract'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase mb-0.5">Barrier Spot</span>
                <span className="text-sm font-bold font-mono text-zinc-300">
                  {activeContract?.barrier || 'Calculating...'}
                </span>
              </div>
              <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase mb-0.5">Current Spot</span>
                <span className="text-sm font-bold font-mono text-white">
                  {activeContract?.current_spot || 'Calculating...'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs px-1">
              <span className="text-zinc-500 font-semibold">
                Ticks: <span className="text-zinc-300 font-bold font-mono">{activeContract?.tick_count || 0} / {duration}</span>
              </span>
              <span className="text-zinc-500 font-semibold">
                Profit/Loss: <span className={`font-bold font-mono ${
                  activeContract?.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {activeContract?.profit !== undefined
                    ? `${activeContract.profit >= 0 ? '+' : ''}${parseFloat(activeContract.profit).toFixed(2)} ${activeAccount?.currency}`
                    : '---'}
                </span>
              </span>
            </div>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${((activeContract?.tick_count || 0) / parseInt(duration)) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {tradingState === 'completed' && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="text-center pt-2">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {activeContract?.status === 'won' ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-black tracking-wider uppercase text-lg">CONTRACT WON</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                  <span className="text-rose-400 font-black tracking-wider uppercase text-lg">CONTRACT LOST</span>
                </>
              )}
            </div>
            
            <p className="text-zinc-500 text-xs font-mono mb-4">
              Contract ID: {activeContract?.contract_id}
            </p>

            <div className="grid grid-cols-3 gap-2 px-2">
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Stake</span>
                <span className="text-xs font-bold font-mono text-zinc-300">
                  {parseFloat(activeContract?.buy_price).toFixed(2)}
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Payout</span>
                <span className="text-xs font-bold font-mono text-zinc-300">
                  {parseFloat(activeContract?.payout).toFixed(2)}
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Return</span>
                <span className={`text-xs font-bold font-mono ${
                  activeContract?.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {activeContract?.profit >= 0 ? '+' : ''}
                  {parseFloat(activeContract?.profit).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setTradingState('idle')}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            New Trade Placement
          </button>
        </div>
      )}

      {/* Error State */}
      {tradingState === 'error' && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-rose-400 mb-1">Execution Restriced</h4>
            <p className="text-xs text-zinc-500 max-w-[260px] line-clamp-3">
              {errorDetails}
            </p>
          </div>

          <button
            onClick={() => setTradingState('idle')}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
