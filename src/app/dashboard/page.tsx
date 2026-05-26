"use client";

/* ROVA · /dashboard
   The Operator's Today. Single page, five tiles, no tabs.
   Spec: docs/DASHBOARD.md */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/shell/AppShell";
import {
  Eyebrow,
  StatusPill,
  Dot,
  MonoNum,
  Kbd,
  SectionLabel,
  AmberLink,
} from "@/components/Primitives";
import { ROBOTS, JOBS, SETTLEMENTS, EARNINGS_24H } from "@/lib/mock-data";
import type { Job, Robot } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────

type AlertSeverity = "high" | "medium" | "info";
type AlertItem = {
  id: string;
  severity: AlertSeverity;
  ref: string;
  message: string;
  ts: string;
  primary?: { label: string; href?: string };
};

type EarningsWindow = "8h" | "24h" | "7d" | "30d" | "sweep";

type IncomingOffer = {
  id: string;
  bounty: number;
  taskType: "CARRY" | "SORT" | "NAVIGATE" | "INSPECT";
  slaMinutes: number;
  clientName: string;
  clientRep: number;
  robotName: string;
  from: string;
  to: string;
};

// ─── Mock data local to this surface ─────────────────────────────

const ALERTS: AlertItem[] = [
  {
    id: "a1",
    severity: "medium",
    ref: "G1-DELTA",
    message: "Charging time +18% on past week — flag for inspection",
    ts: "07:08",
    primary: { label: "Inspect", href: "#" },
  },
  {
    id: "a2",
    severity: "info",
    ref: "JOB-7c3a",
    message: "Awaiting settlement (verified 8 min ago)",
    ts: "07:06",
    primary: { label: "View", href: "#" },
  },
  {
    id: "a3",
    severity: "medium",
    ref: "POLICY",
    message: "Rejection cluster — 8 offers rejected at $3.80 floor",
    ts: "06:54",
    primary: { label: "Open policy", href: "#" },
  },
];

const ALERTS_DRAWER: AlertItem[] = [
  ...ALERTS,
  {
    id: "a4",
    severity: "high",
    ref: "G1-EPSILON",
    message: "Heartbeat lost 11m ago — last seen Maintenance Bay",
    ts: "06:42",
    primary: { label: "Ping robot", href: "#" },
  },
  {
    id: "a5",
    severity: "info",
    ref: "Treasury",
    message: "Daily withdraw cap at 86% — $86.40 / $100.00",
    ts: "06:30",
  },
  {
    id: "a6",
    severity: "info",
    ref: "JOB-0x5D4E",
    message: "Settlement complete — +$1.595 to G1-ALPHA wallet",
    ts: "02:51",
  },
  {
    id: "a7",
    severity: "high",
    ref: "JOB-0x9G7H",
    message: "Proof rejected — GPS outside geofence",
    ts: "01:36",
    primary: { label: "Open dispute", href: "#" },
  },
  {
    id: "a8",
    severity: "medium",
    ref: "G1-GAMMA",
    message: "Battery 23% — under fleet floor of 30%",
    ts: "00:14",
  },
];

const OFFERS: IncomingOffer[] = [
  {
    id: "of1",
    bounty: 7.5,
    taskType: "CARRY",
    slaMinutes: 12,
    clientName: "Aboki-Restock-Bot",
    clientRep: 4.87,
    robotName: "G1-BETA",
    from: "Rack A2",
    to: "Dispatch Bay 1",
  },
  {
    id: "of2",
    bounty: 5.1,
    taskType: "SORT",
    slaMinutes: 8,
    clientName: "Tetris-Agent",
    clientRep: 4.62,
    robotName: "G1-GAMMA",
    from: "Bay 2",
    to: "Rack C1",
  },
  {
    id: "of3",
    bounty: 4.2,
    taskType: "NAVIGATE",
    slaMinutes: 10,
    clientName: "ScoutBot-7",
    clientRep: 4.91,
    robotName: "G1-ZETA",
    from: "Charging Station",
    to: "Rack B2",
  },
  {
    id: "of4",
    bounty: 6.0,
    taskType: "INSPECT",
    slaMinutes: 8,
    clientName: "WarehouseAI",
    clientRep: 4.75,
    robotName: "G1-DELTA",
    from: "Rack A1",
    to: "Inspection Point",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

function fmtUsd(n: number, decimals = 2): string {
  return `$${n.toFixed(decimals)}`;
}

function severityClasses(s: AlertSeverity) {
  if (s === "high") return { ring: "text-alert", dot: "fail" as const };
  if (s === "medium") return { ring: "text-amber", dot: "warn" as const };
  return { ring: "text-teal", dot: "live" as const };
}

function severityLabel(s: AlertSeverity) {
  return s === "high" ? "HIGH" : s === "medium" ? "MED" : "INFO";
}

function jobPhaseLabel(p: string) {
  return p.replace(/_/g, " ");
}

function elapsedPct(elapsed: number, sla: number) {
  if (!sla) return 0;
  return Math.min(100, Math.round((elapsed / sla) * 100));
}

// ─── Persistent Action Bar (footer) ──────────────────────────────

function ActionBar({
  onSearch,
  onToggleMap,
  onApproveNext,
  onPauseRobot,
}: {
  onSearch: () => void;
  onToggleMap: () => void;
  onApproveNext: () => void;
  onPauseRobot: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-30 hidden border-t border-line-soft bg-paper/90 backdrop-blur md:block">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2.5 text-[11px]">
        <div className="flex items-center gap-5 font-mono text-slate">
          <button
            onClick={onSearch}
            className="flex items-center gap-1.5 hover:text-bean transition-colors"
          >
            <Kbd>⌘K</Kbd>
            <span>Search</span>
          </button>
          <button
            onClick={onToggleMap}
            className="flex items-center gap-1.5 hover:text-bean transition-colors"
          >
            <Kbd>F</Kbd>
            <span>Toggle fleet map</span>
          </button>
          <button
            onClick={onApproveNext}
            className="flex items-center gap-1.5 hover:text-bean transition-colors"
          >
            <Kbd>R</Kbd>
            <span>Approve next offer</span>
          </button>
          <button
            onClick={onPauseRobot}
            className="flex items-center gap-1.5 hover:text-bean transition-colors"
          >
            <Kbd>P</Kbd>
            <span>Pause robot</span>
          </button>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate">
          <Dot tone="live" size={6} />
          <span>Live · indexer 0.4s</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tile 1: Earnings overnight ──────────────────────────────────

function EarningsTile({
  total,
  deltaPct,
  jobsSettled,
  jobsFailed,
  slashes,
  windowSel,
  onWindowChange,
  onSweep,
}: {
  total: number;
  deltaPct: number;
  jobsSettled: number;
  jobsFailed: number;
  slashes: number;
  windowSel: EarningsWindow;
  onWindowChange: (w: EarningsWindow) => void;
  onSweep: () => void;
}) {
  const windows: { key: EarningsWindow; label: string }[] = [
    { key: "8h", label: "8h" },
    { key: "24h", label: "24h" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "sweep", label: "since sweep" },
  ];
  return (
    <div className="border border-line-paper bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <Eyebrow tone="amber">Earnings overnight</Eyebrow>
        <div className="flex items-center gap-1 font-mono text-[10px] text-slate">
          {windows.map((w) => (
            <button
              key={w.key}
              onClick={() => onWindowChange(w.key)}
              className={`px-1.5 py-0.5 uppercase tracking-[0.14em] transition-colors ${
                windowSel === w.key
                  ? "text-bean border-b border-bean"
                  : "hover:text-bean"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <MonoNum value={fmtUsd(total)} size="2xl" />
            <div className="mt-2 flex items-center gap-3 font-mono text-[11px] tabular text-slate">
              <span className={deltaPct >= 0 ? "text-forest" : "text-alert"}>
                {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}%
              </span>
              <span>vs 7d avg</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 font-mono text-[11px] tabular text-slate">
              <div>
                <span className="text-bean-soft">{jobsSettled}</span> settled
              </div>
              <div>
                <span className="text-alert">{jobsFailed}</span> failed (
                <span className="text-alert">−{fmtUsd(slashes)}</span>)
              </div>
            </div>
          </div>
          <button
            onClick={onSweep}
            className="btn-press whitespace-nowrap bg-amber px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-amber-pressed"
          >
            Sweep to treasury
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tile 2: Fleet at a glance ───────────────────────────────────

function FleetGlanceTile({
  active,
  offline,
  avgRep,
  avgComp,
  policyReject24h,
}: {
  active: number;
  offline: number;
  avgRep: number;
  avgComp: string;
  policyReject24h: number;
}) {
  return (
    <div className="border border-line-paper bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <Eyebrow tone="amber">Fleet at a glance</Eyebrow>
        <AmberLink href="/dashboard/fleet" className="text-[12px]">
          See fleet →
        </AmberLink>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Dot tone="live" />
            <MonoNum value={active} size="xl" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              active
            </span>
          </div>
          <div className="h-6 w-px bg-line-soft" />
          <div className="flex items-center gap-2">
            <Dot tone="idle" />
            <MonoNum value={offline} size="xl" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              offline
            </span>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-line-soft pb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              Avg reputation
            </span>
            <MonoNum value={avgRep.toFixed(2)} size="md" />
          </div>
          <div className="flex items-center justify-between border-b border-line-soft pb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              Avg comp time
            </span>
            <MonoNum value={avgComp} size="md" />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              Policy rejections (24h)
            </span>
            <MonoNum value={policyReject24h} size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tile 3: Alerts ──────────────────────────────────────────────

function AlertsTile({
  alerts,
  onDismiss,
  onSeeAll,
}: {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <div className="border border-line-paper bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <div className="flex items-center gap-3">
          <Eyebrow tone="amber">Alerts</Eyebrow>
          <span className="font-mono text-[11px] tabular text-bean">
            ({alerts.length})
          </span>
        </div>
        <button
          onClick={onSeeAll}
          className="font-mono text-[11px] text-amber hover:text-amber-pressed transition-colors link-hover"
        >
          See all alerts →
        </button>
      </div>
      {alerts.length === 0 ? (
        <div className="px-5 py-10 text-center font-mono text-[12px] text-slate">
          No alerts. Fleet quiet.
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {alerts.map((a) => {
              const sc = severityClasses(a.severity);
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24, height: 0 }}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] ${sc.ring}`}
                  >
                    {severityLabel(a.severity)}
                  </span>
                  <span className="font-mono text-[11px] tabular text-bean-soft">
                    {a.ref}
                  </span>
                  <span className="flex-1 font-sans text-[13px] text-bean">
                    {a.message}
                  </span>
                  <span className="font-mono text-[10px] text-slate">{a.ts}</span>
                  {a.primary && (
                    <button className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber hover:text-amber-pressed">
                      {a.primary.label}
                    </button>
                  )}
                  <button
                    onClick={() => onDismiss(a.id)}
                    className="font-mono text-[10px] text-slate hover:text-bean"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

// ─── Tile 4: Incoming offers ─────────────────────────────────────

function OffersTile({
  offers,
  autoAccept,
  onToggleAuto,
  onApprove,
  onDecline,
}: {
  offers: IncomingOffer[];
  autoAccept: boolean;
  onToggleAuto: () => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <div className="border border-line-paper bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <div className="flex items-center gap-3">
          <Eyebrow tone="amber">Incoming offers</Eyebrow>
          {!autoAccept && (
            <span className="font-mono text-[11px] tabular text-bean">
              ({offers.length} pending approval)
            </span>
          )}
        </div>
        <button
          onClick={onToggleAuto}
          className={`flex items-center gap-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
            autoAccept
              ? "border border-forest text-forest"
              : "border border-line-soft text-slate hover:text-bean hover:border-bean"
          }`}
        >
          <Dot tone={autoAccept ? "ok" : "idle"} />
          Auto-accept {autoAccept ? "ON" : "OFF"}
        </button>
      </div>
      {autoAccept ? (
        <div className="flex items-center justify-between px-5 py-5">
          <div className="space-y-1">
            <div className="font-mono text-[13px] text-bean">
              Auto-accept on. <span className="text-bean-soft">12 offers</span> approved automatically in the last hour.
            </div>
            <div className="font-mono text-[10px] text-slate">
              Toggling off will route the queue back to manual approval.
            </div>
          </div>
          <button
            onClick={onToggleAuto}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber hover:text-amber-pressed"
          >
            Switch to manual →
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {offers.map((o) => (
              <motion.li
                key={o.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 items-center gap-5">
                    <div className="min-w-[88px]">
                      <MonoNum value={fmtUsd(o.bounty)} size="lg" />
                    </div>
                    <StatusPill tone="idle">{o.taskType}</StatusPill>
                    <div className="font-mono text-[11px] tabular text-slate">
                      {o.slaMinutes} min SLA
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-bean-soft">
                      <Dot tone="ok" size={5} />
                      <span>{o.clientName}</span>
                      <span className="text-slate">(rep {o.clientRep.toFixed(2)})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecline(o.id)}
                      className="border border-line-soft px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate hover:text-bean hover:border-bean"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => onApprove(o.id)}
                      className="bg-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper hover:bg-amber-pressed"
                    >
                      Approve
                    </button>
                  </div>
                </div>
                <div className="mt-2 ml-[88px] flex items-center gap-2 font-mono text-[11px] tabular text-slate">
                  <span className="text-bean-soft">{o.robotName}</span>
                  <span>·</span>
                  <span>{o.from}</span>
                  <span className="text-slate/60">→</span>
                  <span>{o.to}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <div className="border-t border-line-soft px-5 py-2.5 text-right">
        <AmberLink href="/agent" className="text-[12px]">
          See registry →
        </AmberLink>
      </div>
    </div>
  );
}

// ─── Tile 5: Active jobs ─────────────────────────────────────────

function ActiveJobsTile({ jobs }: { jobs: Job[] }) {
  return (
    <div className="border border-line-paper bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <div className="flex items-center gap-3">
          <Eyebrow tone="amber">Active jobs</Eyebrow>
          <span className="font-mono text-[11px] tabular text-bean">
            ({jobs.length})
          </span>
        </div>
        <AmberLink href="/dashboard/jobs" className="text-[12px]">
          See all jobs →
        </AmberLink>
      </div>
      <ul className="divide-y divide-line-soft">
        {jobs.map((j) => {
          const pct = elapsedPct(j.timeElapsedMinutes ?? 0, j.slaMinutes);
          return (
            <li key={j.id} className="px-5 py-3.5">
              <div className="flex items-center gap-5">
                <Dot tone="live" />
                <span className="min-w-[90px] font-mono text-[12px] tabular text-bean">
                  {j.robotName}
                </span>
                <StatusPill tone="idle">{j.taskType}</StatusPill>
                <div className="flex-1">
                  <div className="flex items-center justify-between font-mono text-[11px] tabular">
                    <span className="text-bean-soft">
                      {(j.timeElapsedMinutes ?? 0).toFixed(2)}m /{" "}
                      {j.slaMinutes}m SLA
                    </span>
                    <span className="text-slate">
                      {jobPhaseLabel(j.phase)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-[3px] bg-line-soft">
                    <div
                      className={`h-full ${
                        pct > 80 ? "bg-alert" : pct > 50 ? "bg-amber" : "bg-forest"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="font-mono text-[11px] tabular text-amber">
                  {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Alerts drawer (right slide-in) ──────────────────────────────

function AlertsDrawer({
  open,
  onClose,
  alerts,
}: {
  open: boolean;
  onClose: () => void;
  alerts: AlertItem[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-bean"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[92vw] flex-col border-l border-line-soft bg-paper"
          >
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <div>
                <Eyebrow tone="amber">All alerts</Eyebrow>
                <div className="mt-1 font-mono text-[11px] tabular text-slate">
                  {alerts.length} total · {alerts.filter((a) => a.severity === "high").length} high
                </div>
              </div>
              <button
                onClick={onClose}
                className="font-mono text-[12px] text-slate hover:text-bean"
              >
                ✕ close
              </button>
            </div>
            <div className="flex items-center gap-2 border-b border-line-soft px-5 py-2.5">
              {["All", "High", "Medium", "Info"].map((f, i) => (
                <button
                  key={f}
                  className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                    i === 0
                      ? "border border-bean text-bean"
                      : "text-slate hover:text-bean"
                  }`}
                >
                  {f}
                </button>
              ))}
              <input
                type="text"
                placeholder="Search ref or message"
                className="ml-auto w-[180px] border border-line-soft bg-paper px-2 py-1 font-mono text-[11px] text-bean placeholder:text-slate/60 focus:border-bean focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-line-soft">
                {alerts.map((a) => {
                  const sc = severityClasses(a.severity);
                  return (
                    <li key={a.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${sc.ring}`}
                        >
                          {severityLabel(a.severity)}
                        </span>
                        <span className="font-mono text-[11px] tabular text-bean-soft">
                          {a.ref}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-slate">
                          {a.ts}
                        </span>
                      </div>
                      <div className="mt-1.5 font-sans text-[13px] text-bean">
                        {a.message}
                      </div>
                      {a.primary && (
                        <button className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber hover:text-amber-pressed">
                          {a.primary.label} →
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Charts drawer (bottom slide-up) ─────────────────────────────

function ChartsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const maxBucket = Math.max(...EARNINGS_24H.map((p) => p.amount));
  const taskBreakdown = [
    { type: "CARRY", pct: 48, color: "bg-amber" },
    { type: "SORT", pct: 22, color: "bg-teal" },
    { type: "NAVIGATE", pct: 18, color: "bg-forest" },
    { type: "INSPECT", pct: 12, color: "bg-bean-soft" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-bean"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto border-t border-line-soft bg-paper"
          >
            <div className="mx-auto max-w-[1400px] px-6 py-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <Eyebrow tone="amber">Charts · diagnostics</Eyebrow>
                  <div className="mt-1 font-mono text-[11px] text-slate">
                    For "why is X happening?" — not at-a-glance.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="font-mono text-[12px] text-slate hover:text-bean"
                >
                  ✕ close
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Hourly earnings */}
                <div className="border border-line-paper p-4">
                  <Eyebrow tone="slate">Hourly earnings · last 24h</Eyebrow>
                  <div className="mt-4 flex h-32 items-end gap-1">
                    {EARNINGS_24H.map((p, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-amber/70 hover:bg-amber transition-colors"
                        style={{
                          height: `${Math.max(2, (p.amount / maxBucket) * 100)}%`,
                        }}
                        title={`${p.hour} · ${fmtUsd(p.amount)}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] text-slate">
                    <span>04:00</span>
                    <span>16:00</span>
                    <span>03:00</span>
                  </div>
                </div>
                {/* Task type donut */}
                <div className="border border-line-paper p-4">
                  <Eyebrow tone="slate">Task type · % of revenue</Eyebrow>
                  <div className="mt-4 space-y-3">
                    {taskBreakdown.map((t) => (
                      <div key={t.type}>
                        <div className="flex items-center justify-between font-mono text-[11px] tabular">
                          <span className="text-bean">{t.type}</span>
                          <span className="text-slate">{t.pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-line-soft">
                          <div
                            className={`h-full ${t.color}`}
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Rejection rate */}
                <div className="border border-line-paper p-4">
                  <Eyebrow tone="slate">Rejection rate · last 7d</Eyebrow>
                  <div className="mt-4 flex h-24 items-end gap-2">
                    {[5, 8, 6, 12, 9, 11, 16].map((v, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center">
                        <div
                          className="w-full bg-alert/70"
                          style={{ height: `${(v / 16) * 100}%` }}
                        />
                        <span className="mt-1 font-mono text-[9px] text-slate">
                          {["M", "T", "W", "T", "F", "S", "S"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 font-mono text-[10px] text-slate">
                    Top reason: price-floor reject (62%)
                  </div>
                </div>
                {/* Completion-time histogram */}
                <div className="border border-line-paper p-4">
                  <Eyebrow tone="slate">Completion time · 30s buckets</Eyebrow>
                  <div className="mt-4 flex h-24 items-end gap-0.5">
                    {[2, 5, 11, 18, 22, 14, 9, 6, 4, 3, 2, 1].map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-teal/70"
                        style={{ height: `${(v / 22) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] text-slate">
                    <span>0:30</span>
                    <span>median 4:30</span>
                    <span>6:00+</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── 2D fleet map (modal) ────────────────────────────────────────

function FleetMapModal({
  open,
  onClose,
  robots,
}: {
  open: boolean;
  onClose: () => void;
  robots: Robot[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bean/80 p-6"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            className="flex h-[80vh] w-full max-w-[1100px] flex-col border border-line-soft bg-paper"
          >
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <div>
                <Eyebrow tone="amber">Fleet map · live</Eyebrow>
                <div className="mt-1 font-mono text-[11px] tabular text-slate">
                  {robots.length} robots · MQTT heartbeat 0.4s avg
                </div>
              </div>
              <button
                onClick={onClose}
                className="font-mono text-[12px] text-slate hover:text-bean"
              >
                ✕ close
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden bg-cream-soft">
              {/* Grid backdrop */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--color-line-soft) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              {/* Geofence */}
              <div className="absolute inset-8 border border-dashed border-amber/70">
                <div className="absolute -top-3 left-3 bg-paper px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                  geofence · zone-1
                </div>
              </div>
              {/* Robot dots */}
              {robots.map((r, i) => {
                const left = 18 + ((i * 13) % 70);
                const top = 22 + ((i * 19) % 60);
                const isActive = r.status === "active";
                return (
                  <div
                    key={r.id}
                    className="absolute"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div className="relative">
                      <span
                        className={`block h-3 w-3 ${
                          isActive
                            ? "bg-teal pulse-glow"
                            : r.status === "charging"
                            ? "bg-amber"
                            : r.status === "maintenance"
                            ? "bg-alert"
                            : "bg-slate/50"
                        }`}
                      />
                      <span className="absolute left-4 top-[-2px] whitespace-nowrap font-mono text-[10px] tabular text-bean">
                        {r.name}
                        <span className="ml-1.5 text-slate">{r.battery}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Rejection heatmap blobs */}
              <div className="pointer-events-none absolute bottom-[20%] left-[30%] h-24 w-24 rounded-full bg-alert/15 blur-2xl" />
              <div className="pointer-events-none absolute top-[25%] right-[15%] h-20 w-20 rounded-full bg-alert/10 blur-2xl" />
            </div>
            <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-teal pulse-glow" /> active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-amber" /> charging
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-alert" /> maintenance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-slate/50" /> idle
                </span>
              </div>
              <span>v1 placeholder · full satellite map in v1.5</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sweep modal ─────────────────────────────────────────────────

function SweepModal({
  open,
  onClose,
  amount,
  walletCount,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  walletCount: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bean/70 p-6"
        >
          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            className="w-full max-w-md border border-line-soft bg-paper p-6"
          >
            <Eyebrow tone="amber">Sweep to treasury</Eyebrow>
            <div className="mt-3 font-sans text-[15px] text-bean">
              Batched UserOp across <span className="tabular font-mono">{walletCount}</span>{" "}
              robot wallets. Single signature.
            </div>
            <div className="mt-5 space-y-3 border border-line-soft p-4">
              <div className="flex items-center justify-between font-mono text-[12px] tabular">
                <span className="text-slate">Amount</span>
                <MonoNum value={fmtUsd(amount)} size="md" />
              </div>
              <div className="flex items-center justify-between font-mono text-[12px] tabular">
                <span className="text-slate">Gas estimate</span>
                <span className="text-bean">~$0.04 USD (sponsored)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[12px] tabular">
                <span className="text-slate">Destination</span>
                <span className="text-bean">0x742d…3F1a</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="border border-line-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean hover:border-bean"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="bg-amber px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper hover:bg-amber-pressed"
              >
                Sign & sweep
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(ALERTS);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [windowSel, setWindowSel] = useState<EarningsWindow>("24h");
  const [offers, setOffers] = useState<IncomingOffer[]>(OFFERS);
  const [now, setNow] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Mount-time clock (avoid SSR hydration mismatch)
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Derived metrics from mock data
  const totalEarnings = useMemo(
    () => ROBOTS.reduce((s, r) => s + r.earningsToday, 0),
    []
  );
  const activeRobots = ROBOTS.filter((r) => r.status === "active").length;
  const offlineRobots = ROBOTS.filter(
    (r) => r.status === "maintenance"
  ).length;
  const avgRep =
    ROBOTS.reduce((s, r) => s + r.reputation, 0) / ROBOTS.length;
  const activeJobs = useMemo(
    () =>
      JOBS.filter(
        (j) => j.status === "executing" || j.status === "assigned"
      ).slice(0, 8),
    []
  );
  const settledCount = SETTLEMENTS.filter((s) => s.robotPayment > 0).length;
  const failedCount = SETTLEMENTS.filter((s) => s.robotPayment === 0).length;
  const slashes = SETTLEMENTS.filter((s) => s.robotPayment === 0).reduce(
    (s, x) => s + x.refund,
    0
  );

  // Keyboard shortcuts (F, R, P)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "f" || e.key === "F") {
        setMapOpen((m) => !m);
      } else if (e.key === "r" || e.key === "R") {
        approveNext();
      } else if (e.key === "p" || e.key === "P") {
        // Stub — would open pause-robot picker
        console.log("Pause robot picker");
      } else if (e.key === "Escape") {
        setAlertsDrawerOpen(false);
        setChartsOpen(false);
        setMapOpen(false);
        setSweepOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const dismissAlert = (id: string) =>
    setAlerts((cur) => cur.filter((a) => a.id !== id));
  const approveOffer = (id: string) =>
    setOffers((cur) => cur.filter((o) => o.id !== id));
  const declineOffer = (id: string) =>
    setOffers((cur) => cur.filter((o) => o.id !== id));
  const approveNext = () => {
    if (offers.length > 0) approveOffer(offers[0].id);
  };

  const dateLabel = now
    ? now.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "—";
  const timeLabel = now
    ? now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <AppShell role="operator" activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-6 pt-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate">
              ROVA · Today
            </div>
            <div className="mt-1 font-mono text-[12px] tabular text-bean">
              {dateLabel} · {timeLabel}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapOpen(true)}
              className="border border-line-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:border-bean hover:text-bean"
            >
              🗺 Map
            </button>
            <button
              onClick={() => setChartsOpen(true)}
              className="border border-line-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:border-bean hover:text-bean"
            >
              📊 Charts
            </button>
          </div>
        </div>

        {/* Row 1: Earnings + Fleet glance */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EarningsTile
            total={totalEarnings}
            deltaPct={18.2}
            jobsSettled={settledCount}
            jobsFailed={failedCount}
            slashes={slashes}
            windowSel={windowSel}
            onWindowChange={setWindowSel}
            onSweep={() => setSweepOpen(true)}
          />
          <FleetGlanceTile
            active={activeRobots}
            offline={offlineRobots}
            avgRep={avgRep}
            avgComp="7m 42s"
            policyReject24h={16}
          />
        </div>

        {/* Row 2: Alerts */}
        <AlertsTile
          alerts={alerts}
          onDismiss={dismissAlert}
          onSeeAll={() => setAlertsDrawerOpen(true)}
        />

        {/* Row 3: Offers */}
        <OffersTile
          offers={offers}
          autoAccept={autoAccept}
          onToggleAuto={() => setAutoAccept((a) => !a)}
          onApprove={approveOffer}
          onDecline={declineOffer}
        />

        {/* Row 4: Active jobs */}
        <ActiveJobsTile jobs={activeJobs} />
      </div>

      {/* Persistent action bar */}
      <ActionBar
        onSearch={() => {
          /* ⌘K palette is mounted in AppShell; this is a stub */
        }}
        onToggleMap={() => setMapOpen((m) => !m)}
        onApproveNext={approveNext}
        onPauseRobot={() => console.log("Pause robot picker")}
      />

      {/* Overlays */}
      <AlertsDrawer
        open={alertsDrawerOpen}
        onClose={() => setAlertsDrawerOpen(false)}
        alerts={ALERTS_DRAWER}
      />
      <ChartsDrawer open={chartsOpen} onClose={() => setChartsOpen(false)} />
      <FleetMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        robots={ROBOTS}
      />
      <SweepModal
        open={sweepOpen}
        onClose={() => setSweepOpen(false)}
        amount={totalEarnings}
        walletCount={ROBOTS.length}
      />
    </AppShell>
  );
}
