"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "job_posted"
  | "matching"
  | "escrow_locked"
  | "navigating_pickup"
  | "picking_up"
  | "navigating_delivery"
  | "delivering"
  | "proof_submitted"
  | "verifying"
  | "settled";

interface LogEntry {
  prefix: string;
  color: string;
  message: string;
  timestamp: string;
}

interface Point {
  x: number;
  y: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const WAREHOUSE_LOCATIONS: Record<string, Point> = {
  home: { x: 120, y: 360 },
  rackB3: { x: 520, y: 120 },
  dispatchBay2: { x: 520, y: 360 },
};

const PHASE_CONFIG: Record<Phase, { duration: number; robotTarget: string }> = {
  idle: { duration: 1500, robotTarget: "home" },
  job_posted: { duration: 1200, robotTarget: "home" },
  matching: { duration: 1500, robotTarget: "home" },
  escrow_locked: { duration: 1000, robotTarget: "home" },
  navigating_pickup: { duration: 2500, robotTarget: "rackB3" },
  picking_up: { duration: 1200, robotTarget: "rackB3" },
  navigating_delivery: { duration: 2500, robotTarget: "dispatchBay2" },
  delivering: { duration: 1200, robotTarget: "dispatchBay2" },
  proof_submitted: { duration: 1000, robotTarget: "dispatchBay2" },
  verifying: { duration: 1500, robotTarget: "dispatchBay2" },
  settled: { duration: 3000, robotTarget: "dispatchBay2" },
};

const PHASE_ORDER: Phase[] = [
  "idle",
  "job_posted",
  "matching",
  "escrow_locked",
  "navigating_pickup",
  "picking_up",
  "navigating_delivery",
  "delivering",
  "proof_submitted",
  "verifying",
  "settled",
];

function getLog(phase: Phase, time: string): LogEntry | null {
  const logs: Partial<Record<Phase, LogEntry>> = {
    job_posted: {
      prefix: "MERCHANT-7",
      color: "text-accent",
      message: "POST job CARRY · Rack B3 → Dispatch Bay 2 · 2.00 USDC",
      timestamp: time,
    },
    matching: {
      prefix: "ROVA",
      color: "text-text-tertiary",
      message: "3 robots available · matching by reputation + ETA...",
      timestamp: time,
    },
    escrow_locked: {
      prefix: "ESCROW",
      color: "text-yellow-400",
      message: "1.75 USDC locked · tx 0x3f8a...c2d1 · G1-ALPHA selected",
      timestamp: time,
    },
    navigating_pickup: {
      prefix: "G1-ALPHA",
      color: "text-blue-400",
      message: "Job accepted · navigating to Rack B3...",
      timestamp: time,
    },
    picking_up: {
      prefix: "G1-ALPHA",
      color: "text-blue-400",
      message: "Arrived at Rack B3 · picking up payload...",
      timestamp: time,
    },
    navigating_delivery: {
      prefix: "G1-ALPHA",
      color: "text-blue-400",
      message: "Payload secured · navigating to Dispatch Bay 2...",
      timestamp: time,
    },
    delivering: {
      prefix: "G1-ALPHA",
      color: "text-blue-400",
      message: "Arrived at Dispatch Bay 2 · delivering payload...",
      timestamp: time,
    },
    proof_submitted: {
      prefix: "G1-ALPHA",
      color: "text-blue-400",
      message: "SUBMIT proof · GPS (52.41, -1.51) · hash 0x9e2b...f4a7",
      timestamp: time,
    },
    verifying: {
      prefix: "VERIFIER",
      color: "text-purple-400",
      message: "Validating GPS coords + timestamp + SLA compliance...",
      timestamp: time,
    },
    settled: {
      prefix: "SETTLED",
      color: "text-accent",
      message: "1.75 USDC → G1-ALPHA · 0.25 USDC → MERCHANT-7 · Job complete",
      timestamp: time,
    },
  };
  return logs[phase] ?? null;
}

function formatTime(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Warehouse Canvas ────────────────────────────────────────────────
function WarehouseCanvas({ phase, robotPos }: { phase: Phase; robotPos: Point }) {
  const hasPayload =
    PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("picking_up") &&
    PHASE_ORDER.indexOf(phase) <= PHASE_ORDER.indexOf("delivering");

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-surface-0">
      {/* Grid overlay */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Location markers */}
      <LocationMarker
        pos={WAREHOUSE_LOCATIONS.home}
        label="G1-ALPHA HOME"
        sublabel="Charging Bay"
        active={phase === "idle"}
      />
      <LocationMarker
        pos={WAREHOUSE_LOCATIONS.rackB3}
        label="RACK B3"
        sublabel="Pickup Zone"
        active={phase === "navigating_pickup" || phase === "picking_up"}
        highlight={phase === "picking_up"}
      />
      <LocationMarker
        pos={WAREHOUSE_LOCATIONS.dispatchBay2}
        label="DISPATCH BAY 2"
        sublabel="Delivery Zone"
        active={phase === "navigating_delivery" || phase === "delivering"}
        highlight={phase === "delivering"}
      />

      {/* Path lines */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none">
        {/* Home to Rack B3 */}
        <line
          x1={WAREHOUSE_LOCATIONS.home.x}
          y1={WAREHOUSE_LOCATIONS.home.y}
          x2={WAREHOUSE_LOCATIONS.rackB3.x}
          y2={WAREHOUSE_LOCATIONS.rackB3.y}
          stroke="rgba(239,111,46,0.08)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Rack B3 to Dispatch Bay 2 */}
        <line
          x1={WAREHOUSE_LOCATIONS.rackB3.x}
          y1={WAREHOUSE_LOCATIONS.rackB3.y}
          x2={WAREHOUSE_LOCATIONS.dispatchBay2.x}
          y2={WAREHOUSE_LOCATIONS.dispatchBay2.y}
          stroke="rgba(239,111,46,0.08)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Robot */}
      <motion.div
        className="absolute z-20"
        animate={{ x: robotPos.x - 20, y: robotPos.y - 20 }}
        transition={{ duration: 2.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="relative flex h-10 w-10 items-center justify-center">
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-accent/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Robot body */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 border border-accent/50">
            <div className="h-3 w-3 rounded-full bg-accent" />
          </div>
          {/* Payload indicator */}
          {hasPayload && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 border border-yellow-500"
            />
          )}
        </div>
        <div className="mt-1 text-center font-mono text-[9px] text-accent/70 whitespace-nowrap">
          G1-ALPHA
        </div>
      </motion.div>

      {/* Warehouse label rows */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span className="font-mono text-[10px] text-text-tertiary">WAREHOUSE-01 · LIVE</span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent/60" />
          <span className="text-[10px] text-text-tertiary">Robot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <span className="text-[10px] text-text-tertiary">Payload</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 border-t border-dashed border-accent/30" />
          <span className="text-[10px] text-text-tertiary">Path</span>
        </div>
      </div>
    </div>
  );
}

function LocationMarker({
  pos,
  label,
  sublabel,
  active,
  highlight,
}: {
  pos: Point;
  label: string;
  sublabel: string;
  active?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="absolute z-10"
      style={{ left: pos.x - 50, top: pos.y - 50 }}
    >
      <div
        className={`flex h-[100px] w-[100px] flex-col items-center justify-center rounded-xl border transition-all duration-500 ${
          highlight
            ? "border-accent/40 bg-accent/[0.06]"
            : active
            ? "border-border-hover bg-surface-2/50"
            : "border-border bg-surface-1/50"
        }`}
      >
        {highlight && (
          <motion.div
            className="absolute inset-0 rounded-xl border border-accent/20"
            animate={{ opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <span className="font-mono text-[9px] font-bold text-text-primary">{label}</span>
        <span className="font-mono text-[8px] text-text-tertiary mt-0.5">{sublabel}</span>
      </div>
    </div>
  );
}

// ─── Job Lifecycle Panel ─────────────────────────────────────────────
function LifecyclePanel({ phase }: { phase: Phase }) {
  const stages = [
    { id: "job_posted", label: "Job Posted", icon: "POST" },
    { id: "matching", label: "Matching", icon: "MATCH" },
    { id: "escrow_locked", label: "Escrow Locked", icon: "LOCK" },
    { id: "navigating_pickup", label: "Navigating", icon: "NAV" },
    { id: "picking_up", label: "Pickup", icon: "PICK" },
    { id: "navigating_delivery", label: "In Transit", icon: "MOVE" },
    { id: "delivering", label: "Delivering", icon: "DROP" },
    { id: "proof_submitted", label: "Proof Sent", icon: "PROOF" },
    { id: "verifying", label: "Verifying", icon: "CHECK" },
    { id: "settled", label: "Settled", icon: "DONE" },
  ];

  const currentIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">
          ACP Job Lifecycle
        </span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
          phase === "settled"
            ? "bg-accent/10 text-accent"
            : phase === "idle"
            ? "bg-surface-2 text-text-tertiary"
            : "bg-yellow-400/10 text-yellow-400"
        }`}>
          {phase === "idle" ? "STANDBY" : phase === "settled" ? "COMPLETE" : "IN PROGRESS"}
        </span>
      </div>
      <div className="space-y-1">
        {stages.map((s, i) => {
          const stageIndex = PHASE_ORDER.indexOf(s.id as Phase);
          const isPast = currentIndex > stageIndex;
          const isCurrent = currentIndex === stageIndex;
          const isFuture = currentIndex < stageIndex;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                isCurrent
                  ? "bg-accent/[0.06] border border-accent/20"
                  : isPast
                  ? "opacity-60"
                  : "opacity-30"
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-mono font-bold ${
                  isCurrent
                    ? "bg-accent text-background"
                    : isPast
                    ? "bg-accent/20 text-accent"
                    : "bg-surface-3 text-text-tertiary"
                }`}
              >
                {isPast ? "\u2713" : i + 1}
              </div>
              <div className="flex-1">
                <span className={`text-[12px] ${
                  isCurrent ? "text-accent font-semibold" : isPast ? "text-text-secondary" : "text-text-tertiary"
                }`}>
                  {s.label}
                </span>
              </div>
              <span className={`font-mono text-[8px] ${
                isCurrent ? "text-accent" : "text-text-tertiary"
              }`}>
                {s.icon}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Job Details Card ────────────────────────────────────────────────
function JobDetails({ phase }: { phase: Phase }) {
  const active = phase !== "idle";
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">
          Active Job
        </span>
        {active && (
          <span className="font-mono text-[10px] text-accent">JOB-0x7F3A</span>
        )}
      </div>
      {active ? (
        <div className="space-y-3">
          <DetailRow label="Type" value="CARRY" />
          <DetailRow label="Client" value="MERCHANT-7" valueColor="text-accent" />
          <DetailRow label="Provider" value="G1-ALPHA" valueColor="text-blue-400" />
          <DetailRow label="From" value="Rack B3 (52.412, -1.509)" />
          <DetailRow label="To" value="Dispatch Bay 2 (52.413, -1.508)" />
          <DetailRow label="Bounty" value="2.00 USDC" />
          <DetailRow label="Bid" value="1.75 USDC" />
          <DetailRow label="SLA" value="5 minutes" />
          <DetailRow label="Schema" value="ROVA-CARRY-v1" />
          <div className="mt-3 border-t border-border pt-3">
            <DetailRow
              label="Escrow"
              value={
                PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked")
                  ? phase === "settled"
                    ? "RELEASED"
                    : "1.75 USDC LOCKED"
                  : "PENDING"
              }
              valueColor={
                phase === "settled" ? "text-accent" : "text-yellow-400"
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center">
          <span className="font-mono text-xs text-text-tertiary">Waiting for job...</span>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor = "text-text-secondary",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <span className={`font-mono text-[11px] ${valueColor}`}>{value}</span>
    </div>
  );
}

// ─── Robot Status Card ───────────────────────────────────────────────
function RobotStatus({ phase }: { phase: Phase }) {
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const isMoving = phase === "navigating_pickup" || phase === "navigating_delivery";
  const hasPayload =
    phaseIdx >= PHASE_ORDER.indexOf("picking_up") &&
    phaseIdx <= PHASE_ORDER.indexOf("delivering");

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">
          Robot Status
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isMoving ? "bg-blue-400 animate-pulse" : "bg-accent"}`} />
          <span className="font-mono text-[10px] text-text-tertiary">
            {isMoving ? "MOVING" : phase === "idle" ? "IDLE" : "ACTIVE"}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        <DetailRow label="Unit" value="G1-ALPHA" valueColor="text-blue-400" />
        <DetailRow label="Type" value="Unitree G1" />
        <DetailRow label="Reputation" value="4.9 / 5.0" valueColor="text-accent" />
        <DetailRow label="Jobs Today" value="14" />
        <DetailRow label="Earnings" value="22.50 USDC" />
        <DetailRow label="Payload" value={hasPayload ? "CARRYING" : "EMPTY"} valueColor={hasPayload ? "text-yellow-400" : "text-text-tertiary"} />
        <DetailRow label="Battery" value="87%" />
        <DetailRow
          label="Stake"
          value="500 ROVA"
          valueColor="text-accent"
        />
      </div>
    </div>
  );
}

// ─── Log Feed ────────────────────────────────────────────────────────
function LogFeed({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider">
          Transaction Log
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">{logs.length} events</span>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-[11px] leading-relaxed"
            >
              <span className="text-text-tertiary mr-2">{log.timestamp}</span>
              <span className={`${log.color} font-semibold`}>[{log.prefix}]</span>{" "}
              <span className="text-text-secondary">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      {logs.length === 0 && (
        <div className="flex h-20 items-center justify-center">
          <span className="font-mono text-[11px] text-text-tertiary">Waiting for activity...</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Simulator Page ─────────────────────────────────────────────
export default function SimulatorPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [robotPos, setRobotPos] = useState<Point>(WAREHOUSE_LOCATIONS.home);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulation = useCallback(() => {
    setPhase("idle");
    setLogs([]);
    setRobotPos(WAREHOUSE_LOCATIONS.home);
    setRunning(true);

    let i = 0;
    const advance = () => {
      if (i >= PHASE_ORDER.length) {
        // Loop: restart after settled
        setTimeout(() => {
          setPhase("idle");
          setLogs([]);
          setRobotPos(WAREHOUSE_LOCATIONS.home);
          i = 0;
          timeoutRef.current = setTimeout(advance, 1500);
        }, 3000);
        return;
      }

      const p = PHASE_ORDER[i];
      setPhase(p);
      setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);

      const log = getLog(p, formatTime());
      if (log) {
        setLogs((prev) => [...prev, log]);
      }

      i++;
      timeoutRef.current = setTimeout(advance, PHASE_CONFIG[p].duration);
    };

    timeoutRef.current = setTimeout(advance, 500);
  }, []);

  const stopSimulation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRunning(false);
    setPhase("idle");
    setLogs([]);
    setRobotPos(WAREHOUSE_LOCATIONS.home);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
            <span className="text-[13px] text-text-secondary">Simulator</span>
          </div>

          <div className="flex items-center gap-3">
            {!running ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-1.5 text-[13px] font-medium text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Run Demo
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-1.5 text-[13px] font-medium text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-[1400px] p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left: Canvas + Log */}
          <div className="flex flex-col gap-4">
            <div className="h-[480px]">
              <WarehouseCanvas phase={phase} robotPos={robotPos} />
            </div>
            <LogFeed logs={logs} />
          </div>

          {/* Right: Panels */}
          <div className="flex flex-col gap-4">
            <LifecyclePanel phase={phase} />
            <JobDetails phase={phase} />
            <RobotStatus phase={phase} />
          </div>
        </div>
      </div>
    </div>
  );
}
