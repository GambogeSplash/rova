import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROVA — ACP-Native Task Marketplace for Physical Robots",
  description:
    "The first ACP-native registry that lets Virtuals agents hire physical robots. Same protocol, same escrow, same verification, extended to the physical world.",
  openGraph: {
    title: "ROVA — Hire Physical Robots Onchain",
    description:
      "ACP-native marketplace where Virtuals agents post physical tasks, robots execute them, and payment settles automatically onchain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
