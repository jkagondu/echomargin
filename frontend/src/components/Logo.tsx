"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', iconOnly = false, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: {
      container: 'gap-2',
      iconContainer: 'w-8 h-8 rounded-lg',
      icon: 'w-4.5 h-4.5',
      text: 'text-base',
      subtext: 'text-[8px]'
    },
    md: {
      container: 'gap-3',
      iconContainer: 'w-10 h-10 rounded-xl',
      icon: 'w-5.5 h-5.5',
      text: 'text-xl',
      subtext: 'text-[9px]'
    },
    lg: {
      container: 'gap-4',
      iconContainer: 'w-16 h-16 rounded-2xl',
      icon: 'w-9 h-9',
      text: 'text-3xl',
      subtext: 'text-[11px]'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {/* Glow Effect Wrapper */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"></div>
        <div className={`relative ${currentSize.iconContainer} bg-zinc-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner overflow-hidden`}>
          {/* Animated Background Mesh */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/10 via-transparent to-teal-500/10 animate-pulse"></div>
          
          {/* Sonic Echo Wave + Candlestick Margin SVG */}
          <svg
            className={`${currentSize.icon} transform group-hover:scale-110 transition-transform duration-300`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Echo Ripple Waves */}
            <path d="M2 12c0-3.3 1.8-6.2 4.5-7.7" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
            <path d="M22 12c0 3.3-1.8 6.2-4.5 7.7" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
            
            {/* Main Echo Concentric Arcs */}
            <path d="M5 12a7 7 0 0114 0" strokeWidth="1.8" />
            <path d="M8 12a4 4 0 018 0" strokeWidth="2" />
            
            {/* Rising Candlestick bars in the center representing "Margin" */}
            <path d="M10 14v-3" strokeWidth="2.5" />
            <path d="M12 15V9" strokeWidth="2.5" />
            <path d="M14 13v-2" strokeWidth="2.5" />
            
            {/* Trend/Signal dot */}
            <circle cx="12" cy="7" r="1" fill="currentColor" className="animate-ping" style={{ transformOrigin: '12px 7px' }} />
          </svg>
        </div>
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <span className="font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent leading-tight select-none">
            Echo<span className="text-white">Margin</span>
          </span>
          <span className={`text-zinc-500 tracking-widest font-bold font-mono uppercase leading-none ${currentSize.subtext}`}>
            WS SECURE BRIDGE
          </span>
        </div>
      )}
    </div>
  );
}
