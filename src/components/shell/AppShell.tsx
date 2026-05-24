"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AppRole, NavItem } from "@/lib/types";
import {
  AGENT_NAV,
  ROBOT_NAV,
  OPERATOR_NAV,
} from "@/lib/constants";
import {
  RovaMark,
  AgentIcon,
  RobotIcon,
  OperatorIcon,
  CommandIcon,
} from "@/components/Icons";
import { Dot, Kbd } from "@/components/Primitives";
import AccountSwitcher from "@/components/AccountSwitcher";

/* ROVA · AppShell — espresso chrome.
   Wraps the role-based product pages (agent / robot / dashboard / onboard).
   Sidebar nav + top breadcrumb + content slot. */

const ROLE_CONFIG: Record<
  AppRole,
  {
    label: string;
    identity: string;
    Icon: typeof AgentIcon;
    accent: string;
    nav: NavItem[];
  }
> = {
  agent: {
    label: "Agent",
    identity: "@labor-agent",
    Icon: AgentIcon,
    accent: "text-amber",
    nav: AGENT_NAV,
  },
  robot: {
    label: "Robot",
    identity: "G1-ALPHA",
    Icon: RobotIcon,
    accent: "text-teal",
    nav: ROBOT_NAV,
  },
  operator: {
    label: "Operator",
    identity: "depot.lagos.eth",
    Icon: OperatorIcon,
    accent: "text-bean",
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
  const Icon = config.Icon;
  const activeLabel =
    config.nav.find((n) => n.id === activeTab)?.label ?? activeTab;

  return (
    <div className="min-h-screen bg-paper text-bean flex">
      {/* ─── Sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-line-soft bg-paper fixed top-0 left-0 bottom-0 z-40">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-line-soft">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-70 transition-opacity"
          >
            <span className="grid h-5 w-5 place-items-center border border-bean">
              <span className="h-1.5 w-1.5 bg-bean" />
            </span>
            <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-bean">
              ROVA
            </span>
          </Link>
        </div>

        {/* Identity — multi-account switcher seed (see Switcher.tsx) */}
        <div className="px-4 py-4 border-b border-line-soft">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
            Acting as
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <Icon size={18} className={config.accent} />
            <span
              className={`font-mono text-[12.5px] font-medium ${config.accent}`}
            >
              {config.identity}
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate uppercase tracking-[0.14em]">
            {config.label} surface
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-px overflow-y-auto">
          {config.nav.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 font-sans text-[13px] transition-colors text-left ${
                  active
                    ? "bg-cream-soft text-bean border-l-2 border-amber -ml-[2px] pl-[14px]"
                    : "text-bean-soft hover:text-bean hover:bg-cream-soft"
                }`}
              >
                <span
                  className={`font-mono text-[9px] tracking-[0.14em] w-10 ${
                    active ? "text-amber" : "text-slate"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cross-links */}
        <div className="px-3 py-3 border-t border-line-soft space-y-px">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate px-3 pb-2">
            Switch surface
          </div>
          {role !== "agent" && (
            <CrossLink href="/agent" label="Agent" Icon={AgentIcon} />
          )}
          {role !== "robot" && (
            <CrossLink href="/robot" label="Robot" Icon={RobotIcon} />
          )}
          {role !== "operator" && (
            <CrossLink href="/dashboard" label="Operator" Icon={OperatorIcon} />
          )}
          <CrossLink
            href="/simulator"
            label="Simulator"
            Icon={() => (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                className="text-slate"
              >
                <rect x="3" y="6" width="18" height="14" />
                <path d="M3 12 L21 12 M9 6 L9 20 M15 6 L15 20" />
              </svg>
            )}
          />
        </div>
      </aside>

      {/* ─── Main column ────────────────────────────────── */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-8 border-b border-line-soft bg-paper sticky top-0 z-30">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
            >
              ROVA
            </Link>
            <span className="text-slate">/</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
              {config.label}
            </span>
            <span className="text-slate">/</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-bean">
              {activeLabel}
            </span>
          </div>

          {/* Right rail: cmd hint + account switcher + network status */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate hover:text-bean transition-colors"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("rova:cmdk:open"));
                }
              }}
            >
              <CommandIcon size={12} />
              <span>Search</span>
              <Kbd>⌘K</Kbd>
            </button>
            <AccountSwitcher />
            <div className="hidden lg:flex items-center gap-2">
              <Dot tone="ok" />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
                Base Sepolia
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function CrossLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: (p: { size?: number; className?: string }) => React.ReactElement | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 font-sans text-[12.5px] text-bean-soft hover:text-bean hover:bg-cream-soft transition-colors"
    >
      <Icon size={14} className="text-slate" />
      {label}
    </Link>
  );
}
