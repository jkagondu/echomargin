import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoMargin Airtime | Buy Airtime Instantly with M-Pesa",
  description: "Buy Safaricom airtime instantly using M-Pesa STK Push. Get bonus airtime on every purchase. Fast, secure, and 24/7 available.",
  keywords: "buy airtime, safaricom, m-pesa, airtime kenya, instant airtime",
  openGraph: {
    title: "EchoMargin Airtime | Buy Airtime Instantly",
    description: "Buy Safaricom airtime instantly with M-Pesa. Get bonus airtime on every purchase.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="mesh-bg min-h-screen antialiased">{children}</body>
    </html>
  );
}
