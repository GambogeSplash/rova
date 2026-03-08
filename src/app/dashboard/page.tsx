"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
interface Robot {
  id: string;
  name: string;
  type: string;
  status: "active" | "idle" | "charging" | "maintenance";
  reputation: number;
  jobsToday: number;
  earningsToday: number;
  earningsTotal: number;
  battery: number;
  stake: number;
  capabilities: string[];
  currentJob: string | null;
}

interface Job {
  id: string;
  type: string;
  client: string;
  provider: string | null;
  from: string;
  to: string;
  bounty: number;
  bid: number | null;
  status: "pending" | "active" | "completed" | "failed";
  sla: number;
  timeElapsed: number | null;
  timestamp: string;
}

interface Settlement {
  id: string;
  jobId: string;
  client: string;
  provider: string;
  amount: number;
  type: string;
  timestamp: string;
  txHash: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────
const ROBOTS: Robot[] = [
  {
    id: "r1", name: "G1-ALPHA", type: "Unitree G1", status: "active",
    reputation: 4.9, jobsToday: 14, earningsToday: 22.50, earningsTotal: 1847.25,
    battery: 87, stake: 500, capabilities: ["CARRY", "NAVIGATE"],
    currentJob: "JOB-0x7F3A",
  },
  {
    id: "r2", name: "G1-BETA", type: "Unitree G1", status: "idle",
    reputation: 4.7, jobsToday: 11, earningsToday: 18.20, earningsTotal: 1523.80,
    battery: 92, stake: 500, capabilities: ["CARRY", "NAVIGATE", "SORT"],
    currentJob: null,
  },
  {
    id: "r3", name: "G1-DELTA", type: "Unitree G1", status: "active",
    reputation: 4.8, jobsToday: 13, earningsToday: 20.85, earningsTotal: 1695.40,
    battery: 73, stake: 500, capabilities: ["CARRY", "NAVIGATE", "INSPECT"],
    currentJob: "JOB-0x8B2C",
  },
  {
    id: "r4", name: "G1-GAMMA", type: "Unitree G1", status: "charging",
    reputation: 4.6, jobsToday: 9, earningsToday: 14.40, earningsTotal: 1201.60,
    battery: 23, stake: 350, capabilities: ["CARRY", "NAVIGATE"],
    currentJob: null,
  },
  {
    id: "r5", name: "G1-EPSILON", type: "Unitree G1", status: "active",
    reputation: 4.9, jobsToday: 16, earningsToday: 25.60, earningsTotal: 2104.15,
    battery: 65, stake: 750, capabilities: ["CARRY", "NAVIGATE", "INSPECT", "SORT"],
    currentJob: "JOB-0x9D4E",
  },
  {
    id: "r6", name: "G1-ZETA", type: "Unitree G1", status: "maintenance",
    reputation: 4.5, jobsToday: 0, earningsToday: 0, earningsTotal: 890.30,
    battery: 100, stake: 500, capabilities: ["CARRY"],
    currentJob: null,
  },
];

const JOBS: Job[] = [
  { id: "JOB-0x7F3A", type: "CARRY", client: "MERCHANT-7", provider: "G1-ALPHA", from: "Rack B3", to: "Dispatch Bay 2", bounty: 2.00, bid: 1.75, status: "active", sla: 5, timeElapsed: 2, timestamp: "14:32:18" },
  { id: "JOB-0x8B2C", type: "CARRY", client: "VENDOR-12", provider: "G1-DELTA", from: "Rack A1", to: "Dispatch Bay 1", bounty: 1.80, bid: 1.60, status: "active", sla: 4, timeElapsed: 1, timestamp: "14:31:05" },
  { id: "JOB-0x9D4E", type: "INSPECT", client: "AUDITOR-3", provider: "G1-EPSILON", from: "Zone C", to: "Zone C", bounty: 3.50, bid: 3.20, status: "active", sla: 10, timeElapsed: 4, timestamp: "14:28:44" },
  { id: "JOB-0xA1F7", type: "CARRY", client: "MERCHANT-7", provider: null, from: "Rack D2", to: "Dispatch Bay 3", bounty: 2.20, bid: null, status: "pending", sla: 5, timeElapsed: null, timestamp: "14:33:01" },
  { id: "JOB-0xB3E9", type: "SORT", client: "LOGISTICS-5", provider: null, from: "Intake Zone", to: "Racks A-D", bounty: 4.00, bid: null, status: "pending", sla: 15, timeElapsed: null, timestamp: "14:33:22" },
  { id: "JOB-0x6C1D", type: "CARRY", client: "VENDOR-12", provider: "G1-BETA", from: "Rack B1", to: "Dispatch Bay 2", bounty: 1.90, bid: 1.70, status: "completed", sla: 4, timeElapsed: 3, timestamp: "14:25:10" },
  { id: "JOB-0x5A0B", type: "NAVIGATE", client: "SCOUT-1", provider: "G1-ALPHA", from: "Dock A", to: "Zone D", bounty: 1.20, bid: 1.00, status: "completed", sla: 3, timeElapsed: 2, timestamp: "14:20:33" },
  { id: "JOB-0x4E8F", type: "INSPECT", client: "AUDITOR-3", provider: "G1-EPSILON", from: "Zone B", to: "Zone B", bounty: 3.00, bid: 2.80, status: "completed", sla: 8, timeElapsed: 6, timestamp: "14:15:47" },
  { id: "JOB-0x3D7A", type: "CARRY", client: "MERCHANT-7", provider: "G1-DELTA", from: "Rack C4", to: "Dispatch Bay 1", bounty: 2.10, bid: 1.85, status: "completed", sla: 5, timeElapsed: 4, timestamp: "14:10:22" },
  { id: "JOB-0x2C6E", type: "SORT", client: "LOGISTICS-5", provider: "G1-BETA", from: "Intake Zone", to: "Racks A-D", bounty: 3.80, bid: 3.50, status: "completed", sla: 12, timeElapsed: 10, timestamp: "14:02:55" },
];

const SETTLEMENTS: Settlement[] = [
  { id: "s1", jobId: "JOB-0x6C1D", client: "VENDOR-12", provider: "G1-BETA", amount: 1.70, type: "CARRY", timestamp: "14:28:42", txHash: "0x4a2f...e8c1" },
  { id: "s2", jobId: "JOB-0x5A0B", client: "SCOUT-1", provider: "G1-ALPHA", amount: 1.00, type: "NAVIGATE", timestamp: "14:22:55", txHash: "0x7b3d...f2a9" },
  { id: "s3", jobId: "JOB-0x4E8F", client: "AUDITOR-3", provider: "G1-EPSILON", amount: 2.80, type: "INSPECT", timestamp: "14:21:18", txHash: "0x9c1e...d4b7" },
  { id: "s4", jobId: "JOB-0x3D7A", client: "MERCHANT-7", provider: "G1-DELTA", amount: 1.85, type: "CARRY", timestamp: "14:14:33", txHash: "0x2d5f...a3c8" },
  { id: "s5", jobId: "JOB-0x2C6E", client: "LOGISTICS-5", provider: "G1-BETA", amount: 3.50, type: "SORT", timestamp: "14:12:59", txHash: "0x8e4a...b1d6" },
  { id: "s6", jobId: "JOB-0x1B5D", client: "MERCHANT-7", provider: "G1-ALPHA", amount: 1.90, type: "CARRY", timestamp: "13:58:11", txHash: "0x3f7c...e5a2" },
  { id: "s7", jobId: "JOB-0x0A4C", client: "VENDOR-12", provider: "G1-GAMMA", amount: 1.60, type: "CARRY", timestamp: "13:45:07", txHash: "0x6d2b...c9f4" },
];

// ─── Earnings sparkline data (last 24h hourly) ──────────────────────
const HOURLY_EARNINGS = [
  2.4, 1.8, 0.9, 0.4, 0.2, 0.1, 0.3, 1.2, 3.5, 5.8, 7.2, 8.1,
  9.4, 10.2, 8.7, 7.5, 6.8, 5.3, 4.1, 3.2, 2.8, 2.1, 1.5, 1.0,
];

// ─── Stats Bar ───────────────────────────────────────────────────────
function StatsBar() {
  const totalEarningsToday = ROBOTS.reduce((s, r) => s + r.earningsToday, 0);
  const activeJobs = JOBS.filter((j) => j.status === "active").length;
  const pendingJobs = JOBS.filter((j) => j.status === "pending").length;
  const completedJobs = JOBS.filter((j) => j.status === "completed").length;
  const activeRobots = ROBOTS.filter((r) => r.status === "active" || r.status === "idle").length;
  const successRate = (completedJobs / (completedJobs + JOBS.filter((j) => j.status === "failed").length)) * 100;

  const stats = [
    { label: "Fleet Earnings (Today)", value: `${totalEarningsToday.toFixed(2)} USDC`, color: "text-accent", trend: "+12.4%" },
    { label: "Active Jobs", value: `${activeJobs}`, color: "text-blue-400", sub: `${pendingJobs} pending` },
    { label: "Completed Today", value: `${completedJobs}`, color: "text-text-primary", sub: `${(completedJobs * 1.75).toFixed(2)} USDC settled` },
    { label: "Fleet Online", value: `${activeRobots}/${ROBOTS.length}`, color: "text-text-primary", sub: `${ROBOTS.filter(r => r.status === "active").length} executing` },
    { label: "Success Rate", value: `${successRate.toFixed(1)}%`, color: "text-accent", sub: "0 failures" },
    { label: "Total Staked", value: `${ROBOTS.reduce((s, r) => s + r.stake, 0)} ROVA`, color: "text-accent", sub: "across fleet" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-surface-1 px-4 py-3">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{s.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</span>
            {"trend" in s && s.trend && (
              <span className="font-mono text-[10px] text-accent">{s.trend}</span>
            )}
          </div>
          {"sub" in s && s.sub && (
            <div className="text-[11px] text-text-tertiary mt-0.5">{s.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Earnings Chart ──────────────────────────────────────────────────
function EarningsChart() {
  const max = Math.max(...HOURLY_EARNINGS);
  const total = HOURLY_EARNINGS.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">Fleet Earnings — 24h</span>
          <div className="mt-1 font-mono text-xl font-bold text-accent">{total.toFixed(1)} USDC</div>
        </div>
        <div className="flex gap-2">
          {["24H", "7D", "30D"].map((period, i) => (
            <button
              key={period}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                i === 0
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      {/* Bar chart */}
      <div className="flex items-end gap-[3px] h-24">
        {HOURLY_EARNINGS.map((val, i) => {
          const height = (val / max) * 100;
          const isRecent = i >= 20;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: i * 0.02, duration: 0.4 }}
              className={`flex-1 rounded-t-sm ${
                isRecent ? "bg-accent/40" : "bg-accent/15"
              } hover:bg-accent/50 transition-colors cursor-pointer`}
              title={`${i}:00 — ${val.toFixed(1)} USDC`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-mono text-[8px] text-text-tertiary">00:00</span>
        <span className="font-mono text-[8px] text-text-tertiary">06:00</span>
        <span className="font-mono text-[8px] text-text-tertiary">12:00</span>
        <span className="font-mono text-[8px] text-text-tertiary">18:00</span>
        <span className="font-mono text-[8px] text-text-tertiary">NOW</span>
      </div>
    </div>
  );
}

// ─── Job Queue ───────────────────────────────────────────────────────
function JobQueue() {
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "completed">("all");

  const filtered = filter === "all" ? JOBS : JOBS.filter((j) => j.status === filter);

  const statusColor = (s: Job["status"]) => {
    switch (s) {
      case "active": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "completed": return "text-accent bg-accent/10 border-accent/20";
      case "failed": return "text-red-400 bg-red-400/10 border-red-400/20";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">Job Queue</span>
        <div className="flex gap-1">
          {(["all", "active", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                filter === f
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_100px_80px_70px_60px_70px] gap-2 px-3 py-2 border-b border-border">
        {["Job", "Type", "Client", "Provider", "Bounty", "SLA", "Status"].map((h) => (
          <span key={h} className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="max-h-[320px] overflow-y-auto">
        <AnimatePresence>
          {filtered.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[1fr_80px_100px_80px_70px_60px_70px] gap-2 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors"
            >
              <div>
                <span className="font-mono text-[11px] text-text-primary">{job.id}</span>
                <div className="font-mono text-[9px] text-text-tertiary">{job.timestamp}</div>
              </div>
              <span className="font-mono text-[11px] text-text-secondary">{job.type}</span>
              <span className="font-mono text-[11px] text-accent">{job.client}</span>
              <span className="font-mono text-[11px] text-blue-400">{job.provider ?? "—"}</span>
              <span className="font-mono text-[11px] text-text-primary">{job.bounty.toFixed(2)}</span>
              <span className="font-mono text-[11px] text-text-secondary">
                {job.timeElapsed !== null ? `${job.timeElapsed}/${job.sla}m` : `${job.sla}m`}
              </span>
              <span className={`font-mono text-[9px] font-semibold rounded-full px-2 py-0.5 border text-center ${statusColor(job.status)}`}>
                {job.status.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Fleet Overview ──────────────────────────────────────────────────
function FleetOverview() {
  const statusIcon = (s: Robot["status"]) => {
    switch (s) {
      case "active": return { color: "bg-blue-400", label: "ACTIVE" };
      case "idle": return { color: "bg-accent", label: "IDLE" };
      case "charging": return { color: "bg-yellow-400", label: "CHARGING" };
      case "maintenance": return { color: "bg-red-400", label: "MAINT" };
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">Fleet Overview</span>
        <span className="text-[11px] text-text-tertiary">{ROBOTS.length} units</span>
      </div>
      <div className="space-y-2">
        {ROBOTS.map((robot) => {
          const si = statusIcon(robot.status);
          return (
            <div
              key={robot.id}
              className="rounded-xl border border-border bg-surface-0 p-4 hover:border-border-hover transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${si.color} ${robot.status === "active" ? "animate-pulse" : ""}`} />
                  <span className="font-mono text-sm font-bold text-text-primary">{robot.name}</span>
                  <span className="font-mono text-[9px] text-text-tertiary">{robot.type}</span>
                </div>
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${
                  robot.status === "active" ? "border-blue-400/20 bg-blue-400/10 text-blue-400"
                  : robot.status === "idle" ? "border-accent/20 bg-accent/10 text-accent"
                  : robot.status === "charging" ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
                  : "border-red-400/20 bg-red-400/10 text-red-400"
                }`}>
                  {si.label}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <MiniStat label="Earnings" value={`${robot.earningsToday.toFixed(2)}`} unit="USDC" color="text-accent" />
                <MiniStat label="Jobs" value={`${robot.jobsToday}`} color="text-text-primary" />
                <MiniStat label="Rep" value={`${robot.reputation}`} color="text-accent" />
                <MiniStat label="Battery" value={`${robot.battery}%`} color={robot.battery < 30 ? "text-yellow-400" : "text-text-primary"} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {robot.capabilities.map((cap) => (
                    <span key={cap} className="rounded-md border border-border bg-surface-1 px-1.5 py-0.5 font-mono text-[8px] text-text-tertiary">
                      {cap}
                    </span>
                  ))}
                </div>
                {robot.currentJob && (
                  <span className="font-mono text-[9px] text-blue-400">{robot.currentJob}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, color = "text-text-primary" }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div>
      <div className="font-mono text-[8px] text-text-tertiary uppercase">{label}</div>
      <div className={`font-mono text-xs font-semibold ${color}`}>
        {value}
        {unit && <span className="text-[8px] text-text-tertiary ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

// ─── Settlement Feed ─────────────────────────────────────────────────
function SettlementFeed() {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">Recent Settlements</span>
        <span className="font-mono text-[10px] text-accent">
          {SETTLEMENTS.reduce((s, t) => s + t.amount, 0).toFixed(2)} USDC settled
        </span>
      </div>
      <div className="space-y-2">
        {SETTLEMENTS.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-0 px-4 py-3 hover:border-border-hover transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                <span className="font-mono text-[8px] font-bold text-accent">{s.type.slice(0, 3)}</span>
              </div>
              <div>
                <div className="font-mono text-[11px] text-text-primary">
                  <span className="text-accent">{s.client}</span>
                  <span className="text-text-tertiary mx-1.5">{"\u2192"}</span>
                  <span className="text-blue-400">{s.provider}</span>
                </div>
                <div className="font-mono text-[9px] text-text-tertiary">{s.jobId} · {s.txHash}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs font-semibold text-accent">{s.amount.toFixed(2)} USDC</div>
              <div className="font-mono text-[9px] text-text-tertiary">{s.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fleet Policy ────────────────────────────────────────────────────
function FleetPolicy() {
  const [policies, setPolicies] = useState({
    carryEnabled: true,
    navigateEnabled: true,
    inspectEnabled: true,
    sortEnabled: true,
    priceFloor: 1.00,
    priceCeiling: 10.00,
    maxDailyWithdraw: 50.00,
    autoAccept: true,
    geofenceEnabled: true,
  });

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">Fleet Policy</span>
        <span className="text-[11px] text-text-tertiary">Operator Controls</span>
      </div>

      {/* Task Types */}
      <div className="mb-5">
        <div className="text-[11px] font-medium text-text-tertiary uppercase mb-2">Accepted Task Types</div>
        <div className="flex gap-2">
          {(["carry", "navigate", "inspect", "sort"] as const).map((type) => {
            const key = `${type}Enabled` as keyof typeof policies;
            const enabled = policies[key] as boolean;
            return (
              <button
                key={type}
                onClick={() => setPolicies((p) => ({ ...p, [key]: !enabled }))}
                className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold border transition-colors ${
                  enabled
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border bg-surface-0 text-text-tertiary"
                }`}
              >
                {type.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Controls */}
      <div className="mb-5 space-y-3">
        <div className="text-[11px] font-medium text-text-tertiary uppercase">Price Controls (USDC)</div>
        <div className="flex gap-3">
          <PolicyInput label="Floor" value={policies.priceFloor} onChange={(v) => setPolicies((p) => ({ ...p, priceFloor: v }))} />
          <PolicyInput label="Ceiling" value={policies.priceCeiling} onChange={(v) => setPolicies((p) => ({ ...p, priceCeiling: v }))} />
          <PolicyInput label="Max Daily Withdraw" value={policies.maxDailyWithdraw} onChange={(v) => setPolicies((p) => ({ ...p, maxDailyWithdraw: v }))} />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <PolicyToggle
          label="Auto-accept matching jobs"
          enabled={policies.autoAccept}
          onToggle={() => setPolicies((p) => ({ ...p, autoAccept: !p.autoAccept }))}
        />
        <PolicyToggle
          label="Geofence enforcement"
          enabled={policies.geofenceEnabled}
          onToggle={() => setPolicies((p) => ({ ...p, geofenceEnabled: !p.geofenceEnabled }))}
        />
      </div>

      {/* Emergency */}
      <div className="mt-5 pt-4 border-t border-border">
        <button className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-[13px] font-medium text-red-400 hover:bg-red-500/20 transition-colors">
          EMERGENCY PAUSE — Halt All Robots
        </button>
      </div>
    </div>
  );
}

function PolicyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="font-mono text-[8px] text-text-tertiary mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step="0.25"
        min="0"
        className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent/30 transition-colors"
      />
    </div>
  );
}

function PolicyToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-0 px-4 py-2.5 hover:border-border-hover transition-colors"
    >
      <span className="text-[12px] text-text-secondary">{label}</span>
      <div className={`h-4 w-8 rounded-full transition-colors ${enabled ? "bg-accent/30" : "bg-surface-3"}`}>
        <motion.div
          className={`h-4 w-4 rounded-full border ${enabled ? "bg-accent border-accent" : "bg-surface-2 border-border"}`}
          animate={{ x: enabled ? 16 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </button>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────
export default function DashboardPage() {
  const [tab, setTab] = useState<"overview" | "fleet" | "policy">("overview");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-surface-0">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <span className="text-[14px] font-semibold text-text-primary">ROVA</span>
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="text-[13px] text-text-secondary">Fleet Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            {(["overview", "fleet", "policy"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-[12px] transition-colors ${
                  tab === t
                    ? "bg-surface-2 text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
            <Link
              href="/simulator"
              className="ml-2 rounded-lg bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              Simulator
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] p-4 space-y-4">
        <StatsBar />

        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
            <div className="space-y-4">
              <EarningsChart />
              <JobQueue />
            </div>
            <div className="space-y-4">
              <SettlementFeed />
            </div>
          </div>
        )}

        {tab === "fleet" && (
          <FleetOverview />
        )}

        {tab === "policy" && (
          <FleetPolicy />
        )}
      </div>
    </div>
  );
}
