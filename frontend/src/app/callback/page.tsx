"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const accounts = [];
        let i = 1;
        
        // Loop through all accounts returned by the Deriv redirect
        while (searchParams.get(`acct${i}`)) {
          const accountId = searchParams.get(`acct${i}`);
          const token = searchParams.get(`token${i}`);
          const currency = searchParams.get(`currency${i}`);
          
          if (accountId && token && currency) {
            accounts.push({ accountId, token, currency });
          }
          i++;
        }

        if (accounts.length === 0) {
          throw new Error('No authorization credentials found in the callback URL.');
        }

        console.log(`[AUTH CALLBACK] Found ${accounts.length} accounts. Sending to backend...`);

        // Send tokens to backend to secure them in an HttpOnly session cookie
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts }),
          credentials: 'include', // Important to save HTTP-only cookies
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to authenticate with EchoMargin backend.');
        }

        setStatus('success');
        console.log('[AUTH CALLBACK] Login successful! Redirecting to dashboard...');
        
        // Brief delay for visual feedback
        setTimeout(() => {
          router.push('/');
        }, 1500);

      } catch (err: any) {
        console.error('[AUTH CALLBACK] Error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred during authorization.');
      }
    };

    handleAuth();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              EchoMargin
            </span>
          </div>

          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Securing Connection</h2>
              <p className="text-zinc-400 text-sm">
                Authenticating session and establishing secure WebSocket bridge. Please wait...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-emerald-400">Authorization Verified</h2>
              <p className="text-zinc-400 text-sm">
                Redirecting to EchoMargin live dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-rose-400">Authentication Failed</h2>
              <p className="text-zinc-400 text-sm mb-6 max-h-24 overflow-y-auto">
                {errorMessage}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Go Home
                </button>
                <button
                  onClick={() => {
                    const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '33DYobo60p3hLWAOB3Sm5';
                    const oauthUrlBase = process.env.NEXT_PUBLIC_DERIV_OAUTH_URL || 'https://oauth.deriv.com/oauth2/authorize';
                    const redirectUri = 'https://echomargin.com/callback';
                    window.location.href = `${oauthUrlBase}?app_id=${appId}&l=en&brand=deriv&affiliate_token=UK8NZP3WV68X&redirect_uri=${encodeURIComponent(redirectUri)}`;
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Retry Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-zinc-400">Loading Callback...</div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
