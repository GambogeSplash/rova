"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AppRole, NavItem } from "@/lib/types";
import {
  AGENT_NAV,
  ROBOT_NAV,
  OPERATOR_NAV,
} from "@/lib/constants";

const ROLE_CONFIG: Record<
  AppRole,
  { label: string; identity: string; identityColor: string; nav: NavItem[] }
> = {
  agent: {
    label: "Agent",
    identity: "MERCHANT-7",
    identityColor: "text-accent",
    nav: AGENT_NAV,
  },
  robot: {
    label: "Robot",
    identity: "G1-ALPHA",
    identityColor: "text-blue-400",
    nav: ROBOT_NAV,
  },
  operator: {
    label: "Operator",
    identity: "Fleet Operator",
    identityColor: "text-text-primary",
    nav: OPERATOR_NAV,
  },
};

interface AppShellProps {
  role: AppRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export default function AppShell({
  role,
  activeTab,
  onTabChange,
  children,
}: AppShellProps) {
  const config = ROLE_CONFIG[role];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-col border-r border-border bg-surface-0 fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="h-12 flex items-center gap-2 px-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 border border-accent/20">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
            <span className="font-mono text-[13px] font-semibold text-text-primary">
              ROVA
            </span>
          </Link>
        </div>

        {/* Identity */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                role === "agent"
                  ? "bg-accent"
                  : role === "robot"
                  ? "bg-blue-400"
                  : "bg-text-primary"
              }`}
            />
            <span className={`font-mono text-[12px] font-semibold ${config.identityColor}`}>
              {config.identity}
            </span>
          </div>
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider mt-1 block">
            {config.label} Interface
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {config.nav.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-[12px] transition-all duration-150 ${
                activeTab === item.id
                  ? "bg-accent/[0.08] text-accent border-l-2 border-accent -ml-[2px] pl-[14px]"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-1"
              }`}
            >
              <span className={`text-[9px] font-bold w-8 ${
                activeTab === item.id ? "text-accent" : "text-text-tertiary"
              }`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Cross-links */}
        <div className="px-3 py-3 border-t border-border space-y-1">
          {role !== "agent" && (
            <Link
              href="/agent"
              className="block font-mono text-[10px] text-text-tertiary hover:text-text-secondary px-3 py-1 transition-colors"
            >
              Agent View
            </Link>
          )}
          {role !== "robot" && (
            <Link
              href="/robot"
              className="block font-mono text-[10px] text-text-tertiary hover:text-text-secondary px-3 py-1 transition-colors"
            >
              Robot View
            </Link>
          )}
          {role !== "operator" && (
            <Link
              href="/dashboard"
              className="block font-mono text-[10px] text-text-tertiary hover:text-text-secondary px-3 py-1 transition-colors"
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/simulator"
            className="block font-mono text-[10px] text-text-tertiary hover:text-accent px-3 py-1 transition-colors"
          >
            Simulator
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-surface-0 sticky top-0 z-30">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-text-tertiary">
              ROVA
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="font-mono text-[12px] text-text-secondary">
              {config.label}
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="font-mono text-[12px] text-text-primary">
              {config.nav.find((n) => n.id === activeTab)?.label ?? activeTab}
            </span>
          </div>

          {/* Right: mobile role switcher + status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[10px] text-text-tertiary">
                Base Sepolia
              </span>
            </div>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 p-4 lg:p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
