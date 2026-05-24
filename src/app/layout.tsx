import type { Metadata } from "next";
import { Inter_Tight, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import CmdK from "@/components/CmdK";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROVA — Settlement layer for robots that earn",
  description:
    "ACP-native task marketplace where Virtuals agents hire physical robots and payment settles automatically onchain on Base.",
  openGraph: {
    title: "ROVA — Settlement layer for robots that earn",
    description:
      "Job posted → robot accepts → proof verified → escrow released. Built on ACP v2 + ERC-4337.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${plexMono.variable} antialiased bg-paper text-ink`}
      >
        {children}
        <CmdK />
      </body>
    </html>
  );
}
