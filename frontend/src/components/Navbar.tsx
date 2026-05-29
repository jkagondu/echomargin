"use client";

import React, { useState } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import Logo from '@/components/Logo';
import { LogOut, Wallet, ChevronDown, Activity, Wifi, WifiOff } from 'lucide-react';

export default function Navbar() {
  const {
    isConnected,
    isConnecting,
    authorized,
    balance,
    activeAccount,
    accountsList,
    switchAccount,
    logout
  } = useDerivWebSocket();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleAccountSwitch = async (accountId: string) => {
    setDropdownOpen(false);
    try {
      await switchAccount(accountId);
    } catch (err) {
      alert('Failed to switch account: ' + (err as Error).message);
    }
  };

  const formatBalance = (val: number | null, curr: string | undefined) => {
    if (val === null) return '---.--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr || 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      {/* Brand Logo */}
      <Logo size="md" />

      {/* Middle: Connection Status */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-medium">
        {isConnecting ? (
          <>
            <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-amber-500">Connecting proxy...</span>
          </>
        ) : isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400">
              Proxy <span className="text-emerald-400 font-bold">Connected</span>
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-rose-500" />
            <span className="text-rose-500">Disconnected</span>
          </>
        )}
      </div>

      {/* Right side: Session details or Action buttons */}
      {authorized && activeAccount ? (
        <div className="flex items-center gap-4">
          {/* Balance card */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block font-medium leading-none">BALANCE</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formatBalance(balance, activeAccount.currency)}
              </span>
            </div>
          </div>

          {/* Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-sm font-semibold cursor-pointer"
            >
              <span className="font-mono text-zinc-300">{activeAccount.accountId}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">
                {activeAccount.currency}
              </span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-850 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-2 text-xs font-bold text-zinc-500 tracking-wider">
                  SWITCH ACCOUNT
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {accountsList.map((acc) => (
                    <button
                      key={acc.accountId}
                      onClick={() => handleAccountSwitch(acc.accountId)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer ${
                        acc.accountId === activeAccount.accountId
                          ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="font-mono">{acc.accountId}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 font-bold uppercase">
                        {acc.currency}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-zinc-850 my-1"></div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-rose-500 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Session
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">UNAUTHORIZED</span>
        </div>
      )}
    </nav>
  );
}
