"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface DerivWebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  authorized: boolean;
  balance: number | null;
  activeAccount: { accountId: string; currency: string } | null;
  accountsList: { accountId: string; currency: string }[];
  activeTick: any;
  sendRequest: (payload: any) => Promise<any>;
  subscribeTicks: (symbol: string, callback: (tick: any) => void) => Promise<string>;
  unsubscribeTicks: (symbol: string) => Promise<void>;
  subscribeContract: (contractId: string, callback: (contract: any) => void) => void;
  unsubscribeContract: (contractId: string) => void;
  switchAccount: (accountId: string) => Promise<void>;
  logout: () => Promise<void>;
  wsLogs: { id: string; type: 'send' | 'recv'; content: string; timestamp: number }[];
  demoMode: boolean;
  enableDemoMode: () => void;
}

const DerivWebSocketContext = createContext<DerivWebSocketContextType | null>(null);

export function DerivWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [activeAccount, setActiveAccount] = useState<{ accountId: string; currency: string } | null>(null);
  const [accountsList, setAccountsList] = useState<{ accountId: string; currency: string }[]>([]);
  const [activeTick, setActiveTick] = useState<any>(null);
  const [wsLogs, setWsLogs] = useState<{ id: string; type: 'send' | 'recv'; content: string; timestamp: number }[]>([]);
  
  const [demoMode, setDemoMode] = useState(false);
  const mockIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mockContractIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addLog = useCallback((type: 'send' | 'recv', content: string) => {
    setWsLogs(prev => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        content,
        timestamp: Date.now()
      };
      const updated = [newLog, ...prev];
      if (updated.length > 50) updated.pop();
      return updated;
    });
  }, []);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef<number>(1000);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  
  const reqIdCounter = useRef<number>(0);
  const pendingRequests = useRef<Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timeout: NodeJS.Timeout }>>(new Map());

  const tickCallbacks = useRef<Map<string, Set<(tick: any) => void>>>(new Map());
  const symbolToSubId = useRef<Map<string, string>>(new Map());
  const contractCallbacks = useRef<Map<string, (contract: any) => void>>(new Map());

  const enableDemoMode = () => {
    setDemoMode(true);
    setIsConnected(true);
    setAuthorized(true);
    setBalance(10000.00);
    setActiveAccount({ accountId: 'VRTC999999', currency: 'USD' });
    setAccountsList([{ accountId: 'VRTC999999', currency: 'USD' }]);
    setIsConnecting(false);
  };

  const fetchSession = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/session`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setActiveAccount(data.activeAccount);
          setAccountsList(data.accounts);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('[WS CONTEXT] Error fetching session:', err);
      return false;
    }
  };

  const connect = useCallback(async () => {
    if (demoMode) return; // Skip connection if in demo mode
    
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (pingInterval.current) clearInterval(pingInterval.current);
    
    const hasSession = await fetchSession();
    if (!hasSession) {
      console.log('[WS CONTEXT] No active session found. Skipping connection.');
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws';
    
    console.log(`[WS CONTEXT] Connecting to proxy at ${wsUrl}`);
    
    try {
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[WS CONTEXT] WebSocket Connection established with proxy.');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectDelay.current = 1000;
        
        pingInterval.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ping: 1 }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const rawData = event.data.toString();
          addLog('recv', rawData);
          const response = JSON.parse(rawData);

          if (response.msg_type === 'ping') {
            return;
          }

          if (response.msg_type === 'authorize') {
            if (response.error) {
              console.error('[WS CONTEXT] Authorization error:', response.error.message);
              setConnectionError(response.error.message);
              setAuthorized(false);
            } else {
              console.log('[WS CONTEXT] Authorized. User info:', response.authorize);
              setAuthorized(true);
              setBalance(parseFloat(response.authorize.balance));
              setActiveAccount({
                accountId: response.authorize.loginid,
                currency: response.authorize.currency,
              });
            }
          }

          if (response.msg_type === 'balance') {
            if (!response.error && response.balance) {
              setBalance(parseFloat(response.balance.balance));
            }
          }

          if (response.msg_type === 'tick') {
            const tick = response.tick;
            if (tick) {
              const symbol = tick.symbol;
              setActiveTick(tick);
              const callbacks = tickCallbacks.current.get(symbol);
              if (callbacks) {
                callbacks.forEach(cb => cb(tick));
              }
            }
          }

          if (response.msg_type === 'proposal_open_contract') {
            const contract = response.proposal_open_contract;
            if (contract) {
              const contractId = String(contract.contract_id);
              const cb = contractCallbacks.current.get(contractId);
              if (cb) cb(contract);
            }
          }

          if (response.req_id) {
            const pending = pendingRequests.current.get(response.req_id);
            if (pending) {
              const { resolve, reject, timeout } = pending;
              clearTimeout(timeout);
              pendingRequests.current.delete(response.req_id);
              if (response.error) {
                reject(response.error);
              } else {
                resolve(response);
              }
            }
          }

        } catch (err) {
          console.error('[WS CONTEXT] Error handling message:', err);
        }
      };

      socket.onclose = (event) => {
        console.log(`[WS CONTEXT] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        setAuthorized(false);
        setIsConnecting(false);

        if (event.code !== 1000 && event.code !== 1005) {
          triggerReconnect();
        }
      };

      socket.onerror = (err) => {
        console.error('[WS CONTEXT] WebSocket error:', err);
        setConnectionError('WebSocket server connection error');
        socket.close();
      };

    } catch (err: any) {
      console.error('[WS CONTEXT] Setup error:', err);
      setConnectionError(err.message || 'Setup error');
      triggerReconnect();
    }
  }, [demoMode]);

  const triggerReconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    
    console.log(`[WS CONTEXT] Attempting reconnect in ${reconnectDelay.current}ms...`);
    reconnectTimeout.current = setTimeout(() => {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      connect();
    }, reconnectDelay.current);
  };

  const sendRequest = (payload: any): Promise<any> => {
    if (demoMode) {
      return new Promise((resolve) => {
        const req_id = payload.req_id || ++reqIdCounter.current;
        setTimeout(() => {
          if (payload.proposal) {
            resolve({
              req_id,
              msg_type: 'proposal',
              proposal: { id: 'mock-proposal-id-' + Math.random().toString(36).substring(2, 7) }
            });
          } else if (payload.buy) {
            resolve({
              req_id,
              msg_type: 'buy',
              buy: {
                contract_id: 'mock-contract-id-' + Math.random().toString(36).substring(2, 9),
                start_val: 100.25
              }
            });
          } else if (payload.forget) {
            resolve({ req_id, msg_type: 'forget' });
          } else {
            resolve({ req_id, msg_type: 'unknown' });
          }
        }, 300);
      });
    }

    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket connection is not open'));
      }

      reqIdCounter.current++;
      const req_id = reqIdCounter.current;
      const requestWithId = { ...payload, req_id };
      
      const rawPayload = JSON.stringify(requestWithId);
      addLog('send', rawPayload);

      const timeout = setTimeout(() => {
        pendingRequests.current.delete(req_id);
        reject(new Error(`Request timeout for message type: ${payload.msg_type || 'unknown'}`));
      }, 10000);

      pendingRequests.current.set(req_id, { resolve, reject, timeout });
      ws.current.send(rawPayload);
    });
  };

  const subscribeTicks = async (symbol: string, callback: (tick: any) => void): Promise<string> => {
    if (demoMode) {
      let price = 100.00;
      const intervalId = setInterval(() => {
        price += (Math.random() - 0.5) * 0.4;
        callback({
          symbol,
          quote: price.toFixed(4),
          epoch: Math.floor(Date.now() / 1000)
        });
      }, 1000);
      mockIntervals.current.set(symbol, intervalId);
      return 'mock-sub-id-' + symbol;
    }

    let callbacks = tickCallbacks.current.get(symbol);
    if (!callbacks) {
      callbacks = new Set();
      tickCallbacks.current.set(symbol, callbacks);
    }
    callbacks.add(callback);

    if (symbolToSubId.current.has(symbol)) {
      return symbolToSubId.current.get(symbol)!;
    }

    try {
      console.log(`[WS CONTEXT] Requesting subscription for ${symbol}`);
      const response = await sendRequest({
        ticks: symbol,
        subscribe: 1
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const subId = response.subscription?.id;
      if (subId) {
        symbolToSubId.current.set(symbol, subId);
        return subId;
      }
      throw new Error('Subscription ID not returned from Deriv');
    } catch (err) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        tickCallbacks.current.delete(symbol);
      }
      throw err;
    }
  };

  const unsubscribeTicks = async (symbol: string) => {
    if (demoMode) {
      const interval = mockIntervals.current.get(symbol);
      if (interval) {
        clearInterval(interval);
        mockIntervals.current.delete(symbol);
      }
      return;
    }

    const subId = symbolToSubId.current.get(symbol);
    if (!subId) return;

    console.log(`[WS CONTEXT] Unsubscribing from ${symbol} (Sub ID: ${subId})`);
    
    try {
      const response = await sendRequest({
        forget: subId
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      symbolToSubId.current.delete(symbol);
      tickCallbacks.current.delete(symbol);
      if (activeTick?.symbol === symbol) {
        setActiveTick(null);
      }
    } catch (err) {
      console.error(`[WS CONTEXT] Failed to unsubscribe from ${symbol}:`, err);
      symbolToSubId.current.delete(symbol);
      tickCallbacks.current.delete(symbol);
    }
  };

  const switchAccount = async (accountId: string) => {
    if (demoMode) {
      setActiveAccount({ accountId, currency: 'USD' });
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to switch account');
      }

      console.log(`[WS CONTEXT] Account switched to ${accountId}. Reconnecting WS...`);
      if (ws.current) {
        ws.current.close(1000, 'Switching account');
      }
      setTimeout(() => connect(), 200);

    } catch (err) {
      console.error('[WS CONTEXT] Error switching account:', err);
      throw err;
    }
  };

  const logout = async () => {
    if (demoMode) {
      setDemoMode(false);
      setIsConnected(false);
      setAuthorized(false);
      setBalance(null);
      setActiveAccount(null);
      setAccountsList([]);
      mockIntervals.current.forEach(clearInterval);
      mockIntervals.current.clear();
      mockContractIntervals.current.forEach(clearInterval);
      mockContractIntervals.current.clear();
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('[WS CONTEXT] Error calling logout endpoint:', err);
    } finally {
      setIsConnected(false);
      setAuthorized(false);
      setBalance(null);
      setActiveAccount(null);
      setAccountsList([]);
      setActiveTick(null);
      
      if (ws.current) {
        ws.current.close(1000, 'User logout');
      }
    }
  };

  const subscribeContract = (contractId: string, callback: (contract: any) => void) => {
    if (demoMode) {
      let ticks = 0;
      const duration = 5;
      const profit = Math.random() > 0.45 ? 9.50 : -10.00;
      
      const intervalId = setInterval(() => {
        ticks++;
        const contractUpdate = {
          contract_id: contractId,
          underlying: 'R_100',
          contract_type: 'CALL',
          buy_price: '10.00',
          payout: profit >= 0 ? '19.50' : '0.00',
          profit,
          barrier: 100.25,
          current_spot: 100.25 + (Math.random() - 0.5) * 0.4,
          tick_count: ticks,
          is_sold: ticks >= duration ? 1 : 0,
          status: ticks >= duration ? (profit >= 0 ? 'won' : 'lost') : 'open'
        };
        
        callback(contractUpdate);
        
        if (ticks >= duration) {
          clearInterval(intervalId);
          mockContractIntervals.current.delete(contractId);
        }
      }, 1000);
      
      mockContractIntervals.current.set(contractId, intervalId);
      return;
    }

    contractCallbacks.current.set(contractId, callback);
  };

  const unsubscribeContract = (contractId: string) => {
    if (demoMode) {
      const interval = mockContractIntervals.current.get(contractId);
      if (interval) {
        clearInterval(interval);
        mockContractIntervals.current.delete(contractId);
      }
      return;
    }

    contractCallbacks.current.delete(contractId);
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close(1000, 'App component unmounted');
      }
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      
      mockIntervals.current.forEach(clearInterval);
      mockContractIntervals.current.forEach(clearInterval);
    };
  }, [connect]);

  return (
    <DerivWebSocketContext.Provider
      value={{
        isConnected,
        isConnecting,
        connectionError,
        authorized,
        balance,
        activeAccount,
        accountsList,
        activeTick,
        sendRequest,
        subscribeTicks,
        unsubscribeTicks,
        subscribeContract,
        unsubscribeContract,
        switchAccount,
        logout,
        wsLogs,
        demoMode,
        enableDemoMode
      }}
    >
      {children}
    </DerivWebSocketContext.Provider>
  );
}

export function useDerivWebSocket() {
  const context = useContext(DerivWebSocketContext);
  if (!context) {
    throw new Error('useDerivWebSocket must be used within a DerivWebSocketProvider');
  }
  return context;
}
