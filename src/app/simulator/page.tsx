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
  job_posted: { duration: 1800, robotTarget: "home" },
  matching: { duration: 2000, robotTarget: "home" },
  escrow_locked: { duration: 1500, robotTarget: "home" },
  navigating_pickup: { duration: 3000, robotTarget: "rackB3" },
  picking_up: { duration: 1500, robotTarget: "rackB3" },
  navigating_delivery: { duration: 3000, robotTarget: "dispatchBay2" },
  delivering: { duration: 1500, robotTarget: "dispatchBay2" },
  proof_submitted: { duration: 1500, robotTarget: "dispatchBay2" },
  verifying: { duration: 2000, robotTarget: "dispatchBay2" },
  settled: { duration: 4000, robotTarget: "dispatchBay2" },
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
      prefix: "REGISTRY",
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
      message: "1.7448 USDC → G1-ALPHA · 0.0052 USDC fee · Job complete",
      timestamp: time,
    },
  };
  return logs[phase] ?? null;
}

function formatTime(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Narrative overlay text per phase ────────────────────────────────
function getNarrative(phase: Phase): string {
  const narratives: Partial<Record<Phase, string>> = {
    idle: "An agent is about to post a physical task through ACP...",
    job_posted:
      "The agent posts a CARRY task to the ROVA marketplace. Bounty: 2.00 USDC. The task needs a robot to move cargo from Rack B3 to Dispatch Bay 2.",
    matching:
      "The ROVA registry matches the task to the best-fit robot based on capability, reputation, location, and bid price.",
    escrow_locked:
      "G1-ALPHA wins the bid at 1.75 USDC. The bounty is now locked in the ROVAMarket escrow contract. Neither party can withdraw until verification.",
    navigating_pickup:
      "G1-ALPHA accepts the job and begins navigating to the pickup location at Rack B3.",
    picking_up:
      "The robot arrives at Rack B3 and picks up the payload. Sensor confirmation logged.",
    navigating_delivery:
      "Payload secured. G1-ALPHA navigates to the delivery point at Dispatch Bay 2.",
    delivering:
      "Arrived at destination. The robot delivers the payload and prepares to submit proof of completion.",
    proof_submitted:
      "G1-ALPHA submits proof to ROVAVerifier.sol — GPS coordinates, timestamp, and sensor hash.",
    verifying:
      "The verifier contract validates: GPS at destination, timestamp within SLA, sensor hash matches. All checks pass.",
    settled:
      "Escrow releases automatically. 1.7448 USDC sent to G1-ALPHA's wallet. 0.0052 USDC protocol fee. Settlement recorded onchain.",
  };
  return narratives[phase] ?? "";
}

// ─── Warehouse Canvas ────────────────────────────────────────────────
function WarehouseCanvas({
  phase,
  robotPos,
}: {
  phase: Phase;
  robotPos: Point;
}) {
  const hasPayload =
    PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("picking_up") &&
    PHASE_ORDER.indexOf(phase) <= PHASE_ORDER.indexOf("delivering");

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-surface-0">
      {/* Grid overlay */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
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
        <line
          x1={WAREHOUSE_LOCATIONS.home.x}
          y1={WAREHOUSE_LOCATIONS.home.y}
          x2={WAREHOUSE_LOCATIONS.rackB3.x}
          y2={WAREHOUSE_LOCATIONS.rackB3.y}
          stroke="rgba(239,111,46,0.08)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
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
          <motion.div
            className="absolute inset-0 rounded-full border border-accent/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 border border-accent/50">
            <div className="h-3 w-3 rounded-full bg-accent" />
          </div>
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

      {/* Warehouse label */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span className="font-mono text-[10px] text-text-tertiary">
          WAREHOUSE-01 · LIVE
        </span>
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
        <span className="font-mono text-[9px] font-bold text-text-primary">
          {label}
        </span>
        <span className="font-mono text-[8px] text-text-tertiary mt-0.5">
          {sublabel}
        </span>
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
        <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          ACP Job Lifecycle
        </span>
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
            phase === "settled"
              ? "bg-accent/10 text-accent"
              : phase === "idle"
              ? "bg-surface-2 text-text-tertiary"
              : "bg-yellow-400/10 text-yellow-400"
          }`}
        >
          {phase === "idle"
            ? "STANDBY"
            : phase === "settled"
            ? "COMPLETE"
            : "IN PROGRESS"}
        </span>
      </div>
      <div className="space-y-1">
        {stages.map((s, i) => {
          const stageIndex = PHASE_ORDER.indexOf(s.id as Phase);
          const isPast = currentIndex > stageIndex;
          const isCurrent = currentIndex === stageIndex;

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
                <span
                  className={`text-[12px] ${
                    isCurrent
                      ? "text-accent font-semibold"
                      : isPast
                      ? "text-text-secondary"
                      : "text-text-tertiary"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <span
                className={`font-mono text-[8px] ${
                  isCurrent ? "text-accent" : "text-text-tertiary"
                }`}
              >
                {s.icon}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settlement Card (appears when settled) ──────────────────────────
function SettlementCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 15 }}
      className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent pulse-glow" />
        <span className="font-mono text-[11px] font-semibold text-accent uppercase tracking-wider">
          Settlement Complete
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary">
            Robot Payment
          </span>
          <span className="font-mono text-[12px] font-semibold text-accent">
            1.7448 USDC
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary">
            Protocol Fee
          </span>
          <span className="font-mono text-[12px] text-text-secondary">
            0.0052 USDC
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary">
            Robot
          </span>
          <span className="font-mono text-[12px] text-blue-400">G1-ALPHA</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary">
            Settlement TX
          </span>
          <span className="font-mono text-[12px] text-text-secondary">
            0x4d1f...e8c3
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary">
            Chain
          </span>
          <span className="font-mono text-[12px] text-text-secondary">
            Base Sepolia
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-accent/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-text-tertiary">
              SLA
            </span>
            <span className="font-mono text-[12px] text-green-400">
              MET (2m 14s / 5m max)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
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
        <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          Transaction Log
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          {logs.length} events
        </span>
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
              <span className={`${log.color} font-semibold`}>
                [{log.prefix}]
              </span>{" "}
              <span className="text-text-secondary">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      {logs.length === 0 && (
        <div className="flex h-20 items-center justify-center">
          <span className="font-mono text-[11px] text-text-tertiary">
            Waiting for activity...
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Narrative Bar ───────────────────────────────────────────────────
function NarrativeBar({ phase }: { phase: Phase }) {
  const text = getNarrative(phase);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          What&apos;s happening
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[13px] leading-[1.6] text-text-secondary"
        >
          {text}
        </motion.p>
      </AnimatePresence>
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
        return; // Stop at settled — don't loop
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
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <span className="font-mono text-[14px] font-semibold text-text-primary">
                ROVA
              </span>
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="font-mono text-[13px] text-text-secondary">
              Simulator
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!running ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-1.5 font-mono text-[13px] font-semibold text-background hover:brightness-110 transition-all"
              >
                Post Job
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-1.5 font-mono text-[13px] font-medium text-text-secondary border border-border hover:bg-surface-3 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Intro section (shown when idle and not running) */}
      {!running && phase === "idle" && (
        <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-4">
          <div className="rounded-2xl border border-border bg-surface-1 p-8 lg:p-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                  ACP Simulator
                </span>
              </div>
              <h1 className="font-mono text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-text-primary mb-4">
                The ROVA ACP Simulator
              </h1>
              <p className="font-mono text-[14px] leading-[1.7] text-text-tertiary mb-6">
                An agent posts a task through ACP, a robot accepts the job,
                executes the task in the physical environment, and then submits
                GPS and timestamp proof to the verifier contract.
              </p>
              <p className="font-mono text-[14px] leading-[1.7] text-text-tertiary mb-8">
                Once the proof is validated, escrow releases automatically and
                the robot receives payment onchain. Click{" "}
                <span className="text-accent font-semibold">Post Job</span> to
                see the full agent-to-robot lifecycle.
              </p>
              <button
                onClick={runSimulation}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 font-mono text-[14px] font-semibold text-background hover:brightness-110 transition-all"
              >
                Post Job &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="mx-auto max-w-[1400px] p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          {/* Left: Canvas + Narrative + Log */}
          <div className="flex flex-col gap-4">
            <div className="h-[480px]">
              <WarehouseCanvas phase={phase} robotPos={robotPos} />
            </div>
            <NarrativeBar phase={phase} />
            <LogFeed logs={logs} />
          </div>

          {/* Right: Panels */}
          <div className="flex flex-col gap-4">
            <LifecyclePanel phase={phase} />
            <SettlementCard visible={phase === "settled"} />

            {/* Job details */}
            <div className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                  Active Job
                </span>
                {phase !== "idle" && (
                  <span className="font-mono text-[10px] text-accent">
                    JOB-0x7F3A
                  </span>
                )}
              </div>
              {phase !== "idle" ? (
                <div className="space-y-2.5">
                  <DetailRow label="Type" value="CARRY" />
                  <DetailRow
                    label="Client"
                    value="MERCHANT-7"
                    valueColor="text-accent"
                  />
                  <DetailRow
                    label="Provider"
                    value="G1-ALPHA"
                    valueColor="text-blue-400"
                  />
                  <DetailRow label="From" value="Rack B3" />
                  <DetailRow label="To" value="Dispatch Bay 2" />
                  <DetailRow label="Bounty" value="2.00 USDC" />
                  <DetailRow label="Winning Bid" value="1.75 USDC" />
                  <DetailRow label="SLA" value="5 minutes" />
                  <div className="mt-2 pt-2 border-t border-border">
                    <DetailRow
                      label="Escrow"
                      value={
                        PHASE_ORDER.indexOf(phase) >=
                        PHASE_ORDER.indexOf("escrow_locked")
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
                <div className="flex h-24 items-center justify-center">
                  <span className="font-mono text-[11px] text-text-tertiary">
                    Click Post Job to begin...
                  </span>
                </div>
              )}
            </div>

            {/* Robot status */}
            <div className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                  Robot Status
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      phase === "navigating_pickup" ||
                      phase === "navigating_delivery"
                        ? "bg-blue-400 animate-pulse"
                        : "bg-accent"
                    }`}
                  />
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {phase === "navigating_pickup" ||
                    phase === "navigating_delivery"
                      ? "MOVING"
                      : phase === "idle"
                      ? "IDLE"
                      : "ACTIVE"}
                  </span>
                </div>
              </div>
              <div className="space-y-2.5">
                <DetailRow
                  label="Unit"
                  value="G1-ALPHA"
                  valueColor="text-blue-400"
                />
                <DetailRow label="Type" value="Unitree G1" />
                <DetailRow
                  label="Reputation"
                  value="4.9 / 5.0"
                  valueColor="text-accent"
                />
                <DetailRow label="Jobs Today" value="14" />
                <DetailRow label="Earnings" value="22.50 USDC" />
                <DetailRow
                  label="Payload"
                  value={
                    PHASE_ORDER.indexOf(phase) >=
                      PHASE_ORDER.indexOf("picking_up") &&
                    PHASE_ORDER.indexOf(phase) <=
                      PHASE_ORDER.indexOf("delivering")
                      ? "CARRYING"
                      : "EMPTY"
                  }
                  valueColor={
                    PHASE_ORDER.indexOf(phase) >=
                      PHASE_ORDER.indexOf("picking_up") &&
                    PHASE_ORDER.indexOf(phase) <=
                      PHASE_ORDER.indexOf("delivering")
                      ? "text-yellow-400"
                      : "text-text-tertiary"
                  }
                />
                <DetailRow label="Battery" value="87%" />
                <DetailRow
                  label="Stake"
                  value="500 ROVA"
                  valueColor="text-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Why the robotics lab matters (always visible) */}
        <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                  Why the Robotics Lab
                </span>
              </div>
              <h2 className="font-mono text-[clamp(1.2rem,2.5vw,1.75rem)] font-semibold leading-[1.2] tracking-tight text-text-primary mb-4">
                This simulator shows the full protocol flow, but the missing
                step is validating the physical execution loop with real robots.
              </h2>
              <p className="font-mono text-[13px] leading-[1.65] text-text-tertiary">
                Access to the robotics lab and the Unitree G1 robots would allow
                ROVA to complete that final step and validate agent-to-robot
                coordination in the real world. That&apos;s what we&apos;re
                excited to build during the program.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-surface-0 p-5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary block mb-3">
                  What we&apos;ve validated
                </span>
                <div className="space-y-2">
                  {[
                    "Agent-to-robot task posting via ACP v2",
                    "Onchain escrow lock and release",
                    "GPS + timestamp proof verification",
                    "Automatic settlement on Base",
                    "Fleet operator policy controls",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-accent" />
                      <span className="font-mono text-[12px] text-text-secondary">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-0 p-5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary block mb-3">
                  What the lab unlocks
                </span>
                <div className="space-y-2">
                  {[
                    "Real Unitree G1 physical task execution",
                    "Sensor-to-chain proof pipeline",
                    "Multi-robot fleet coordination",
                    "Real-world SLA validation",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-accent/40" />
                      <span className="font-mono text-[12px] text-text-tertiary">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <span className="font-mono text-[11px] text-text-tertiary">{label}</span>
      <span className={`font-mono text-[11px] ${valueColor}`}>{value}</span>
    </div>
  );
}
