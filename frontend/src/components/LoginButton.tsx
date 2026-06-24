"use client";

import React from 'react';

export default function LoginButton() {
  const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '33DYobo60p3hLWAOB3Sm5';
  const oauthUrlBase = process.env.NEXT_PUBLIC_DERIV_OAUTH_URL || 'https://oauth.deriv.com/oauth2/authorize';

  const handleLogin = () => {
    // Dynamically use the current secure origin
    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/callback`
      : 'https://echomargin.com/callback';

    // Redirect the user to Deriv's OAuth portal with redirect_uri
    const oauthUrl = `${oauthUrlBase}?app_id=${appId}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = oauthUrl;
  };

  return (
    <button
      onClick={handleLogin}
      className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium rounded-lg group bg-gradient-to-br from-emerald-500 to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-500 text-white focus:ring-4 focus:outline-none focus:ring-emerald-800 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 cursor-pointer"
    >
      <span className="relative px-6 py-3 transition-all ease-in duration-75 bg-zinc-950 rounded-md group-hover:bg-opacity-0 font-semibold tracking-wide flex items-center gap-2">
        <svg
          className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Log In with Deriv
      </span>
    </button>
  );
}
