"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { Play, Square, Bot, TrendingUp, TrendingDown, RefreshCw, Activity, ShieldAlert, Award, AlertCircle } from 'lucide-react';

interface BotLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface BotBuilderProps {
  symbol: string;
  onTradeStarted?: (trade: any) => void;
  onTradeUpdated?: (trade: any) => void;
}

export default function BotBuilder({ symbol, onTradeStarted, onTradeUpdated }: BotBuilderProps) {
  const { sendRequest, subscribeTicks, unsubscribeTicks, subscribeContract, unsubscribeContract, activeAccount, authorized, isConnected, broadcastTradeSignal } = useDerivWebSocket();

  // Bot Configuration State
  const [strategy, setStrategy] = useState<'custom' | 'martingale' | 'dalembert' | 'scanner_sync'>('martingale');
  const [baseStake, setBaseStake] = useState('2');
  const [takeProfit, setTakeProfit] = useState('20');
  const [stopLoss, setStopLoss] = useState('15');
  
  // Custom Strategy parameters
  const [consecutiveTicks, setConsecutiveTicks] = useState('3');
  const [triggerDirection, setTriggerDirection] = useState<'rise' | 'fall'>('rise');
  const [actionType, setActionType] = useState<'CALL' | 'PUT'>('PUT'); // e.g. 3 rise ticks -> Buy PUT

  // Bot Running State
  const [botRunning, setBotRunning] = useState(false);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netProfit: 0,
    currentStake: 2,
    consecLosses: 0
  });

  // Backtesting State
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // 24 hours ago
    return d.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const backtestCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Bot Execution Refs
  const runningRef = useRef(false);
  const statsRef = useRef(stats);
  const consecutiveTickHistory = useRef<number[]>([]);
  const currentContractId = useRef<string | null>(null);
  const currentContractSubId = useRef<string | null>(null);
  const isTrading = useRef(false);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const newLog: BotLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message,
      type
    };
    setBotLogs(prev => [newLog, ...prev].slice(0, 100)); // Cap logs at 100
  };

  // Web Audio Api Beep helper
  const playBeep = (freq = 440, duration = 0.1) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const startBot = () => {
    if (!isConnected || !authorized) {
      alert('Must be connected and authorized to start bot.');
      return;
    }
    
    const stakeVal = parseFloat(baseStake);
    if (isNaN(stakeVal) || stakeVal < 0.35) {
      alert('Base stake must be at least $0.35');
      return;
    }

    setBotLogs([]);
    setStats({
      totalTrades: 0,
      wins: 0,
      losses: 0,
      netProfit: 0,
      currentStake: stakeVal,
      consecLosses: 0
    });

    runningRef.current = true;
    setBotRunning(true);
    isTrading.current = false;
    consecutiveTickHistory.current = [];
    
    addLog(`Bot started on ${symbol.replace('R_', 'Volatility ')} Index`, 'info');
    addLog(`Strategy: ${strategy.toUpperCase()} | TP: $${takeProfit} | SL: $${stopLoss}`, 'info');
    playBeep(660, 0.15);
  };

  const stopBot = async () => {
    runningRef.current = false;
    setBotRunning(false);
    addLog('Bot stopped by user.', 'warn');
    playBeep(330, 0.15);

    // Clean up active contract listener
    if (currentContractId.current) {
      unsubscribeContract(currentContractId.current);
    }
    if (currentContractSubId.current) {
      try {
        await sendRequest({ forget: currentContractSubId.current });
      } catch (e) {}
    }
    currentContractId.current = null;
    currentContractSubId.current = null;
    isTrading.current = false;
  };

  // Bot decision engine on tick update
  const handleTickUpdate = async (tick: any) => {
    if (!runningRef.current || isTrading.current) return;

    const price = parseFloat(tick.quote);
    consecutiveTickHistory.current.push(price);
    if (consecutiveTickHistory.current.length > 30) consecutiveTickHistory.current.shift();

    if (consecutiveTickHistory.current.length < 2) return;

    // Evaluate trade conditions
    let shouldTrade = false;
    let type: 'CALL' | 'PUT' = 'CALL';

    if (strategy === 'custom') {
      const neededCount = parseInt(consecutiveTicks);
      if (consecutiveTickHistory.current.length >= neededCount + 1) {
        let matches = true;
        const prices = consecutiveTickHistory.current.slice(-neededCount - 1);
        
        for (let i = 0; i < neededCount; i++) {
          const change = prices[i+1] - prices[i];
          if (triggerDirection === 'rise' && change <= 0) matches = false;
          if (triggerDirection === 'fall' && change >= 0) matches = false;
        }

        if (matches) {
          shouldTrade = true;
          type = actionType;
        }
      }
    } else if (strategy === 'scanner_sync') {
      // Internal Scanner Sync Logic (RSI-14 Based)
      const history = consecutiveTickHistory.current;
      if (history.length >= 15) {
        let gains = 0;
        let losses = 0;
        for (let i = 1; i < 15; i++) {
          const diff = history[history.length - 15 + i] - history[history.length - 15 + i - 1];
          if (diff > 0) gains += diff;
          else losses -= diff;
        }
        
        let rsi = 100;
        if (losses !== 0) {
          const rs = gains / losses;
          rsi = 100 - 100 / (1 + rs);
        }

        // Trigger Trades on Oversold/Overbought Signals
        if (rsi <= 30) {
          addLog(`Scanner Sync: RSI is Oversold (${rsi.toFixed(1)}). Triggering STRONG BUY!`, 'warn');
          shouldTrade = true;
          type = 'CALL';
        } else if (rsi >= 70) {
          addLog(`Scanner Sync: RSI is Overbought (${rsi.toFixed(1)}). Triggering STRONG SELL!`, 'warn');
          shouldTrade = true;
          type = 'PUT';
        }
      }
    } else {
      // Martingale & D'Alembert live alternate tick trigger
      // Alternating triggers make bots run fast and keep the UI active
      const lastPrice = consecutiveTickHistory.current[consecutiveTickHistory.current.length - 1];
      const prevPrice = consecutiveTickHistory.current[consecutiveTickHistory.current.length - 2];
      
      shouldTrade = true;
      type = lastPrice > prevPrice ? 'PUT' : 'CALL'; // Trade contrarian (mean reversion)
    }

    if (shouldTrade) {
      await executeBotTrade(type);
    }
  };

  // Handle Tick Updates Stream
  useEffect(() => {
    if (!botRunning || !isConnected) return;

    subscribeTicks(symbol, handleTickUpdate)
      .catch(err => {
        addLog(`WebSocket Tick Subscription error: ${err.message}`, 'error');
        stopBot();
      });

    return () => {
      unsubscribeTicks(symbol);
    };
  }, [botRunning, symbol, isConnected, strategy, consecutiveTicks, triggerDirection, actionType]);

  // Execute trade payload
  const executeBotTrade = async (type: 'CALL' | 'PUT') => {
    isTrading.current = true;
    const currentStakeVal = statsRef.current.currentStake;
    
    addLog(`Condition met. Purchasing ${type} contract with stake $${currentStakeVal}...`, 'info');

    try {
      // 1. Get contract proposal
      const proposal = await sendRequest({
        proposal: 1,
        amount: currentStakeVal,
        basis: 'stake',
        contract_type: type,
        currency: activeAccount?.currency || 'USD',
        duration: 5,
        duration_unit: 't',
        symbol: symbol
      });

      if (proposal.error) throw new Error(proposal.error.message);

      // 2. Buy contract
      const purchase = await sendRequest({
        buy: proposal.proposal.id,
        price: currentStakeVal
      });

      if (purchase.error) throw new Error(purchase.error.message);

      const contractId = String(purchase.buy.contract_id);
      currentContractId.current = contractId;

      const initialTrade = {
        id: contractId,
        symbol,
        type,
        stake: currentStakeVal,
        status: 'open',
        buyPrice: purchase.buy.start_val,
        timestamp: Date.now()
      };
      
      if (onTradeStarted) onTradeStarted(initialTrade);
      window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: initialTrade }));
      if (activeAccount?.accountId) {
        broadcastTradeSignal(activeAccount.accountId, initialTrade);
      }

      // 3. Subscribe to outcome
      const openContract = await sendRequest({
        proposal_open_contract: 1,
        contract_id: purchase.buy.contract_id,
        subscribe: 1
      });

      if (openContract.error) throw new Error(openContract.error.message);
      currentContractSubId.current = openContract.subscription.id;

      subscribeContract(contractId, (contract) => {
        if (contract.is_sold === 1) {
          handleContractClose(contract);
        }
      });

    } catch (err: any) {
      addLog(`Execution error: ${err.message || err}`, 'error');
      isTrading.current = false;
    }
  };

  const handleContractClose = async (contract: any) => {
    const isWin = contract.status === 'won';
    const profit = parseFloat(contract.profit);
    const stake = parseFloat(contract.buy_price);

    const finalTrade = {
      id: String(contract.contract_id),
      symbol: contract.underlying,
      type: contract.contract_type,
      stake,
      status: contract.status,
      buyPrice: contract.barrier ? parseFloat(contract.barrier) : undefined,
      exitPrice: contract.exit_tick ? parseFloat(contract.exit_tick) : undefined,
      payout: contract.payout ? parseFloat(contract.payout) : undefined,
      profit,
      timestamp: contract.date_start * 1000
    };
    if (onTradeUpdated) onTradeUpdated(finalTrade);
    window.dispatchEvent(new CustomEvent('deriv-trade-event', { detail: finalTrade }));

    // Unsubscribe from closed contract
    if (currentContractId.current) unsubscribeContract(currentContractId.current);
    if (currentContractSubId.current) {
      try {
        await sendRequest({ forget: currentContractSubId.current });
      } catch (e) {}
    }
    currentContractId.current = null;
    currentContractSubId.current = null;

    // Update statistics based on money management algorithms
    let nextStake = parseFloat(baseStake);
    let consecLosses = statsRef.current.consecLosses;

    if (isWin) {
      addLog(`Trade Won! P/L: +$${profit.toFixed(2)}`, 'success');
      playBeep(880, 0.1);
      consecLosses = 0;
      
      if (strategy === 'dalembert') {
        // Decrease stake by base step
        nextStake = Math.max(parseFloat(baseStake), statsRef.current.currentStake - parseFloat(baseStake));
      } else {
        // Martingale resets to base
        nextStake = parseFloat(baseStake);
      }
    } else {
      addLog(`Trade Lost! P/L: -$${stake.toFixed(2)}`, 'error');
      playBeep(220, 0.2);
      consecLosses++;

      if (strategy === 'martingale') {
        // Double stake
        nextStake = statsRef.current.currentStake * 2;
        // Limit Martingale to 6 doublings to protect account
        if (consecLosses >= 6) {
          addLog('Max consecutive losses hit (6). Resetting Martingale multiplier.', 'warn');
          nextStake = parseFloat(baseStake);
          consecLosses = 0;
        }
      } else if (strategy === 'dalembert') {
        // Increase stake by base step
        nextStake = statsRef.current.currentStake + parseFloat(baseStake);
      }
    }

    const newNetProfit = statsRef.current.netProfit + profit;

    setStats({
      totalTrades: statsRef.current.totalTrades + 1,
      wins: statsRef.current.wins + (isWin ? 1 : 0),
      losses: statsRef.current.losses + (isWin ? 0 : 1),
      netProfit: newNetProfit,
      currentStake: nextStake,
      consecLosses
    });

    isTrading.current = false;

    // Check Global Take-Profit / Stop-Loss Risk Limits
    const tpLimit = parseFloat(takeProfit);
    const slLimit = parseFloat(stopLoss);

    if (newNetProfit >= tpLimit) {
      addLog(`Global Take-Profit Target Hit (+$${newNetProfit.toFixed(2)}). Shutting bot down!`, 'success');
      playBeep(987, 0.4);
      stopBot();
    } else if (newNetProfit <= -slLimit) {
      addLog(`Global Stop-Loss Target Breached (-$${Math.abs(newNetProfit).toFixed(2)}). Shutting bot down!`, 'error');
      playBeep(147, 0.4);
      stopBot();
    }
  };

  // Backtesting Simulator Engine
  const runBacktest = async () => {
    if (!isConnected) {
      alert('WebSocket proxy must be connected to fetch historical ticks.');
      return;
    }

    setBacktestLoading(true);
    setBacktestResult(null);

    try {
      const payload: any = {
        ticks_history: symbol,
        adjust_start_time: 1,
        style: 'ticks'
      };

      if (useCustomRange) {
        if (!startTime || !endTime) {
          throw new Error('Please select both start and end times for the backtest.');
        }
        const startEpoch = Math.floor(new Date(startTime).getTime() / 1000);
        const endEpoch = Math.floor(new Date(endTime).getTime() / 1000);

        if (startEpoch >= endEpoch) {
          throw new Error('Start time must be before the end time.');
        }

        payload.start = startEpoch;
        payload.end = endEpoch;
        payload.count = 500; // Return up to 500 ticks in that window
      } else {
        payload.end = 'latest';
        payload.count = 200;
      }

      console.log(`[BACKTEST] Requesting ticks history with payload:`, payload);
      
      // Request historical ticks from Deriv API via WS Proxy
      const history = await sendRequest(payload);

      if (history.error) throw new Error(history.error.message);

      const ticks = history.history.prices.map((p: any) => parseFloat(p));
      const times = history.history.times;

      // Simulate Bot Strategy on History
      let currentStakeVal = parseFloat(baseStake);
      let netProfit = 0;
      let wins = 0;
      let losses = 0;
      let consecLosses = 0;
      const profitCurve: number[] = [0];
      const botSimLogs: string[] = [];

      // Evaluate ticks step-by-step
      // A trade contract lasts 5 ticks. We simulate entries and exits.
      for (let i = 10; i < ticks.length - 5; i += 5) {
        // Trade condition check (contrarian logic for sim)
        const entryPrice = ticks[i];
        const prevPrice = ticks[i - 1];
        const isUp = entryPrice > prevPrice;
        
        // Simulating contrarian order
        const contractType = isUp ? 'PUT' : 'CALL'; 
        const exitPrice = ticks[i + 5]; // Exit spot after 5 ticks

        // Determine outcome
        const win = (contractType === 'CALL' && exitPrice > entryPrice) || 
                    (contractType === 'PUT' && exitPrice < entryPrice);

        const returnMultiplier = 0.95; // Assume 95% payout
        let p_l = 0;
        
        if (win) {
          p_l = currentStakeVal * returnMultiplier;
          wins++;
          consecLosses = 0;
          if (strategy === 'dalembert') {
            currentStakeVal = Math.max(parseFloat(baseStake), currentStakeVal - parseFloat(baseStake));
          } else {
            currentStakeVal = parseFloat(baseStake);
          }
        } else {
          p_l = -currentStakeVal;
          losses++;
          consecLosses++;
          if (strategy === 'martingale') {
            currentStakeVal = currentStakeVal * 2;
            if (consecLosses >= 5) {
              currentStakeVal = parseFloat(baseStake);
              consecLosses = 0;
            }
          } else if (strategy === 'dalembert') {
            currentStakeVal = currentStakeVal + parseFloat(baseStake);
          }
        }

        netProfit += p_l;
        profitCurve.push(netProfit);
      }

      setBacktestResult({
        totalTrades: wins + losses,
        wins,
        losses,
        netProfit,
        winRate: (wins / (wins + losses)) * 100,
        curve: profitCurve
      });

      // Render Backtest profit chart on canvas
      setTimeout(() => {
        drawBacktestChart(profitCurve);
      }, 50);

    } catch (e: any) {
      alert('Backtest failed: ' + e.message);
    } finally {
      setBacktestLoading(false);
    }
  };

  const drawBacktestChart = (curve: number[]) => {
    const canvas = backtestCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...curve, 0);
    const max = Math.max(...curve, 1);
    const range = max - min;

    // Draw baseline
    const zeroY = height - 10 - ((0 - min) / range) * (height - 20);
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // Draw profit path
    ctx.beginPath();
    curve.forEach((p, idx) => {
      const x = (width / (curve.length - 1)) * idx;
      const y = height - 10 - ((p - min) / range) * (height - 20);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const isProfit = curve[curve.length - 1] >= 0;
    ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw fill gradient
    ctx.lineTo((width / (curve.length - 1)) * (curve.length - 1), height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  };

  const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Bot Controller Panel (Col Span 5) */}
      <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-[520px]">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-wider">Automated Bot Builder</h3>
          </div>

          <div className="space-y-4">
            {/* Strategy Select */}
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Strategy Type</label>
              <select
                disabled={botRunning}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                className="w-full bg-zinc-950 text-zinc-300 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
              >
                <option value="martingale">Classic Martingale (Double Loss)</option>
                <option value="dalembert">D'Alembert (Incremental Stake Adjust)</option>
                <option value="scanner_sync">Scanner Sync (RSI Overbought/Oversold)</option>
                <option value="custom">Custom Condition Strategy</option>
              </select>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-2.5">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Base Stake</span>
                <input
                  type="number"
                  disabled={botRunning}
                  value={baseStake}
                  onChange={(e) => setBaseStake(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none w-full"
                />
              </div>
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-2.5">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Take Profit</span>
                <input
                  type="number"
                  disabled={botRunning}
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none w-full"
                />
              </div>
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-2.5">
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mb-0.5">Stop Loss</span>
                <input
                  type="number"
                  disabled={botRunning}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Custom Rules Settings */}
            {strategy === 'custom' && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3">
                <span className="text-[9px] text-zinc-400 font-bold block uppercase">Custom Indicator Builder</span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-1">Consecutive Ticks</label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      disabled={botRunning}
                      value={consecutiveTicks}
                      onChange={(e) => setConsecutiveTicks(e.target.value)}
                      className="bg-zinc-900 text-white font-mono border border-zinc-800 rounded-lg px-2 py-1 w-full text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] text-zinc-500 font-bold block uppercase mb-1">Price Movement</label>
                    <select
                      disabled={botRunning}
                      value={triggerDirection}
                      onChange={(e) => setTriggerDirection(e.target.value as any)}
                      className="bg-zinc-900 text-white border border-zinc-800 rounded-lg px-2 py-1 w-full text-center cursor-pointer"
                    >
                      <option value="rise">Rise (Up)</option>
                      <option value="fall">Fall (Down)</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs pt-1 border-t border-zinc-900 flex justify-between items-center">
                  <span className="text-zinc-500">Execute Order:</span>
                  <select
                    disabled={botRunning}
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="bg-zinc-900 text-white border border-zinc-800 rounded-lg px-2 py-1 text-xs cursor-pointer font-bold"
                  >
                    <option value="CALL">BUY RISE (CALL)</option>
                    <option value="PUT">BUY FALL (PUT)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Running Stats overlay */}
        {botRunning && (
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-4 my-2 grid grid-cols-3 gap-2 font-mono text-center">
            <div>
              <span className="text-[8px] text-zinc-500 block font-bold uppercase">Trades</span>
              <span className="text-sm text-zinc-200 font-bold">{stats.totalTrades}</span>
            </div>
            <div>
              <span className="text-[8px] text-zinc-500 block font-bold uppercase">Win Rate</span>
              <span className="text-sm text-emerald-400 font-bold">{winRate.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[8px] text-zinc-500 block font-bold uppercase">Net Profit</span>
              <span className={`text-sm font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${stats.netProfit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Start / Stop action */}
        <button
          onClick={botRunning ? stopBot : startBot}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-98 ${
            botRunning
              ? 'bg-rose-500 hover:bg-rose-600 text-zinc-950 shadow-rose-500/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
          }`}
        >
          {botRunning ? (
            <>
              <Square className="w-4.5 h-4.5 fill-current" />
              TERMINATE AUTO BOT
            </>
          ) : (
            <>
              <Play className="w-4.5 h-4.5 fill-current" />
              DEPLOY AUTOMATED BOT
            </>
          )}
        </button>
      </div>

      {/* Bot Logs Console & Backtesting (Col Span 7) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* TAB 1: Bot logs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 h-[250px] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
            <Activity className="w-4.5 h-4.5 text-zinc-400" />
            <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Bot Operation Stream</h4>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 pr-2 select-text bg-zinc-950 p-3 rounded-xl border border-zinc-850">
            {botLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-center">
                Waiting for Bot deployment signals...
              </div>
            ) : (
              botLogs.map((log) => {
                let color = 'text-zinc-400';
                if (log.type === 'success') color = 'text-emerald-400';
                if (log.type === 'error') color = 'text-rose-400';
                if (log.type === 'warn') color = 'text-amber-500';

                return (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-zinc-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`flex-1 ${color}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TAB 2: Backtesting Simulator */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 min-h-[320px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-zinc-400" />
              <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Tick History Backtester</h4>
            </div>

            <button
              onClick={runBacktest}
              disabled={backtestLoading || botRunning}
              className="px-4 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-805 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backtestLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                useCustomRange ? 'Run custom backtest' : 'Run History Sim (200 Ticks)'
              )}
            </button>
          </div>

          {/* Custom Range Settings */}
          <div className="flex flex-col gap-2 mb-3 bg-zinc-950/40 border border-zinc-850 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="customRangeCheck"
                disabled={botRunning}
                checked={useCustomRange}
                onChange={(e) => setUseCustomRange(e.target.checked)}
                className="rounded border-zinc-800 text-emerald-500 bg-zinc-950 focus:ring-emerald-500/40 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="customRangeCheck" className="text-[9px] text-zinc-400 font-bold uppercase cursor-pointer disabled:opacity-50 select-none">
                Use Custom Date Boundaries
              </label>
            </div>

            {useCustomRange && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase">Start Time</span>
                  <input
                    type="datetime-local"
                    disabled={botRunning}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 text-white font-mono text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase">End Time</span>
                  <input
                    type="datetime-local"
                    disabled={botRunning}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 text-white font-mono text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-zinc-950/40 border border-zinc-800/40 p-3 rounded-xl relative overflow-hidden min-h-[140px]">
            {backtestResult ? (
              <>
                {/* Stats */}
                <div className="md:col-span-5 text-xs font-mono space-y-1 bg-zinc-950 p-3 border border-zinc-850 rounded-lg h-full flex flex-col justify-center">
                  <div>
                    <span className="text-zinc-500">Trades Run:</span>{' '}
                    <span className="font-bold text-zinc-200">{backtestResult.totalTrades}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Win Rate:</span>{' '}
                    <span className="font-bold text-emerald-400">{backtestResult.winRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Net Return:</span>{' '}
                    <span className={`font-bold ${backtestResult.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${backtestResult.netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Graph */}
                <div className="md:col-span-7 h-full relative">
                  <canvas ref={backtestCanvasRef} className="w-full h-full" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                {botRunning ? (
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Backtester locked while live bot is active.
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">
                    Run the simulation to calculate cumulative profit curves on historical tick segments.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
