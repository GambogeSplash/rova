"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/shell/AppShell";
import { useCardGlow } from "@/hooks/useCardGlow";
import type {
  TaskType,
  Robot,
  Job,
  Settlement,
  FleetPolicy,
  EarningsDataPoint,
} from "@/lib/types";
import {
  ROBOTS,
  JOBS,
  SETTLEMENTS,
  FLEET_POLICY,
  EARNINGS_24H,
} from "@/lib/mock-data";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  jobStatusColor,
  jobStatusLabel,
  robotStatusColor,
  robotStatusLabel,
} from "@/lib/constants";

// ─── Helpers ──────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function batteryColor(level: number): string {
  if (level > 50) return "bg-green-500";
  if (level > 20) return "bg-yellow-400";
  return "bg-red-400";
}

function batteryTextColor(level: number): string {
  if (level > 50) return "text-green-500";
  if (level > 20) return "text-yellow-400";
  return "text-red-400";
}

type OperatorTab =
  | "overview"
  | "fleet"
  | "jobs"
  | "earnings"
  | "policies"
  | "emergency";

// ─── Stat Card ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  const glow = useCardGlow();
  return (
    <div
      {...glow}
      className={`rounded-2xl border border-border bg-surface-1 p-5 ${glow.className}`}
    >
      <div className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`mt-1.5 font-mono text-xl font-bold ${
          accent ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-[10px] text-text-tertiary">
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        enabled ? "bg-accent/30" : "bg-surface-3"
      }`}
    >
      <motion.div
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full border transition-colors ${
          enabled
            ? "bg-accent border-accent"
            : "bg-surface-2 border-border"
        }`}
        animate={{ x: enabled ? 16 : 0 }}
        transition={{ duration: 0.15 }}
      />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═════════════════════════════════════════════════════════════════════

function OverviewTab({
  robots,
  jobs,
  settlements,
  pausedRobots,
  onTogglePause,
}: {
  robots: Robot[];
  jobs: Job[];
  settlements: Settlement[];
  pausedRobots: Set<string>;
  onTogglePause: (id: string) => void;
}) {
  const totalEarningsToday = robots.reduce((s, r) => s + r.earningsToday, 0);
  const activeJobs = jobs.filter(
    (j) => j.status === "executing" || j.status === "assigned"
  ).length;
  const completedJobs = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Robots"
          value={String(robots.length)}
          sub={`${robots.filter((r) => r.status === "active").length} active`}
        />
        <StatCard
          label="Active Jobs"
          value={String(activeJobs)}
          sub={`${jobs.filter((j) => j.status === "open").length} open`}
        />
        <StatCard
          label="Today's Earnings"
          value={`${totalEarningsToday.toFixed(2)} USDC`}
          accent
        />
        <StatCard
          label="Total Settled"
          value={String(completedJobs)}
          sub={`${settlements.length} settlements`}
        />
      </div>

      {/* Fleet status grid */}
      <div>
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-3">
          Fleet Status
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {robots.map((robot) => {
            const isPaused = pausedRobots.has(robot.id);
            const currentJob = robot.currentJobId
              ? jobs.find((j) => j.id === robot.currentJobId)
              : null;
            return (
              <motion.div
                key={robot.id}
                layout
                className="rounded-2xl border border-border bg-surface-1 p-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isPaused ? "bg-red-400" : robotStatusColor(robot.status)
                      } ${
                        robot.status === "active" && !isPaused
                          ? "animate-pulse"
                          : ""
                      }`}
                    />
                    <span className="font-mono text-[13px] font-semibold text-text-primary">
                      {robot.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {isPaused
                      ? "PAUSED"
                      : robotStatusLabel(robot.status).toUpperCase()}
                  </span>
                </div>

                {/* Model */}
                <div className="font-mono text-[10px] text-text-tertiary mb-3">
                  {robot.model}
                </div>

                {/* Battery */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-text-tertiary">
                      Battery
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold ${batteryTextColor(
                        robot.battery
                      )}`}
                    >
                      {robot.battery}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-0 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${batteryColor(
                        robot.battery
                      )}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${robot.battery}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                {/* Current job */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] text-text-tertiary">
                    Current Job
                  </span>
                  {currentJob ? (
                    <span className="font-mono text-[11px] text-blue-400">
                      {currentJob.id}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-text-tertiary">
                      Idle
                    </span>
                  )}
                </div>

                {/* Earnings today */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] text-text-tertiary">
                    Today
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-accent">
                    {robot.earningsToday.toFixed(2)} USDC
                  </span>
                </div>

                {/* Capabilities */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {robot.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded-md border border-border bg-surface-0 px-1.5 py-0.5 font-mono text-[8px] text-text-tertiary"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onTogglePause(robot.id)}
                    className={`font-mono text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                      isPaused
                        ? "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                        : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
                    }`}
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-3">
          Recent Activity
        </div>
        <div className="space-y-1">
          {settlements.slice(0, 5).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-surface-0 px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-tertiary">
                  {formatTime(s.timestamp)}
                </span>
                <span className="font-mono text-[11px] text-blue-400">
                  {s.provider}
                </span>
                <span className="font-mono text-[9px] text-text-tertiary">
                  {s.taskType}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-accent">
                +{s.robotPayment.toFixed(4)} USDC
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 2: FLEET MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

function FleetTab({
  robots,
  jobs,
  pausedRobots,
  onTogglePause,
}: {
  robots: Robot[];
  jobs: Job[];
  pausedRobots: Set<string>;
  onTogglePause: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider">
        Fleet Management &mdash; {robots.length} robots
      </div>

      {robots.map((robot) => {
        const expanded = expandedId === robot.id;
        const isPaused = pausedRobots.has(robot.id);
        const robotJobs = jobs.filter(
          (j) => j.robotName === robot.name
        );
        return (
          <div
            key={robot.id}
            className="rounded-2xl border border-border bg-surface-1 overflow-hidden"
          >
            {/* Summary row */}
            <button
              onClick={() =>
                setExpandedId(expanded ? null : robot.id)
              }
              className="w-full flex items-center justify-between p-5 hover:bg-surface-2/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isPaused
                      ? "bg-red-400"
                      : robotStatusColor(robot.status)
                  } ${
                    robot.status === "active" && !isPaused
                      ? "animate-pulse"
                      : ""
                  }`}
                />
                <div>
                  <span className="font-mono text-[13px] font-semibold text-text-primary">
                    {robot.name}
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-text-tertiary">
                    {robot.model}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <div className="font-mono text-[10px] text-text-tertiary">
                    Rep
                  </div>
                  <div className="font-mono text-[11px] text-text-primary">
                    {robot.reputation}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="font-mono text-[10px] text-text-tertiary">
                    Battery
                  </div>
                  <div
                    className={`font-mono text-[11px] ${batteryTextColor(
                      robot.battery
                    )}`}
                  >
                    {robot.battery}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-text-tertiary">
                    Today
                  </div>
                  <div className="font-mono text-[11px] text-accent">
                    {robot.earningsToday.toFixed(2)}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-text-tertiary transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {[
                        { label: "Wallet", value: robot.wallet },
                        {
                          label: "Status",
                          value: isPaused
                            ? "PAUSED"
                            : robotStatusLabel(robot.status),
                        },
                        {
                          label: "Reputation",
                          value: String(robot.reputation),
                        },
                        {
                          label: "Stake",
                          value: `${robot.stake} ROVA`,
                        },
                        {
                          label: "Jobs Completed",
                          value: String(robot.jobsCompleted),
                        },
                        {
                          label: "Jobs Failed",
                          value: String(robot.jobsFailed),
                        },
                        {
                          label: "Total Earnings",
                          value: `${robot.earningsTotal.toFixed(2)} USDC`,
                        },
                        {
                          label: "Today Earnings",
                          value: `${robot.earningsToday.toFixed(2)} USDC`,
                        },
                        {
                          label: "Battery",
                          value: `${robot.battery}%`,
                        },
                        {
                          label: "Location",
                          value: robot.location,
                        },
                        {
                          label: "Current Job",
                          value: robot.currentJobId ?? "None",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg bg-surface-0 px-3 py-2"
                        >
                          <div className="font-mono text-[9px] text-text-tertiary uppercase">
                            {item.label}
                          </div>
                          <div className="font-mono text-[11px] text-text-primary mt-0.5 truncate">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Capabilities */}
                    <div>
                      <div className="font-mono text-[9px] text-text-tertiary uppercase mb-1.5">
                        Capabilities
                      </div>
                      <div className="flex gap-1.5">
                        {robot.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-[9px] text-accent"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onTogglePause(robot.id)}
                        className={`font-mono text-[11px] px-4 py-2 rounded-lg border transition-colors ${
                          isPaused
                            ? "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                            : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
                        }`}
                      >
                        {isPaused ? "Resume" : "Pause"}
                      </button>
                      <button className="font-mono text-[11px] px-4 py-2 rounded-lg border border-border bg-surface-0 text-text-secondary hover:bg-surface-2/30 transition-colors">
                        Edit Policy
                      </button>
                      <button className="font-mono text-[11px] px-4 py-2 rounded-lg border border-border bg-surface-0 text-text-secondary hover:bg-surface-2/30 transition-colors">
                        View Jobs ({robotJobs.length})
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 3: JOB QUEUE
// ═════════════════════════════════════════════════════════════════════

function JobsTab({
  robots,
  jobs,
}: {
  robots: Robot[];
  jobs: Job[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<TaskType | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const statusOptions = [
    "all",
    "open",
    "executing",
    "completed",
    "failed",
  ] as const;

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (taskFilter !== "all" && j.taskType !== taskFilter) return false;
      if (search && !j.id.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [jobs, statusFilter, taskFilter, search]);

  const idleRobots = robots.filter(
    (r) => r.status === "idle" && !r.currentJobId
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filters */}
          <div className="flex gap-1">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`font-mono text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                  statusFilter === s
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-border bg-surface-0 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Task type filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setTaskFilter("all")}
              className={`font-mono text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                taskFilter === "all"
                  ? "border-blue-400/20 bg-blue-400/10 text-blue-400"
                  : "border-border bg-surface-0 text-text-tertiary hover:text-text-secondary"
              }`}
            >
              All Types
            </button>
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTaskFilter(t)}
                className={`font-mono text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                  taskFilter === t
                    ? "border-blue-400/20 bg-blue-400/10 text-blue-400"
                    : "border-border bg-surface-0 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search job ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/30 transition-colors w-44"
          />
        </div>
      </div>

      {/* Job list */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_70px_90px_90px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border bg-surface-0">
          {["Job ID", "Type", "Client", "Robot", "Route", "Bounty", "Status"].map(
            (h) => (
              <span
                key={h}
                className="font-mono text-[9px] text-text-tertiary uppercase tracking-wider"
              >
                {h}
              </span>
            )
          )}
        </div>

        {/* Rows */}
        <div className="max-h-[520px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center font-mono text-[11px] text-text-tertiary">
              No jobs match the current filters
            </div>
          )}
          {filtered.map((job) => {
            const expanded = expandedId === job.id;
            return (
              <div key={job.id}>
                <button
                  onClick={() =>
                    setExpandedId(expanded ? null : job.id)
                  }
                  className="w-full grid grid-cols-[1fr_70px_90px_90px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border last:border-0 hover:bg-surface-2/20 transition-colors text-left"
                >
                  <div>
                    <span className="font-mono text-[11px] text-text-primary">
                      {job.id}
                    </span>
                    <div className="font-mono text-[9px] text-text-tertiary">
                      {formatTime(job.createdAt)}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-text-secondary self-center">
                    {job.taskType}
                  </span>
                  <span className="font-mono text-[10px] text-accent self-center truncate">
                    {job.client}
                  </span>
                  <span className="font-mono text-[10px] text-blue-400 self-center">
                    {job.robotName ?? "\u2014"}
                  </span>
                  <span className="font-mono text-[9px] text-text-tertiary self-center truncate">
                    {job.from} {"\u2192"} {job.to}
                  </span>
                  <span className="font-mono text-[11px] text-text-primary self-center">
                    {job.bounty.toFixed(2)}
                  </span>
                  <span
                    className={`self-center font-mono text-[9px] font-semibold rounded-full px-2 py-0.5 text-center ${jobStatusColor(
                      job.status
                    )}`}
                  >
                    {jobStatusLabel(job.status)}
                  </span>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-b border-border bg-surface-0 px-5 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            {
                              label: "Schema",
                              value: job.schema,
                            },
                            {
                              label: "SLA",
                              value: `${job.slaMinutes} min`,
                            },
                            {
                              label: "Time Elapsed",
                              value: job.timeElapsedMinutes
                                ? `${job.timeElapsedMinutes.toFixed(1)} min`
                                : "\u2014",
                            },
                            {
                              label: "Bid",
                              value: job.bid
                                ? `${job.bid.toFixed(2)} USDC`
                                : "\u2014",
                            },
                            {
                              label: "From",
                              value: job.from,
                            },
                            {
                              label: "To",
                              value: job.to,
                            },
                            {
                              label: "Phase",
                              value: job.phase,
                            },
                            {
                              label: "TX Hash",
                              value: job.txHash ?? "\u2014",
                            },
                          ].map((item) => (
                            <div key={item.label}>
                              <div className="font-mono text-[8px] text-text-tertiary uppercase">
                                {item.label}
                              </div>
                              <div className="font-mono text-[11px] text-text-primary mt-0.5 truncate">
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Assign robot for open jobs */}
                        {job.status === "open" && (
                          <div className="flex items-center gap-3 pt-2">
                            <span className="font-mono text-[10px] text-text-tertiary">
                              Assign Robot:
                            </span>
                            <select
                              value={assignments[job.id] ?? ""}
                              onChange={(e) =>
                                setAssignments((prev) => ({
                                  ...prev,
                                  [job.id]: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                            >
                              <option value="">Select robot...</option>
                              {idleRobots
                                .filter((r) =>
                                  r.capabilities.includes(job.taskType)
                                )
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.battery}% battery)
                                  </option>
                                ))}
                            </select>
                            <button
                              disabled={!assignments[job.id]}
                              className="font-mono text-[10px] px-3 py-1.5 rounded-lg border border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 4: EARNINGS & ANALYTICS
// ═════════════════════════════════════════════════════════════════════

function EarningsTab({
  robots,
  jobs,
  settlements,
  earningsData,
}: {
  robots: Robot[];
  jobs: Job[];
  settlements: Settlement[];
  earningsData: EarningsDataPoint[];
}) {
  const totalRevenue = settlements.reduce(
    (s, t) => s + t.robotPayment,
    0
  );
  const totalFees = settlements.reduce((s, t) => s + t.protocolFee, 0);
  const netEarnings = totalRevenue - totalFees;
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const avgPerJob =
    completedJobs.length > 0 ? netEarnings / completedJobs.length : 0;

  const maxEarning = Math.max(...earningsData.map((d) => d.amount), 1);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={`${totalRevenue.toFixed(4)} USDC`}
          accent
        />
        <StatCard
          label="Protocol Fees Paid"
          value={`${totalFees.toFixed(4)} USDC`}
          sub={`${((totalFees / (totalRevenue || 1)) * 100).toFixed(2)}% rate`}
        />
        <StatCard
          label="Net Earnings"
          value={`${netEarnings.toFixed(4)} USDC`}
          accent
        />
        <StatCard
          label="Avg per Job"
          value={`${avgPerJob.toFixed(4)} USDC`}
          sub={`across ${completedJobs.length} jobs`}
        />
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider">
              Earnings &mdash; 24h
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-accent">
              {earningsData
                .reduce((s, d) => s + d.amount, 0)
                .toFixed(1)}{" "}
              USDC
            </div>
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-28">
          {earningsData.map((dp, i) => {
            const height = maxEarning > 0 ? (dp.amount / maxEarning) * 100 : 0;
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.02, duration: 0.4 }}
                className="flex-1 rounded-t-sm bg-accent/20 hover:bg-accent/40 transition-colors cursor-pointer relative group"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block font-mono text-[8px] text-accent bg-surface-0 border border-border rounded px-1 py-0.5 whitespace-nowrap z-10">
                  {dp.hour}: {dp.amount.toFixed(1)}
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {earningsData
            .filter((_, i) => i % 6 === 0)
            .map((dp) => (
              <span
                key={dp.hour}
                className="font-mono text-[8px] text-text-tertiary"
              >
                {dp.hour}
              </span>
            ))}
          <span className="font-mono text-[8px] text-text-tertiary">NOW</span>
        </div>
      </div>

      {/* Per-robot breakdown */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-4">
          Per-Robot Earnings Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Robot",
                  "Jobs Done",
                  "Total Earned",
                  "Today",
                  "Avg / Job",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left font-mono text-[9px] text-text-tertiary uppercase tracking-wider pb-2 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {robots.map((r) => {
                const avg =
                  r.jobsCompleted > 0
                    ? r.earningsTotal / r.jobsCompleted
                    : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="font-mono text-[11px] text-text-primary py-2.5 pr-4">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${robotStatusColor(
                            r.status
                          )}`}
                        />
                        {r.name}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-text-secondary py-2.5 pr-4">
                      {r.jobsCompleted}
                    </td>
                    <td className="font-mono text-[11px] text-text-primary py-2.5 pr-4">
                      {r.earningsTotal.toFixed(2)} USDC
                    </td>
                    <td className="font-mono text-[11px] text-accent py-2.5 pr-4">
                      {r.earningsToday.toFixed(2)} USDC
                    </td>
                    <td className="font-mono text-[11px] text-text-secondary py-2.5">
                      {avg.toFixed(2)} USDC
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement history */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-4">
          Settlement History
        </div>
        <div className="space-y-1.5">
          {settlements.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-surface-0 px-4 py-3"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                  <span className="font-mono text-[7px] font-bold text-accent">
                    {s.taskType.slice(0, 3)}
                  </span>
                </div>
                <div>
                  <div className="font-mono text-[11px] text-text-primary">
                    <span className="text-accent">{s.client}</span>
                    <span className="text-text-tertiary mx-1">{"\u2192"}</span>
                    <span className="text-blue-400">{s.provider}</span>
                  </div>
                  <div className="font-mono text-[9px] text-text-tertiary">
                    {s.jobId} &middot; {s.txHash} &middot; {s.chain}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11px] font-semibold text-accent">
                  {s.robotPayment.toFixed(4)} USDC
                </div>
                <div className="font-mono text-[9px] text-text-tertiary">
                  fee: {s.protocolFee.toFixed(4)} &middot;{" "}
                  {formatTime(s.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 5: FLEET POLICIES
// ═════════════════════════════════════════════════════════════════════

function PoliciesTab({ policy }: { policy: FleetPolicy }) {
  const [localPolicy, setLocalPolicy] = useState<FleetPolicy>({
    ...policy,
    priceFloors: { ...policy.priceFloors },
    priceCeilings: { ...policy.priceCeilings },
    geofenceBounds: {
      lat: [...policy.geofenceBounds.lat] as [number, number],
      lng: [...policy.geofenceBounds.lng] as [number, number],
    },
  });
  const [saved, setSaved] = useState(false);

  const toggleTaskType = (t: TaskType) => {
    setLocalPolicy((p) => ({
      ...p,
      acceptedTaskTypes: p.acceptedTaskTypes.includes(t)
        ? p.acceptedTaskTypes.filter((x) => x !== t)
        : [...p.acceptedTaskTypes, t],
    }));
    setSaved(false);
  };

  const updateFloor = (t: TaskType, v: number) => {
    setLocalPolicy((p) => ({
      ...p,
      priceFloors: { ...p.priceFloors, [t]: v },
    }));
    setSaved(false);
  };

  const updateCeiling = (t: TaskType, v: number) => {
    setLocalPolicy((p) => ({
      ...p,
      priceCeilings: { ...p.priceCeilings, [t]: v },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Policy editor */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider">
          Policy Editor
        </div>

        {/* Accepted task types */}
        <div>
          <div className="font-mono text-[10px] text-text-tertiary uppercase mb-2">
            Accepted Task Types
          </div>
          <div className="flex gap-2 flex-wrap">
            {TASK_TYPES.map((t) => {
              const active = localPolicy.acceptedTaskTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTaskType(t)}
                  className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                    active
                      ? "border-accent/20 bg-accent/10 text-accent"
                      : "border-border bg-surface-0 text-text-tertiary"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price controls */}
        <div>
          <div className="font-mono text-[10px] text-text-tertiary uppercase mb-2">
            Price Controls (USDC)
          </div>
          <div className="space-y-2">
            {TASK_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-secondary w-20">
                  {t}
                </span>
                <div className="flex-1">
                  <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                    Floor
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={localPolicy.priceFloors[t]}
                    onChange={(e) =>
                      updateFloor(t, parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                    Ceiling
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={localPolicy.priceCeilings[t]}
                    onChange={(e) =>
                      updateCeiling(t, parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Max concurrent jobs */}
        <div>
          <div className="font-mono text-[10px] text-text-tertiary uppercase mb-1.5">
            Max Concurrent Jobs
          </div>
          <input
            type="number"
            min="1"
            max="20"
            value={localPolicy.maxConcurrentJobs}
            onChange={(e) => {
              setLocalPolicy((p) => ({
                ...p,
                maxConcurrentJobs: parseInt(e.target.value) || 1,
              }));
              setSaved(false);
            }}
            className="w-32 rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
          />
        </div>

        {/* Geofence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-text-tertiary uppercase">
              Geofence
            </span>
            <Toggle
              enabled={localPolicy.geofenceEnabled}
              onToggle={() => {
                setLocalPolicy((p) => ({
                  ...p,
                  geofenceEnabled: !p.geofenceEnabled,
                }));
                setSaved(false);
              }}
            />
          </div>
          {localPolicy.geofenceEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                  Lat Min
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={localPolicy.geofenceBounds.lat[0]}
                  onChange={(e) => {
                    setLocalPolicy((p) => ({
                      ...p,
                      geofenceBounds: {
                        ...p.geofenceBounds,
                        lat: [
                          parseFloat(e.target.value) || 0,
                          p.geofenceBounds.lat[1],
                        ],
                      },
                    }));
                    setSaved(false);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div>
                <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                  Lat Max
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={localPolicy.geofenceBounds.lat[1]}
                  onChange={(e) => {
                    setLocalPolicy((p) => ({
                      ...p,
                      geofenceBounds: {
                        ...p.geofenceBounds,
                        lat: [
                          p.geofenceBounds.lat[0],
                          parseFloat(e.target.value) || 0,
                        ],
                      },
                    }));
                    setSaved(false);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div>
                <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                  Lng Min
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={localPolicy.geofenceBounds.lng[0]}
                  onChange={(e) => {
                    setLocalPolicy((p) => ({
                      ...p,
                      geofenceBounds: {
                        ...p.geofenceBounds,
                        lng: [
                          parseFloat(e.target.value) || 0,
                          p.geofenceBounds.lng[1],
                        ],
                      },
                    }));
                    setSaved(false);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div>
                <div className="font-mono text-[8px] text-text-tertiary mb-0.5">
                  Lng Max
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={localPolicy.geofenceBounds.lng[1]}
                  onChange={(e) => {
                    setLocalPolicy((p) => ({
                      ...p,
                      geofenceBounds: {
                        ...p.geofenceBounds,
                        lng: [
                          p.geofenceBounds.lng[0],
                          parseFloat(e.target.value) || 0,
                        ],
                      },
                    }));
                    setSaved(false);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto-accept */}
        <div className="flex items-center justify-between rounded-lg bg-surface-0 px-4 py-3">
          <span className="font-mono text-[11px] text-text-secondary">
            Auto-accept matching jobs
          </span>
          <Toggle
            enabled={localPolicy.autoAccept}
            onToggle={() => {
              setLocalPolicy((p) => ({
                ...p,
                autoAccept: !p.autoAccept,
              }));
              setSaved(false);
            }}
          />
        </div>

        {/* Max daily withdraw */}
        <div>
          <div className="font-mono text-[10px] text-text-tertiary uppercase mb-1.5">
            Max Daily Withdraw (USDC)
          </div>
          <input
            type="number"
            min="0"
            step="10"
            value={localPolicy.maxDailyWithdraw}
            onChange={(e) => {
              setLocalPolicy((p) => ({
                ...p,
                maxDailyWithdraw: parseFloat(e.target.value) || 0,
              }));
              setSaved(false);
            }}
            className="w-32 rounded-lg border border-border bg-surface-0 px-3 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent/30 transition-colors"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`w-full rounded-lg px-4 py-2.5 font-mono text-[12px] font-semibold transition-colors ${
            saved
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
          }`}
        >
          {saved ? "Policy Saved" : "Save Policy"}
        </button>
      </div>

      {/* Current policy display */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider">
          Current Policy (Active)
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-surface-0 px-4 py-3">
            <div className="font-mono text-[9px] text-text-tertiary uppercase">
              Accepted Tasks
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {policy.acceptedTaskTypes.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-[9px] text-accent"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-surface-0 px-4 py-3">
            <div className="font-mono text-[9px] text-text-tertiary uppercase mb-2">
              Price Bounds
            </div>
            {TASK_TYPES.map((t) => (
              <div
                key={t}
                className="flex items-center justify-between py-1 border-b border-border last:border-0"
              >
                <span className="font-mono text-[10px] text-text-secondary">
                  {t}
                </span>
                <span className="font-mono text-[10px] text-text-primary">
                  {policy.priceFloors[t].toFixed(2)} &mdash;{" "}
                  {policy.priceCeilings[t].toFixed(2)} USDC
                </span>
              </div>
            ))}
          </div>

          {[
            {
              label: "Max Concurrent Jobs",
              value: String(policy.maxConcurrentJobs),
            },
            {
              label: "Geofence",
              value: policy.geofenceEnabled ? "Enabled" : "Disabled",
            },
            {
              label: "Auto-Accept",
              value: policy.autoAccept ? "On" : "Off",
            },
            {
              label: "Max Daily Withdraw",
              value: `${policy.maxDailyWithdraw} USDC`,
            },
            {
              label: "Emergency Paused",
              value: policy.emergencyPaused ? "YES" : "No",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-surface-0 px-4 py-2.5"
            >
              <span className="font-mono text-[10px] text-text-tertiary">
                {item.label}
              </span>
              <span className="font-mono text-[11px] text-text-primary">
                {item.value}
              </span>
            </div>
          ))}

          {policy.geofenceEnabled && (
            <div className="rounded-lg bg-surface-0 px-4 py-3">
              <div className="font-mono text-[9px] text-text-tertiary uppercase mb-1">
                Geofence Bounds
              </div>
              <div className="font-mono text-[10px] text-text-secondary">
                Lat: {policy.geofenceBounds.lat[0]} to{" "}
                {policy.geofenceBounds.lat[1]}
              </div>
              <div className="font-mono text-[10px] text-text-secondary">
                Lng: {policy.geofenceBounds.lng[0]} to{" "}
                {policy.geofenceBounds.lng[1]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// TAB 6: EMERGENCY CONTROLS
// ═════════════════════════════════════════════════════════════════════

function EmergencyTab({
  robots,
  pausedRobots,
  fleetPaused,
  onTogglePause,
  onToggleFleetPause,
}: {
  robots: Robot[];
  pausedRobots: Set<string>;
  fleetPaused: boolean;
  onTogglePause: (id: string) => void;
  onToggleFleetPause: () => void;
}) {
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  const emergencyLog = [
    {
      time: "2026-03-08 02:14:33",
      action: "Fleet resumed after maintenance window",
      severity: "info",
    },
    {
      time: "2026-03-08 01:45:00",
      action: "EMERGENCY PAUSE triggered — sensor anomaly on G1-EPSILON",
      severity: "critical",
    },
    {
      time: "2026-03-07 23:12:18",
      action: "G1-EPSILON paused — motor fault detected",
      severity: "warning",
    },
    {
      time: "2026-03-07 22:30:00",
      action: "Geofence breach alert — G1-GAMMA near boundary",
      severity: "warning",
    },
    {
      time: "2026-03-07 18:00:00",
      action: "Scheduled maintenance pause — all robots",
      severity: "info",
    },
    {
      time: "2026-03-07 14:22:07",
      action: "Alert broadcast: 'Zone C restricted until 16:00'",
      severity: "info",
    },
  ];

  const severityColor = (s: string) => {
    switch (s) {
      case "critical":
        return "text-red-400 bg-red-400/10";
      case "warning":
        return "text-yellow-400 bg-yellow-400/10";
      default:
        return "text-blue-400 bg-blue-400/10";
    }
  };

  const handleSendAlert = () => {
    if (!alertMessage.trim()) return;
    setAlertSent(true);
    setTimeout(() => {
      setAlertSent(false);
      setAlertMessage("");
    }, 2000);
  };

  return (
    <div className="space-y-5">
      {/* Emergency pause button */}
      <div className="rounded-2xl border border-border bg-surface-1 p-8 flex flex-col items-center">
        <div className="mb-4 font-mono text-[11px] text-text-tertiary uppercase tracking-wider">
          Fleet Status:{" "}
          <span
            className={`font-semibold ${
              fleetPaused ? "text-red-400" : "text-green-400"
            }`}
          >
            {fleetPaused ? "PAUSED" : "ACTIVE"}
          </span>
        </div>
        <button
          onClick={onToggleFleetPause}
          className={`rounded-xl px-12 py-5 font-mono text-[14px] font-bold transition-all ${
            fleetPaused
              ? "bg-green-500/10 border-2 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/50"
              : "bg-red-500/10 border-2 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
          }`}
        >
          {fleetPaused
            ? "RESUME ALL ROBOTS"
            : "EMERGENCY PAUSE ALL"}
        </button>
        <div className="mt-3 font-mono text-[10px] text-text-tertiary">
          {fleetPaused
            ? "All robots are currently halted. Click to resume operations."
            : "This will immediately halt all robot operations."}
        </div>
      </div>

      {/* Individual robot controls */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-4">
          Individual Robot Controls
        </div>
        <div className="space-y-1.5">
          {robots.map((robot) => {
            const isPaused = pausedRobots.has(robot.id) || fleetPaused;
            return (
              <div
                key={robot.id}
                className="flex items-center justify-between rounded-lg bg-surface-0 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isPaused ? "bg-red-400" : robotStatusColor(robot.status)
                    }`}
                  />
                  <span className="font-mono text-[12px] font-semibold text-text-primary">
                    {robot.name}
                  </span>
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {robot.location}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] ${
                      isPaused ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {isPaused ? "PAUSED" : "RUNNING"}
                  </span>
                  <button
                    onClick={() => onTogglePause(robot.id)}
                    disabled={fleetPaused}
                    className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                      fleetPaused
                        ? "border-border bg-surface-1 text-text-tertiary cursor-not-allowed opacity-40"
                        : isPaused
                        ? "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                        : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
                    }`}
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert broadcast */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-3">
          Alert Broadcast
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Type alert message to broadcast to all robots..."
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendAlert()}
            className="flex-1 rounded-lg border border-border bg-surface-0 px-4 py-2.5 font-mono text-[11px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/30 transition-colors"
          />
          <button
            onClick={handleSendAlert}
            disabled={!alertMessage.trim()}
            className={`rounded-lg px-5 py-2.5 font-mono text-[11px] font-semibold border transition-colors ${
              alertSent
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {alertSent ? "Sent" : "Send Alert"}
          </button>
        </div>
      </div>

      {/* Emergency log */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider mb-4">
          Emergency Log
        </div>
        <div className="space-y-1.5">
          {emergencyLog.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-surface-0 px-4 py-3"
            >
              <span
                className={`shrink-0 mt-0.5 font-mono text-[8px] font-bold uppercase rounded-full px-1.5 py-0.5 ${severityColor(
                  entry.severity
                )}`}
              >
                {entry.severity}
              </span>
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-text-primary">
                  {entry.action}
                </div>
                <div className="font-mono text-[9px] text-text-tertiary mt-0.5">
                  {entry.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [tab, setTab] = useState<OperatorTab>("overview");
  const [pausedRobots, setPausedRobots] = useState<Set<string>>(new Set());
  const [fleetPaused, setFleetPaused] = useState(false);

  const togglePause = (robotId: string) => {
    setPausedRobots((prev) => {
      const next = new Set(prev);
      if (next.has(robotId)) {
        next.delete(robotId);
      } else {
        next.add(robotId);
      }
      return next;
    });
  };

  const toggleFleetPause = () => {
    setFleetPaused((prev) => !prev);
    if (!fleetPaused) {
      setPausedRobots(new Set(ROBOTS.map((r) => r.id)));
    } else {
      setPausedRobots(new Set());
    }
  };

  return (
    <AppShell role="operator" activeTab={tab} onTabChange={(t) => setTab(t as OperatorTab)}>
      {tab === "overview" && (
        <OverviewTab
          robots={ROBOTS}
          jobs={JOBS}
          settlements={SETTLEMENTS}
          pausedRobots={pausedRobots}
          onTogglePause={togglePause}
        />
      )}

      {tab === "fleet" && (
        <FleetTab
          robots={ROBOTS}
          jobs={JOBS}
          pausedRobots={pausedRobots}
          onTogglePause={togglePause}
        />
      )}

      {tab === "jobs" && <JobsTab robots={ROBOTS} jobs={JOBS} />}

      {tab === "earnings" && (
        <EarningsTab
          robots={ROBOTS}
          jobs={JOBS}
          settlements={SETTLEMENTS}
          earningsData={EARNINGS_24H}
        />
      )}

      {tab === "policies" && <PoliciesTab policy={FLEET_POLICY} />}

      {tab === "emergency" && (
        <EmergencyTab
          robots={ROBOTS}
          pausedRobots={pausedRobots}
          fleetPaused={fleetPaused}
          onTogglePause={togglePause}
          onToggleFleetPause={toggleFleetPause}
        />
      )}
    </AppShell>
  );
}
