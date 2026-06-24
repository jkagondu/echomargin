"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { TrendingUp, TrendingDown, DollarSign, Clock, RefreshCw, AlertCircle, CheckCircle2, Sliders, Zap } from 'lucide-react';

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

interface TradeControllerProps {
  symbol: string;
  onTradeStarted: (trade: LoggedTrade) => void;
  onTradeUpdated: (trade: LoggedTrade) => void;
}

export default function TradeController({ symbol, onTradeStarted, onTradeUpdated }: TradeControllerProps) {
  const { sendRequest, subscribeContract, unsubscribeContract, activeAccount, authorized, isConnected, broadcastTradeSignal } = useDerivWebSocket();
  const [stake, setStake] = useState('10');
  const [duration, setDuration] = useState('5');
  const [leverage, setLeverage] = useState(20);
  const [orderTab, setOrderTab] = useState<'market' | 'limit' | 'derivatives'>('market');
  const [tradingState, setTradingState] = useState<'idle' | 'proposing' | 'buying' | 'running' | 'completed' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState('');
  
  type TradeCategory = 'rise_fall' | 'higher_lower' | 'touch_no_touch' | 'matches_differs' | 'even_odd' | 'over_under';
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>('rise_fall');
  const [barrier, setBarrier] = useState('+0.5');
  const [lastDigitPrediction, setLastDigitPrediction] = useState(0);
  
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

  const executeTrade = async (contractType: string) => {
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
    window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: initialTrade }));

    // Broadcast the trade to anyone copying this account
    broadcastTradeSignal(activeAccount.accountId, initialTrade);

    try {
      // 1. Get contract proposal from Deriv
      console.log('[TRADE] Requesting proposal...');
      const payload: any = {
        proposal: 1,
        amount: stakeVal,
        basis: 'stake',
        contract_type: contractType,
        currency: activeAccount.currency,
        duration: durationVal,
        duration_unit: 't', // ticks
        symbol: symbol
      };

      if (tradeCategory === 'higher_lower' || tradeCategory === 'touch_no_touch') {
        payload.barrier = barrier;
      } else if (tradeCategory === 'matches_differs' || tradeCategory === 'over_under') {
        payload.barrier = lastDigitPrediction;
      }

      const proposalRes = await sendRequest(payload);

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
      window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: runningTrade }));

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

        const updatedObj: LoggedTrade = {
          id: contractId,
          symbol: contract.underlying,
          type: contract.contract_type || contractType,
          stake: parseFloat(contract.buy_price),
          status,
          buyPrice: contract.barrier ? parseFloat(contract.barrier) : undefined,
          exitPrice: contract.exit_tick ? parseFloat(contract.exit_tick) : undefined,
          payout: contract.payout ? parseFloat(contract.payout) : undefined,
          profit: contract.profit ? parseFloat(contract.profit) : undefined,
          timestamp: contract.date_start * 1000
        };
        onTradeUpdated(updatedObj);
        window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: updatedObj }));
      });

    } catch (err: any) {
      console.error('[TRADE] Error during execution:', err);
      setErrorDetails(err.message || 'Trade execution failed.');
      setTradingState('error');
      
      const errTrade: LoggedTrade = {
        id: tempId,
        symbol,
        type: contractType,
        stake: stakeVal,
        status: 'lost',
        profit: -stakeVal,
        timestamp: Date.now()
      };
      onTradeUpdated(errTrade);
      window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: errTrade }));
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-[482px] justify-between group">
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
          <div className="flex flex-col gap-4">
            
            {/* Multi-tab container (Market, Limit, Advanced Derivatives) */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
              <button
                onClick={() => setOrderTab('market')}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderTab === 'market'
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderTab('limit')}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderTab === 'limit'
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Limit
              </button>
              <button
                onClick={() => setOrderTab('derivatives')}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderTab === 'derivatives'
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Derivatives
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              <select
                value={tradeCategory}
                onChange={(e) => setTradeCategory(e.target.value as TradeCategory)}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer w-full"
              >
                <option value="rise_fall">Rise / Fall</option>
                <option value="higher_lower">Higher / Lower</option>
                <option value="touch_no_touch">Touch / No Touch</option>
                <option value="matches_differs">Matches / Differs</option>
                <option value="even_odd">Even / Odd</option>
                <option value="over_under">Over / Under</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {(tradeCategory === 'higher_lower' || tradeCategory === 'touch_no_touch') && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-500/40">
                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Barrier Offset</label>
                <input
                  type="text"
                  value={barrier}
                  onChange={(e) => setBarrier(e.target.value)}
                  className="bg-transparent text-white font-semibold font-mono text-base focus:outline-none w-full"
                />
              </div>
            )}

            {(tradeCategory === 'matches_differs' || tradeCategory === 'over_under') && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-500/40">
                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Last Digit Prediction</label>
                <select
                  value={lastDigitPrediction}
                  onChange={(e) => setLastDigitPrediction(parseInt(e.target.value))}
                  className="bg-transparent text-white font-semibold font-mono text-base focus:outline-none w-full cursor-pointer"
                >
                  {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
                </select>
              </div>
            )}

            {/* Tactile Leverage Slider */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  Leverage Multiplier
                </span>
                <span className="text-emerald-400 font-mono text-xs">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-emerald-400 bg-zinc-900 h-1 rounded-lg cursor-pointer focus:outline-none"
              />
              <div className="flex justify-between text-[8px] text-zinc-600 font-bold font-mono">
                <span>1X</span>
                <span>20X</span>
                <span>50X</span>
                <span>100X</span>
              </div>
            </div>

            {/* Simulated Margin Requirement */}
            <div className="flex justify-between items-center text-[10px] px-1 font-mono text-zinc-500">
              <span>EST. MARGIN REQUIREMENT</span>
              <span className="text-zinc-300 font-bold">${(parseFloat(stake || '0') / leverage).toFixed(2)} USD</span>
            </div>

          </div>
 
          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              let btn1 = { type: 'CALL', label: 'RISE', icon: TrendingUp, color: 'emerald' };
              let btn2 = { type: 'PUT', label: 'FALL', icon: TrendingDown, color: 'rose' };
              
              if (tradeCategory === 'higher_lower') {
                btn1 = { type: 'CALL', label: 'HIGHER', icon: TrendingUp, color: 'emerald' };
                btn2 = { type: 'PUT', label: 'LOWER', icon: TrendingDown, color: 'rose' };
              } else if (tradeCategory === 'touch_no_touch') {
                btn1 = { type: 'TOUCH', label: 'TOUCH', icon: CheckCircle2, color: 'emerald' };
                btn2 = { type: 'NOTOUCH', label: 'NO TOUCH', icon: AlertCircle, color: 'rose' };
              } else if (tradeCategory === 'matches_differs') {
                btn1 = { type: 'DIGITMATCH', label: 'MATCHES', icon: CheckCircle2, color: 'emerald' };
                btn2 = { type: 'DIGITDIFF', label: 'DIFFERS', icon: AlertCircle, color: 'rose' };
              } else if (tradeCategory === 'even_odd') {
                btn1 = { type: 'DIGITEVEN', label: 'EVEN', icon: TrendingUp, color: 'emerald' };
                btn2 = { type: 'DIGITODD', label: 'ODD', icon: TrendingDown, color: 'rose' };
              } else if (tradeCategory === 'over_under') {
                btn1 = { type: 'DIGITOVER', label: 'OVER', icon: TrendingUp, color: 'emerald' };
                btn2 = { type: 'DIGITUNDER', label: 'UNDER', icon: TrendingDown, color: 'rose' };
              }

              const colors = {
                emerald: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
                rose: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
              };

              return (
                <>
                  <button
                    onClick={() => executeTrade(btn1.type)}
                    className={`py-4 rounded-xl ${colors[btn1.color as keyof typeof colors]} active:scale-95 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-lg cursor-pointer`}
                  >
                    <btn1.icon className="w-4.5 h-4.5 stroke-[3]" />
                    {btn1.label}
                  </button>
                  <button
                    onClick={() => executeTrade(btn2.type)}
                    className={`py-4 rounded-xl ${colors[btn2.color as keyof typeof colors]} active:scale-95 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-lg cursor-pointer`}
                  >
                    <btn2.icon className="w-4.5 h-4.5 stroke-[3]" />
                    {btn2.label}
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Loading States (Proposing / Buying) */}
      {(tradingState === 'proposing' || tradingState === 'buying') && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
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
        <div className="flex-1 flex flex-col justify-between py-4">
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

          <div className="w-full bg-zinc-850 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${((activeContract?.tick_count || 0) / parseInt(duration)) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {tradingState === 'completed' && (
        <div className="flex-1 flex flex-col justify-between py-4">
          <div className="text-center pt-2">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {activeContract?.status === 'won' ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
                  <span className="text-emerald-400 font-black tracking-wider uppercase text-lg">CONTRACT WON</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-rose-400 animate-pulse" />
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
        <div className="flex-1 flex flex-col justify-between py-4">
          <div className="text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-rose-400 mb-1">Execution Restricted</h4>
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
