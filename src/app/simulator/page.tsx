"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "boot"
  | "job_posted"
  | "matching"
  | "escrow_locked"
  | "navigating_pickup"
  | "picking_up"
  | "navigating_delivery"
  | "delivering"
  | "proof_submitted"
  | "build_userop"
  | "submit_bundler"
  | "verifying"
  | "settled";

type EventSource = "SYS" | "ACP" | "ROS2" | "CHAIN" | "BUNDLER" | "WALLET";

interface LogEntry {
  source: EventSource;
  message: string;
  timestamp: string;
  detail?: string;
}

interface Point {
  x: number;
  y: number;
}

type CameraMode = "top-down" | "isometric" | "robot-pov";

type FaultType =
  | "gps_jam"
  | "robot_down"
  | "escrow_stuck"
  | "sla_breach"
  | "sensor_failure";

interface InjectedFault {
  type: FaultType;
  injectedAt: Phase;        // which phase the fault is queued to trigger at
  triggered: boolean;
}

interface AmbientRobot {
  id: string;
  name: string;
  pos: Point;
  target: Point;
  phase: Phase;
  jobLabel: string;
  payload: boolean;
  faulted: boolean;
}

type InspectableKind = "robot" | "shelf" | "bay" | "agent" | "contract";

interface InspectableEntity {
  kind: InspectableKind;
  id: string;
  label: string;
  data: Record<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────
const WAREHOUSE_LOCATIONS: Record<string, Point> = {
  home: { x: 0.15, y: 0.75 },
  rackB3: { x: 0.72, y: 0.22 },
  dispatchBay2: { x: 0.72, y: 0.75 },
};

// Shelf positions (relative coordinates for canvas rendering)
const SHELVES = [
  { x: 0.25, y: 0.15, w: 0.12, h: 0.06, label: "A1" },
  { x: 0.40, y: 0.15, w: 0.12, h: 0.06, label: "A2" },
  { x: 0.55, y: 0.15, w: 0.12, h: 0.06, label: "A3" },
  { x: 0.25, y: 0.28, w: 0.12, h: 0.06, label: "B1" },
  { x: 0.40, y: 0.28, w: 0.12, h: 0.06, label: "B2" },
  { x: 0.55, y: 0.28, w: 0.12, h: 0.06, label: "B3" },
  { x: 0.25, y: 0.41, w: 0.12, h: 0.06, label: "C1" },
  { x: 0.40, y: 0.41, w: 0.12, h: 0.06, label: "C2" },
  { x: 0.55, y: 0.41, w: 0.12, h: 0.06, label: "C3" },
];

const DISPATCH_BAYS = [
  { x: 0.82, y: 0.60, w: 0.10, h: 0.06, label: "Bay 1" },
  { x: 0.82, y: 0.72, w: 0.10, h: 0.06, label: "Bay 2" },
  { x: 0.82, y: 0.84, w: 0.10, h: 0.06, label: "Bay 3" },
];

const SOURCE_COLORS: Record<EventSource, { text: string; bg: string }> = {
  SYS: { text: "text-text-tertiary", bg: "bg-surface-3" },
  ACP: { text: "text-accent", bg: "bg-accent/10" },
  ROS2: { text: "text-teal", bg: "bg-teal/10" },
  CHAIN: { text: "text-forest", bg: "bg-forest/10" },
  BUNDLER: { text: "text-amber", bg: "bg-amber/10" },
  WALLET: { text: "text-slate", bg: "bg-slate/10" },
};

const PHASE_CONFIG: Record<Phase, { duration: number; robotTarget: string }> = {
  idle: { duration: 800, robotTarget: "home" },
  boot: { duration: 1400, robotTarget: "home" },
  job_posted: { duration: 1800, robotTarget: "home" },
  matching: { duration: 2000, robotTarget: "home" },
  escrow_locked: { duration: 1500, robotTarget: "home" },
  navigating_pickup: { duration: 3000, robotTarget: "rackB3" },
  picking_up: { duration: 1500, robotTarget: "rackB3" },
  navigating_delivery: { duration: 3000, robotTarget: "dispatchBay2" },
  delivering: { duration: 1500, robotTarget: "dispatchBay2" },
  proof_submitted: { duration: 1500, robotTarget: "dispatchBay2" },
  build_userop: { duration: 1800, robotTarget: "dispatchBay2" },
  submit_bundler: { duration: 2000, robotTarget: "dispatchBay2" },
  verifying: { duration: 2000, robotTarget: "dispatchBay2" },
  settled: { duration: 5000, robotTarget: "dispatchBay2" },
};

const PHASE_ORDER: Phase[] = [
  "idle",
  "boot",
  "job_posted",
  "matching",
  "escrow_locked",
  "navigating_pickup",
  "picking_up",
  "navigating_delivery",
  "delivering",
  "proof_submitted",
  "build_userop",
  "submit_bundler",
  "verifying",
  "settled",
];

function getPhaseLog(phase: Phase, time: string): LogEntry | null {
  const logs: Partial<Record<Phase, LogEntry>> = {
    boot: {
      source: "SYS",
      message: "Initializing ROVA protocol connections...",
      timestamp: time,
      detail: "ACP v2 · ROS2 Humble · Base Sepolia · ERC-4337",
    },
    job_posted: {
      source: "ACP",
      message: "Job posted → CARRY task · Rack B3 → Dispatch Bay 2",
      timestamp: time,
      detail: "bounty: 2.00 USDC · schema: ROVA-CARRY-v1 · client: MERCHANT-7",
    },
    matching: {
      source: "ACP",
      message: "Matching request broadcast · 3 providers in range",
      timestamp: time,
      detail: "scoring: reputation(0.4) + eta(0.3) + price(0.3)",
    },
    escrow_locked: {
      source: "CHAIN",
      message: "Escrow locked · 1.75 USDC → ROVAMarket.sol",
      timestamp: time,
      detail: "tx: 0x3f8a...c2d1 · block: 14892031 · provider: G1-ALPHA",
    },
    navigating_pickup: {
      source: "ROS2",
      message: "Navigation goal set → Rack B3 (Zone B · Row 3)",
      timestamp: time,
      detail: "planner: NavFn · costmap: updated · ETA: 12s",
    },
    picking_up: {
      source: "ROS2",
      message: "Arrived at pickup · gripper engaged · payload secured",
      timestamp: time,
      detail: "sensor_hash: 0x7c2f...a1b3 · weight: 2.4kg · grip_force: 15N",
    },
    navigating_delivery: {
      source: "ROS2",
      message: "Navigating to Dispatch Bay 2 · payload in transit",
      timestamp: time,
      detail: "distance: 8.2m · estimated: 10s · battery_draw: 2.1%",
    },
    delivering: {
      source: "ROS2",
      message: "Delivery confirmed · gripper released · payload placed",
      timestamp: time,
      detail: "gps: (52.4137, -1.5108) · placement_accuracy: 0.02m",
    },
    proof_submitted: {
      source: "ACP",
      message: "Proof submitted → ROVAVerifier.sol",
      timestamp: time,
      detail: "gps_hash + timestamp + sensor_hash → proof_root: 0x9e2b...f4a7",
    },
    build_userop: {
      source: "WALLET",
      message: "Building ERC-4337 UserOperation for settlement",
      timestamp: time,
      detail: "sender: 0x71C7...4e2F · nonce: 47 · callData: releaseEscrow()",
    },
    submit_bundler: {
      source: "BUNDLER",
      message: "UserOp submitted to bundler · awaiting inclusion",
      timestamp: time,
      detail: "bundler: stackup.sh · maxFeePerGas: 0.1 gwei · gas: 142000",
    },
    verifying: {
      source: "CHAIN",
      message: "Verifying proof onchain · all checks passing",
      timestamp: time,
      detail: "gps: ✓ · timestamp: ✓ · sla: ✓ (2m14s / 5m max) · hash: ✓",
    },
    settled: {
      source: "CHAIN",
      message: "Settlement confirmed · escrow released",
      timestamp: time,
      detail: "1.7448 USDC → G1-ALPHA · 0.0052 fee · tx: 0x4d1f...e8c3",
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

function getNarrative(phase: Phase): string {
  const narratives: Partial<Record<Phase, string>> = {
    idle: "Press Post Job to begin the full ACP lifecycle demonstration — from task posting through onchain settlement.",
    boot: "Booting protocol connections. The ROVA stack coordinates across four layers: ACP for agent-robot negotiation, ROS2 for physical execution, Base for settlement, and ERC-4337 for gasless robot wallets.",
    job_posted: "MERCHANT-7 posts a CARRY task through ACP v2. The job specifies pickup at Rack B3, delivery to Dispatch Bay 2, and a 2.00 USDC bounty with a 5-minute SLA.",
    matching: "The ROVA registry broadcasts the matching request. Three robots in range submit bids. The scoring algorithm weighs reputation (40%), ETA (30%), and price (30%).",
    escrow_locked: "G1-ALPHA wins the bid at 1.75 USDC. The bounty is locked in the ROVAMarket escrow contract on Base Sepolia. Neither party can withdraw until proof verification.",
    navigating_pickup: "G1-ALPHA accepts and begins navigating to Rack B3. ROS2 NavFn planner calculates the optimal path through the warehouse grid.",
    picking_up: "Robot arrives at Rack B3. Gripper engages, payload secured. Sensor readings are hashed and stored for the proof submission.",
    navigating_delivery: "Payload in transit. G1-ALPHA navigates to Dispatch Bay 2. All sensor data is being logged for the verification proof.",
    delivering: "Arrived at Dispatch Bay 2. Gripper releases, payload placed. GPS coordinates and timestamp captured for proof.",
    proof_submitted: "G1-ALPHA submits a composite proof to ROVAVerifier.sol — GPS coordinates confirm delivery location, timestamp proves SLA compliance, sensor hash verifies payload integrity.",
    build_userop: "The robot's ERC-4337 smart wallet constructs a UserOperation to trigger escrow release. The robot never holds gas tokens — the paymaster sponsors the transaction.",
    submit_bundler: "UserOperation submitted to the bundler for inclusion in the next Base block. The bundler aggregates the operation and submits it onchain.",
    verifying: "ROVAVerifier.sol validates all proof components: GPS at destination, timestamp within SLA window, sensor hash matches. All checks pass.",
    settled: "Settlement complete. 1.7448 USDC released to G1-ALPHA's smart wallet. 0.0052 USDC protocol fee collected. The full cycle — from task posting to onchain payment — completes autonomously.",
  };
  return narratives[phase] ?? "";
}

// ─── Canvas Warehouse ───────────────────────────────────────────────
function WarehouseCanvas({
  phase,
  robotPos,
  cameraMode,
  ambientRobots,
  fault,
  onClickEntity,
}: {
  phase: Phase;
  robotPos: Point;
  cameraMode: CameraMode;
  ambientRobots: AmbientRobot[];
  fault: InjectedFault | null;
  onClickEntity: (e: InspectableEntity) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const currentRobotPos = useRef<Point>({ ...robotPos });
  const targetRobotPos = useRef<Point>({ ...robotPos });
  const timeRef = useRef(0);

  const hasPayload =
    PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("picking_up") &&
    PHASE_ORDER.indexOf(phase) <= PHASE_ORDER.indexOf("delivering");

  const isFaulted = fault?.triggered === true;
  const isGpsJammed = isFaulted && fault?.type === "gps_jam";
  const isRobotDown = isFaulted && fault?.type === "robot_down";

  // Update target when robotPos changes
  useEffect(() => {
    targetRobotPos.current = { ...robotPos };
  }, [robotPos]);

  // Click handler: hit-test against shelves, bays, and the primary robot
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;

    // Robot hit-test (radius ~0.03 in normalized space)
    const rdx = cx - currentRobotPos.current.x;
    const rdy = cy - currentRobotPos.current.y;
    if (rdx * rdx + rdy * rdy < 0.001) {
      onClickEntity({
        kind: "robot",
        id: "G1-ALPHA",
        label: "G1-ALPHA",
        data: {
          model: "Unitree G1",
          phase: phase,
          payload: hasPayload ? "1.4 kg bin" : "none",
          gps: `${(currentRobotPos.current.x * 100).toFixed(4)}°, ${(currentRobotPos.current.y * 100).toFixed(4)}°`,
          battery: "87 %",
          stake: "100 ROVA",
          reputation: "4920 / 5000",
          wallet: "0x71C7…4e2F",
          fault: isFaulted ? (fault?.type ?? "—") : "none",
        },
      });
      return;
    }

    // Shelf hit-test
    for (const s of SHELVES) {
      if (cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h) {
        onClickEntity({
          kind: "shelf",
          id: `RACK-${s.label}`,
          label: `Rack ${s.label}`,
          data: {
            zone: `Zone ${s.label[0]} · Row ${s.label[1]}`,
            gps_anchor: `${(s.x * 100).toFixed(4)}°, ${(s.y * 100).toFixed(4)}°`,
            occupancy: "3 bins",
            "last picked": "08:14:22",
          },
        });
        return;
      }
    }

    // Dispatch bay hit-test
    for (const b of DISPATCH_BAYS) {
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        onClickEntity({
          kind: "bay",
          id: `BAY-${b.label}`,
          label: b.label,
          data: {
            zone: `Dispatch · ${b.label}`,
            gps_anchor: `${(b.x * 100).toFixed(4)}°, ${(b.y * 100).toFixed(4)}°`,
            "inbound queue": "2 items",
            "last delivery": "08:16:51",
          },
        });
        return;
      }
    }
  }, [phase, hasPayload, fault, isFaulted, onClickEntity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Lerp robot position
      const lerp = 0.03;
      currentRobotPos.current.x += (targetRobotPos.current.x - currentRobotPos.current.x) * lerp;
      currentRobotPos.current.y += (targetRobotPos.current.y - currentRobotPos.current.y) * lerp;

      // Clear
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);

      // Apply camera transform (isometric tilt + scale around center)
      ctx.save();
      if (cameraMode === "isometric") {
        ctx.translate(W / 2, H / 2);
        ctx.transform(1, 0.32, -0.5, 0.8, 0, 0);
        ctx.translate(-W / 2, -H / 2 + 30);
      } else if (cameraMode === "robot-pov") {
        const zoom = 2.6;
        const cx = currentRobotPos.current.x * W;
        const cy = currentRobotPos.current.y * H;
        ctx.translate(W / 2, H / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-cx, -cy);
      }

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Zone labels
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillText("ZONE A", W * 0.25, H * 0.10);
      ctx.fillText("ZONE B", W * 0.25, H * 0.23);
      ctx.fillText("ZONE C", W * 0.25, H * 0.36);
      ctx.fillText("DISPATCH", W * 0.82, H * 0.54);

      // Shelves
      for (const shelf of SHELVES) {
        const sx = shelf.x * W;
        const sy = shelf.y * H;
        const sw = shelf.w * W;
        const sh = shelf.h * H;

        const isTarget = shelf.label === "B3" && (
          phase === "navigating_pickup" || phase === "picking_up"
        );

        ctx.fillStyle = isTarget ? "rgba(239,111,46,0.12)" : "rgba(255,255,255,0.04)";
        ctx.strokeStyle = isTarget ? "rgba(239,111,46,0.4)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, sx, sy, sw, sh, 4);
        ctx.fill();
        ctx.stroke();

        // Shelf label
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = isTarget ? "rgba(239,111,46,0.8)" : "rgba(255,255,255,0.2)";
        ctx.textAlign = "center";
        ctx.fillText(shelf.label, sx + sw / 2, sy + sh / 2 + 3);
        ctx.textAlign = "left";
      }

      // Dispatch bays
      for (const bay of DISPATCH_BAYS) {
        const bx = bay.x * W;
        const by = bay.y * H;
        const bw = bay.w * W;
        const bh = bay.h * H;

        const isTarget = bay.label === "Bay 2" && (
          phase === "navigating_delivery" || phase === "delivering"
        );

        ctx.fillStyle = isTarget ? "rgba(239,111,46,0.12)" : "rgba(255,255,255,0.04)";
        ctx.strokeStyle = isTarget ? "rgba(239,111,46,0.4)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, bw, bh, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 9px monospace";
        ctx.fillStyle = isTarget ? "rgba(239,111,46,0.8)" : "rgba(255,255,255,0.2)";
        ctx.textAlign = "center";
        ctx.fillText(bay.label, bx + bw / 2, by + bh / 2 + 3);
        ctx.textAlign = "left";
      }

      // Charging station (home)
      const homeX = 0.06 * W;
      const homeY = 0.68 * H;
      const homeW = 0.14 * W;
      const homeH = 0.14 * H;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.setLineDash([4, 4]);
      roundRect(ctx, homeX, homeY, homeW, homeH, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "center";
      ctx.fillText("CHARGING", homeX + homeW / 2, homeY + homeH / 2 - 4);
      ctx.fillText("STATION", homeX + homeW / 2, homeY + homeH / 2 + 8);
      ctx.textAlign = "left";

      // Path trail (dashed)
      if (phase !== "idle" && phase !== "boot") {
        ctx.strokeStyle = "rgba(239,111,46,0.1)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(WAREHOUSE_LOCATIONS.home.x * W, WAREHOUSE_LOCATIONS.home.y * H);
        ctx.lineTo(WAREHOUSE_LOCATIONS.rackB3.x * W, WAREHOUSE_LOCATIONS.rackB3.y * H);
        ctx.lineTo(WAREHOUSE_LOCATIONS.dispatchBay2.x * W, WAREHOUSE_LOCATIONS.dispatchBay2.y * H);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Robot
      const rx = currentRobotPos.current.x * W;
      const ry = currentRobotPos.current.y * H;

      // Pulse ring
      const pulseScale = 1 + 0.3 * Math.sin(t * 3);
      const pulseAlpha = 0.15 + 0.1 * Math.sin(t * 3);
      ctx.beginPath();
      ctx.arc(rx, ry, 18 * pulseScale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239,111,46,${pulseAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Robot body
      const gradient = ctx.createRadialGradient(rx, ry, 0, rx, ry, 12);
      gradient.addColorStop(0, "rgba(239,111,46,0.5)");
      gradient.addColorStop(1, "rgba(239,111,46,0.1)");
      ctx.beginPath();
      ctx.arc(rx, ry, 12, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = "rgba(239,111,46,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Robot core
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ef6f2e";
      ctx.fill();

      // Payload indicator
      if (hasPayload) {
        ctx.beginPath();
        ctx.arc(rx + 10, ry - 10, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.strokeStyle = "rgba(251,191,36,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Robot label
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = isRobotDown ? "rgba(239,68,68,0.7)" : "rgba(239,111,46,0.7)";
      ctx.textAlign = "center";
      ctx.fillText(isRobotDown ? "G1-ALPHA · DOWN" : "G1-ALPHA", rx, ry + 24);
      ctx.textAlign = "left";

      // Ambient robots (storm mode)
      for (const a of ambientRobots) {
        const ax = a.pos.x * W;
        const ay = a.pos.y * H;
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fillStyle = a.faulted ? "rgba(239,68,68,0.6)" : "rgba(12,129,180,0.55)";
        ctx.fill();
        ctx.strokeStyle = a.faulted ? "rgba(239,68,68,0.8)" : "rgba(12,129,180,0.9)";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (a.payload) {
          ctx.beginPath();
          ctx.arc(ax + 6, ay - 6, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#fbbf24";
          ctx.fill();
        }
        ctx.font = "8px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(a.name, ax, ay + 16);
        ctx.textAlign = "left";
      }

      // Restore camera transform — overlays below are screen-space
      ctx.restore();

      // GPS-jam overlay (screen-space red wash with scan lines)
      if (isGpsJammed) {
        ctx.fillStyle = "rgba(239,68,68,0.08)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(239,68,68,0.18)";
        ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 3) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(239,68,68,0.85)";
        ctx.fillText("⚠ GPS JAM · PROOF WILL FAIL", 12, 36);
      }
      // Robot-down banner
      if (isRobotDown) {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(239,68,68,0.85)";
        ctx.fillText("⚠ ROBOT HEARTBEAT LOST", 12, 36);
      }

      // Camera-mode badge (screen-space, top-right)
      if (cameraMode !== "top-down") {
        ctx.font = "9px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textAlign = "right";
        ctx.fillText(cameraMode === "isometric" ? "ISO" : "POV", W - 70, 20);
        ctx.textAlign = "left";
      }

      // Top-left warehouse label
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText("WAREHOUSE-01", 12, 20);

      // Live indicator
      const liveAlpha = 0.4 + 0.4 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(W - 50, 16, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,111,46,${liveAlpha})`;
      ctx.fill();
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("LIVE", W - 42, 20);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, hasPayload, robotPos, cameraMode, ambientRobots, isFaulted, isGpsJammed, isRobotDown]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="h-full w-full rounded-2xl cursor-pointer"
      style={{ background: "#080808" }}
      title="Click any entity to inspect"
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Connection Status Bar ──────────────────────────────────────────
function ConnectionBar({ phase }: { phase: Phase }) {
  const isActive = phase !== "idle";
  const connections = [
    { label: "ACP v2", active: isActive },
    { label: "ROS2", active: isActive && PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("navigating_pickup") },
    { label: "Base Sepolia", active: isActive && PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked") },
    { label: "Bundler", active: isActive && PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("build_userop") },
  ];

  return (
    <div className="flex items-center gap-4">
      {connections.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
              c.active ? "bg-accent animate-pulse" : "bg-surface-3"
            }`}
          />
          <span
            className={`font-mono text-[10px] transition-colors duration-500 ${
              c.active ? "text-text-secondary" : "text-text-tertiary"
            }`}
          >
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Protocol Event Log ─────────────────────────────────────────────
function ProtocolLog({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          Protocol Events
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          {logs.length} events
        </span>
      </div>
      <div ref={scrollRef} className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <div className="flex items-start gap-2 py-1 px-2 rounded-lg hover:bg-surface-2/50 transition-colors">
                <span className="font-mono text-[9px] text-text-tertiary mt-0.5 shrink-0 w-[52px]">
                  {log.timestamp}
                </span>
                <span
                  className={`font-mono text-[8px] font-bold mt-0.5 shrink-0 w-[52px] px-1.5 py-0.5 rounded text-center ${
                    SOURCE_COLORS[log.source].text
                  } ${SOURCE_COLORS[log.source].bg}`}
                >
                  {log.source}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[11px] text-text-secondary block">
                    {log.message}
                  </span>
                  {log.detail && (
                    <span className="font-mono text-[9px] text-text-tertiary block mt-0.5">
                      {log.detail}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {logs.length === 0 && (
        <div className="flex h-20 items-center justify-center">
          <span className="font-mono text-[11px] text-text-tertiary">
            Waiting for protocol activity...
          </span>
        </div>
      )}
    </div>
  );
}

// ─── ACP Job Object Card ────────────────────────────────────────────
function ACPJobCard({ phase }: { phase: Phase }) {
  if (PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf("job_posted")) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface-1 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded ${SOURCE_COLORS.ACP.text} ${SOURCE_COLORS.ACP.bg}`}>
            ACP
          </span>
          <span className="font-mono text-[11px] font-medium text-text-tertiary">
            Job Object
          </span>
        </div>
        <span className="font-mono text-[10px] text-accent">JOB-0x7F3A</span>
      </div>
      <div className="rounded-lg bg-surface-0 border border-border p-3 font-mono text-[10px] leading-[1.8]">
        <div className="text-text-tertiary">{"{"}</div>
        <div className="pl-3">
          <span className="text-accent">&quot;type&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;CARRY&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;schema&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;ROVA-CARRY-v1&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;client&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;MERCHANT-7&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;provider&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className={PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked") ? "text-teal" : "text-text-tertiary"}>
            {PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked")
              ? '"G1-ALPHA"'
              : "null"}
          </span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;from&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;Rack B3&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;to&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;Dispatch Bay 2&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;bounty&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;2.00 USDC&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;bid&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className={PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked") ? "text-amber" : "text-text-tertiary"}>
            {PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked")
              ? '"1.75 USDC"'
              : "null"}
          </span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;sla&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;300s&quot;</span>
          <span className="text-text-tertiary">,</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">&quot;status&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className={phase === "settled" ? "text-accent" : "text-amber"}>
            &quot;{phase === "settled" ? "SETTLED" : phase === "verifying" || phase === "submit_bundler" || phase === "build_userop" ? "VERIFYING" : phase === "proof_submitted" ? "PROOF_SENT" : PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("navigating_pickup") ? "EXECUTING" : PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("escrow_locked") ? "LOCKED" : PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("matching") ? "MATCHING" : "OPEN"}&quot;
          </span>
        </div>
        <div className="text-text-tertiary">{"}"}</div>
      </div>
    </motion.div>
  );
}

// ─── ERC-4337 UserOperation Card ────────────────────────────────────
function UserOpCard({ phase }: { phase: Phase }) {
  if (PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf("build_userop")) return null;

  const isSubmitted = PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("submit_bundler");
  const isConfirmed = phase === "settled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface-1 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded ${SOURCE_COLORS.WALLET.text} ${SOURCE_COLORS.WALLET.bg}`}>
            4337
          </span>
          <span className="font-mono text-[11px] font-medium text-text-tertiary">
            UserOperation
          </span>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
          isConfirmed ? "bg-accent/10 text-accent" : isSubmitted ? "bg-amber/10 text-amber" : "bg-slate/10 text-slate"
        }`}>
          {isConfirmed ? "CONFIRMED" : isSubmitted ? "PENDING" : "BUILDING"}
        </span>
      </div>
      <div className="rounded-lg bg-surface-0 border border-border p-3 font-mono text-[10px] leading-[1.8]">
        <div className="text-text-tertiary">{"{"}</div>
        <div className="pl-3">
          <span className="text-slate">&quot;sender&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;0x71C7...4e2F&quot;</span>
        </div>
        <div className="pl-3">
          <span className="text-slate">&quot;nonce&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">47</span>
        </div>
        <div className="pl-3">
          <span className="text-slate">&quot;callData&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-accent">&quot;releaseEscrow(0x7F3A)&quot;</span>
        </div>
        <div className="pl-3">
          <span className="text-slate">&quot;maxFeePerGas&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;0.1 gwei&quot;</span>
        </div>
        <div className="pl-3">
          <span className="text-slate">&quot;paymaster&quot;</span>
          <span className="text-text-tertiary">: </span>
          <span className="text-text-secondary">&quot;0xPM...ROVA&quot;</span>
        </div>
        {isSubmitted && (
          <div className="pl-3">
            <span className="text-slate">&quot;txHash&quot;</span>
            <span className="text-text-tertiary">: </span>
            <span className={isConfirmed ? "text-accent" : "text-amber"}>
              &quot;0x4d1f...e8c3&quot;
            </span>
          </div>
        )}
        <div className="text-text-tertiary">{"}"}</div>
      </div>
    </motion.div>
  );
}

// ─── Settlement Confirmation Card ───────────────────────────────────
function SettlementCard({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 15 }}
      className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent pulse-glow" />
        <span className="font-mono text-[11px] font-semibold text-accent uppercase tracking-wider">
          Settlement Confirmed
        </span>
      </div>
      <div className="space-y-2.5">
        <SettlementRow label="Robot Payment" value="1.7448 USDC" valueColor="text-accent" />
        <SettlementRow label="Protocol Fee" value="0.0052 USDC" />
        <SettlementRow label="Total Escrowed" value="1.75 USDC" />
        <div className="h-px bg-accent/10 my-1" />
        <SettlementRow label="Provider" value="G1-ALPHA" valueColor="text-teal" />
        <SettlementRow label="Client" value="MERCHANT-7" valueColor="text-accent" />
        <SettlementRow label="Settlement TX" value="0x4d1f...e8c3" />
        <SettlementRow label="Block" value="14892034" />
        <SettlementRow label="Chain" value="Base Sepolia" />
        <div className="h-px bg-accent/10 my-1" />
        <SettlementRow label="SLA" value="MET (2m 14s / 5m max)" valueColor="text-forest" />
        <SettlementRow label="Proof Hash" value="0x9e2b...f4a7" />
        <SettlementRow label="Paymaster" value="Sponsored (0 gas)" valueColor="text-slate" />
      </div>
    </motion.div>
  );
}

function SettlementRow({
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

// ─── Lifecycle Stepper ──────────────────────────────────────────────
function LifecycleStepper({ phase }: { phase: Phase }) {
  const stages: { id: Phase; label: string; source: EventSource }[] = [
    { id: "boot", label: "System Boot", source: "SYS" },
    { id: "job_posted", label: "ACP Job Posted", source: "ACP" },
    { id: "matching", label: "ROVA Matches", source: "ACP" },
    { id: "escrow_locked", label: "Escrow Locked", source: "CHAIN" },
    { id: "navigating_pickup", label: "Navigate Pickup", source: "ROS2" },
    { id: "picking_up", label: "Verify Package", source: "ROS2" },
    { id: "navigating_delivery", label: "Navigate Dispatch", source: "ROS2" },
    { id: "delivering", label: "Delivery Confirmed", source: "ROS2" },
    { id: "proof_submitted", label: "Submit Proof", source: "ACP" },
    { id: "build_userop", label: "Build UserOp", source: "WALLET" },
    { id: "submit_bundler", label: "Submit Bundler", source: "BUNDLER" },
    { id: "verifying", label: "Verify Onchain", source: "CHAIN" },
    { id: "settled", label: "Settled", source: "CHAIN" },
  ];

  const currentIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          Lifecycle
        </span>
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
            phase === "settled"
              ? "bg-accent/10 text-accent"
              : phase === "idle"
              ? "bg-surface-2 text-text-tertiary"
              : "bg-amber/10 text-amber"
          }`}
        >
          {phase === "idle" ? "STANDBY" : phase === "settled" ? "COMPLETE" : `${currentIndex}/${stages.length}`}
        </span>
      </div>
      <div className="space-y-0.5">
        {stages.map((s, i) => {
          const stageIndex = PHASE_ORDER.indexOf(s.id);
          const isPast = currentIndex > stageIndex;
          const isCurrent = currentIndex === stageIndex;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all duration-300 ${
                isCurrent
                  ? "bg-accent/[0.06] border border-accent/20"
                  : isPast
                  ? "opacity-60"
                  : "opacity-25"
              }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-mono font-bold shrink-0 ${
                  isCurrent
                    ? "bg-accent text-background"
                    : isPast
                    ? "bg-accent/20 text-accent"
                    : "bg-surface-3 text-text-tertiary"
                }`}
              >
                {isPast ? "✓" : i + 1}
              </div>
              <span
                className={`font-mono text-[11px] flex-1 ${
                  isCurrent
                    ? "text-accent font-semibold"
                    : isPast
                    ? "text-text-secondary"
                    : "text-text-tertiary"
                }`}
              >
                {s.label}
              </span>
              <span
                className={`font-mono text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${
                  isCurrent
                    ? SOURCE_COLORS[s.source].text + " " + SOURCE_COLORS[s.source].bg
                    : "text-text-tertiary"
                }`}
              >
                {s.source}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Narrative Bar ──────────────────────────────────────────────────
function NarrativeBar({ phase }: { phase: Phase }) {
  const text = getNarrative(phase);

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
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
          className="font-mono text-[12px] leading-[1.7] text-text-secondary"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── Speed Controls ─────────────────────────────────────────────────
function SpeedControls({
  speed,
  setSpeed,
  paused,
  setPaused,
  running,
  onStep,
}: {
  speed: number;
  setSpeed: (s: number) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  running: boolean;
  onStep: () => void;
}) {
  if (!running) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPaused(!paused)}
        className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-text-secondary border border-border hover:bg-surface-3 transition-colors"
        title={paused ? "Resume (Space)" : "Pause (Space)"}
      >
        {paused ? "▶ Resume" : "⏸ Pause"}
      </button>
      <button
        onClick={onStep}
        disabled={!paused}
        className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-text-secondary border border-border hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Step forward one phase (only while paused)"
      >
        ⇥ Step
      </button>
      {[0.5, 1, 2, 4].map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] border transition-colors ${
            speed === s
              ? "bg-accent/10 text-accent border-accent/30"
              : "bg-surface-2 text-text-tertiary border-border hover:text-text-secondary"
          }`}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

// ─── Inject-Faults Toolbox ──────────────────────────────────────────
function InjectFaultsToolbox({
  injected,
  setInjected,
  running,
}: {
  injected: InjectedFault | null;
  setInjected: (f: InjectedFault | null) => void;
  running: boolean;
}) {
  const faults: { type: FaultType; label: string; at: Phase; tone: string; desc: string }[] = [
    { type: "gps_jam", label: "GPS Jam", at: "navigating_delivery", tone: "text-amber", desc: "Reject proof at verifier with GPS_MISMATCH" },
    { type: "robot_down", label: "Robot Down", at: "navigating_pickup", tone: "text-alert", desc: "Robot loses heartbeat mid-job" },
    { type: "escrow_stuck", label: "Escrow Stuck", at: "build_userop", tone: "text-slate", desc: "Bundler refuses UserOp; settle hangs" },
    { type: "sla_breach", label: "SLA Breach", at: "navigating_delivery", tone: "text-alert", desc: "Force block.timestamp past deadline" },
    { type: "sensor_failure", label: "Sensor Fail", at: "picking_up", tone: "text-amber", desc: "Sensor returns invalid frame; submit fails" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-alert" />
          <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
            Inject Fault
          </span>
        </div>
        {injected && (
          <button
            onClick={() => setInjected(null)}
            className="font-mono text-[9px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>
      <div className="space-y-1">
        {faults.map((f) => {
          const isQueued = injected?.type === f.type;
          const isFired = injected?.type === f.type && injected.triggered;
          return (
            <button
              key={f.type}
              onClick={() => {
                if (!running) {
                  setInjected({ type: f.type, injectedAt: f.at, triggered: false });
                } else if (isQueued) {
                  setInjected(null);
                } else {
                  setInjected({ type: f.type, injectedAt: f.at, triggered: false });
                }
              }}
              disabled={isFired}
              className={`w-full flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 border text-left transition-all ${
                isFired
                  ? "border-alert/40 bg-alert/[0.08] opacity-60 cursor-not-allowed"
                  : isQueued
                  ? "border-amber/40 bg-amber/[0.06]"
                  : "border-border bg-surface-2/40 hover:bg-surface-2"
              }`}
              title={f.desc}
            >
              <div
                className={`flex h-3 w-3 items-center justify-center rounded-full mt-0.5 shrink-0 ${
                  isFired ? "bg-alert" : isQueued ? "bg-amber" : "bg-surface-3"
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className={`font-mono text-[11px] block ${isFired ? "text-alert" : isQueued ? "text-amber" : f.tone}`}>
                  {f.label} {isFired ? "· FIRED" : isQueued ? "· QUEUED" : ""}
                </span>
                <span className="font-mono text-[9px] text-text-tertiary block mt-0.5 leading-snug">
                  {f.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!running && (
        <div className="mt-3 rounded-lg border border-border/60 bg-surface-2/40 px-2.5 py-1.5">
          <span className="font-mono text-[9px] text-text-tertiary leading-snug">
            {injected
              ? `Queued: triggers at ${PHASE_LABEL[injected.injectedAt] ?? injected.injectedAt}`
              : "Select a fault to queue. Start the sim to see it fire."}
          </span>
        </div>
      )}
    </div>
  );
}

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  navigating_pickup: "Navigate Pickup",
  picking_up: "Verify Package",
  navigating_delivery: "Navigate Dispatch",
  delivering: "Delivery Confirmed",
  proof_submitted: "Submit Proof",
  build_userop: "Build UserOp",
  submit_bundler: "Submit Bundler",
  verifying: "Verify Onchain",
};

// ─── Camera Mode Toggle ─────────────────────────────────────────────
function CameraModeToggle({
  mode,
  setMode,
}: {
  mode: CameraMode;
  setMode: (m: CameraMode) => void;
}) {
  const modes: { id: CameraMode; label: string; icon: string }[] = [
    { id: "top-down", label: "Top", icon: "▢" },
    { id: "isometric", label: "Iso", icon: "◇" },
    { id: "robot-pov", label: "POV", icon: "◉" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2/60 p-0.5">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] transition-all ${
            mode === m.id
              ? "bg-accent/10 text-accent"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
          title={`Camera: ${m.label}`}
        >
          <span className="text-[11px] leading-none">{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Inspector Panel ────────────────────────────────────────────────
function InspectorPanel({
  entity,
  onClose,
}: {
  entity: InspectableEntity | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="fixed right-4 top-16 z-40 w-[320px] rounded-2xl border border-border bg-surface-1 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded ${
                  entity.kind === "robot"
                    ? "bg-accent/10 text-accent"
                    : entity.kind === "agent"
                    ? "bg-teal/10 text-teal"
                    : entity.kind === "contract"
                    ? "bg-forest/10 text-forest"
                    : "bg-surface-3 text-text-tertiary"
                }`}
              >
                {entity.kind.toUpperCase()}
              </span>
              <span className="font-mono text-[12px] font-medium text-text-primary">
                {entity.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[14px] text-text-tertiary hover:text-text-secondary leading-none"
              aria-label="Close inspector"
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(entity.data).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3">
                <span className="font-mono text-[10px] text-text-tertiary shrink-0">{k}</span>
                <span className="font-mono text-[11px] text-text-secondary text-right break-all">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Multi-Agent Storm Controls ─────────────────────────────────────
function StormControls({
  active,
  count,
  setActive,
  setCount,
}: {
  active: boolean;
  count: number;
  setActive: (a: boolean) => void;
  setCount: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-teal animate-pulse" : "bg-surface-3"}`} />
          <span className="font-mono text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
            Multi-Agent Storm
          </span>
        </div>
        <button
          onClick={() => setActive(!active)}
          className={`font-mono text-[9px] px-2 py-0.5 rounded-full border transition-all ${
            active
              ? "border-teal/40 bg-teal/10 text-teal"
              : "border-border bg-surface-2 text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {active ? "ON" : "OFF"}
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-text-tertiary">Ambient agents</span>
          <span className="font-mono text-[11px] text-text-secondary">{count}</span>
        </div>
        <input
          type="range"
          min={2}
          max={8}
          step={1}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-full accent-teal h-1"
          disabled={!active}
        />
        <span className="font-mono text-[9px] text-text-tertiary block leading-snug">
          {active
            ? `${count} agents posting concurrent CARRY/SORT jobs against ambient robots`
            : "Enable to add background fleet traffic"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Simulator Page ────────────────────────────────────────────
const AMBIENT_NAMES = ["G1-BETA", "G1-GAMMA", "G1-DELTA", "G1-EPSILON", "G1-ZETA", "G1-ETA", "G1-THETA", "G1-IOTA"];
const AMBIENT_WAYPOINTS: Point[] = [
  { x: 0.32, y: 0.55 },
  { x: 0.46, y: 0.18 },
  { x: 0.60, y: 0.30 },
  { x: 0.40, y: 0.42 },
  { x: 0.85, y: 0.66 },
  { x: 0.85, y: 0.84 },
  { x: 0.25, y: 0.41 },
  { x: 0.55, y: 0.41 },
];

export default function SimulatorPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [robotPos, setRobotPos] = useState<Point>(WAREHOUSE_LOCATIONS.home);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("top-down");
  const [injectedFault, setInjectedFault] = useState<InjectedFault | null>(null);
  const [stormActive, setStormActive] = useState(false);
  const [stormCount, setStormCount] = useState(4);
  const [ambientRobots, setAmbientRobots] = useState<AmbientRobot[]>([]);
  const [inspected, setInspected] = useState<InspectableEntity | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const stormTickRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Keyboard shortcuts: Space to pause/resume, Esc to close inspector
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && running) {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.code === "Escape") {
        setInspected(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running]);

  // Ambient robot storm loop
  useEffect(() => {
    if (!stormActive) {
      setAmbientRobots([]);
      if (stormTickRef.current) clearInterval(stormTickRef.current);
      return;
    }
    // Initialize ambient robots
    setAmbientRobots(
      Array.from({ length: stormCount }, (_, i) => ({
        id: `amb-${i}`,
        name: AMBIENT_NAMES[i % AMBIENT_NAMES.length],
        pos: { ...AMBIENT_WAYPOINTS[i % AMBIENT_WAYPOINTS.length] },
        target: { ...AMBIENT_WAYPOINTS[(i + 2) % AMBIENT_WAYPOINTS.length] },
        phase: "navigating_pickup",
        jobLabel: `JOB-${(0xa000 + i * 7).toString(16).toUpperCase()}`,
        payload: false,
        faulted: false,
      }))
    );
    // Tick: nudge each robot toward its target; reassign target when arrived
    stormTickRef.current = setInterval(() => {
      setAmbientRobots((prev) =>
        prev.map((r) => {
          const dx = r.target.x - r.pos.x;
          const dy = r.target.y - r.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.02) {
            // Reached target; pick a new one + toggle payload
            const next = AMBIENT_WAYPOINTS[Math.floor(Math.random() * AMBIENT_WAYPOINTS.length)];
            return { ...r, target: next, payload: !r.payload, faulted: Math.random() < 0.05 };
          }
          const step = 0.008;
          return {
            ...r,
            pos: { x: r.pos.x + (dx / dist) * step, y: r.pos.y + (dy / dist) * step },
          };
        })
      );
    }, 80);
    return () => {
      if (stormTickRef.current) clearInterval(stormTickRef.current);
    };
  }, [stormActive, stormCount]);

  // Reset injected fault to un-triggered when sim restarts
  const runSimulation = useCallback(() => {
    setPhase("idle");
    setLogs([]);
    setRobotPos(WAREHOUSE_LOCATIONS.home);
    setRunning(true);
    setPaused(false);
    phaseIndexRef.current = 0;
    if (injectedFault) {
      setInjectedFault({ ...injectedFault, triggered: false });
    }

    const advance = () => {
      if (phaseIndexRef.current >= PHASE_ORDER.length) return;
      if (pausedRef.current) {
        timeoutRef.current = setTimeout(advance, 100);
        return;
      }

      const p = PHASE_ORDER[phaseIndexRef.current];
      setPhase(p);
      setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);

      const log = getPhaseLog(p, formatTime());
      if (log) {
        setLogs((prev) => [...prev, log]);
      }

      // Fault firing: when we hit injectedAt phase, mark triggered and emit a log
      if (injectedFault && !injectedFault.triggered && injectedFault.injectedAt === p) {
        setInjectedFault({ ...injectedFault, triggered: true });
        const faultLogs: Record<FaultType, LogEntry> = {
          gps_jam: { source: "ROS2", message: "⚠ GPS multipath detected · destination check will fail", timestamp: formatTime(), detail: "expected: (52.4137,-1.5108) · observed: drift ≥ 18m" },
          robot_down: { source: "SYS", message: "⚠ Heartbeat from G1-ALPHA lost · last seen 4s ago", timestamp: formatTime(), detail: "no recovery within 30s = force-fail trigger" },
          escrow_stuck: { source: "BUNDLER", message: "⚠ Bundler rejected UserOp · insufficient paymaster balance", timestamp: formatTime(), detail: "code: -32500 · settlement queued indefinitely" },
          sla_breach: { source: "CHAIN", message: "⚠ block.timestamp > job.deadline · forceFailJob path open", timestamp: formatTime(), detail: "deadline: 5m00s · elapsed: 5m12s · slash: 10% bid" },
          sensor_failure: { source: "ROS2", message: "⚠ Sensor frame invalid · keccak256 input zero-bytes", timestamp: formatTime(), detail: "weight_sensor: NaN · camera: shutter stuck · submit aborted" },
        };
        setLogs((prev) => [...prev, faultLogs[injectedFault.type]]);

        // For terminating faults, stop the sim from advancing past this phase
        if (
          injectedFault.type === "robot_down" ||
          injectedFault.type === "sla_breach" ||
          injectedFault.type === "escrow_stuck" ||
          injectedFault.type === "sensor_failure"
        ) {
          phaseIndexRef.current++;
          // Hard stop: don't queue next advance
          return;
        }
        // gps_jam continues to verifying, but flips outcome
      }

      // For gps_jam, replace the verifying log with a rejected one
      if (injectedFault?.type === "gps_jam" && injectedFault.triggered && p === "verifying") {
        setLogs((prev) => [
          ...prev.slice(0, -1), // drop the "all checks passing" log
          {
            source: "CHAIN",
            message: "✗ ProofRejected(jobId, \"GPS_MISMATCH\")",
            timestamp: formatTime(),
            detail: "GPS Δ exceeds tolerance · escrow refund → client · stake slashed −10%",
          },
        ]);
        // Skip settled; mark phase as verifying and stop
        phaseIndexRef.current = PHASE_ORDER.length;
        return;
      }

      phaseIndexRef.current++;
      const duration = PHASE_CONFIG[p].duration;
      timeoutRef.current = setTimeout(advance, duration / speed);
    };

    timeoutRef.current = setTimeout(advance, 500);
  }, [speed, injectedFault]);

  // Step forward one phase while paused
  const stepOnce = useCallback(() => {
    if (!paused || phaseIndexRef.current >= PHASE_ORDER.length) return;
    const p = PHASE_ORDER[phaseIndexRef.current];
    setPhase(p);
    setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);
    const log = getPhaseLog(p, formatTime());
    if (log) setLogs((prev) => [...prev, log]);
    phaseIndexRef.current++;
  }, [paused]);

  // Restart sim when speed changes mid-run
  useEffect(() => {
    if (!running || paused) return;
    // Only affect future timeouts — the current advance loop reads speed from closure
    // We handle this by clearing and restarting from current phase
    if (timeoutRef.current && phaseIndexRef.current > 0) {
      clearTimeout(timeoutRef.current);
      const advance = () => {
        if (phaseIndexRef.current >= PHASE_ORDER.length) return;
        if (pausedRef.current) {
          timeoutRef.current = setTimeout(advance, 100);
          return;
        }

        const p = PHASE_ORDER[phaseIndexRef.current];
        setPhase(p);
        setRobotPos(WAREHOUSE_LOCATIONS[PHASE_CONFIG[p].robotTarget]);

        const log = getPhaseLog(p, formatTime());
        if (log) {
          setLogs((prev) => [...prev, log]);
        }

        phaseIndexRef.current++;
        timeoutRef.current = setTimeout(advance, PHASE_CONFIG[p].duration / speed);
      };
      timeoutRef.current = setTimeout(advance, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const stopSimulation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRunning(false);
    setPhase("idle");
    setLogs([]);
    setRobotPos(WAREHOUSE_LOCATIONS.home);
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-surface-0 sticky top-0 z-30">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 lg:px-6">
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

          <div className="flex items-center gap-4">
            <ConnectionBar phase={phase} />
            <div className="w-px h-5 bg-border" />
            <CameraModeToggle mode={cameraMode} setMode={setCameraMode} />
            <div className="w-px h-5 bg-border" />
            <SpeedControls
              speed={speed}
              setSpeed={setSpeed}
              paused={paused}
              setPaused={setPaused}
              running={running}
              onStep={stepOnce}
            />
            {!running ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-1.5 font-mono text-[13px] font-semibold text-background hover:brightness-110 transition-all"
              >
                Post Job
              </button>
            ) : phase === "settled" ? (
              <button
                onClick={stopSimulation}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-1.5 font-mono text-[13px] font-medium text-text-secondary border border-border hover:bg-surface-3 transition-colors"
              >
                Reset
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-1.5 font-mono text-[13px] font-medium text-text-secondary border border-border hover:bg-surface-3 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero intro (shown when idle) */}
      {!running && phase === "idle" && (
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 pt-8 pb-4">
          <div className="section-container p-8 lg:p-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                  ACP Protocol Simulator
                </span>
              </div>
              <h1 className="font-mono text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-text-primary mb-4">
                Watch the full ROVA protocol lifecycle — from task posting to onchain settlement.
              </h1>
              <p className="font-mono text-[14px] leading-[1.7] text-text-tertiary mb-6">
                An agent posts a CARRY task through ACP v2. A robot accepts, navigates the
                warehouse, picks up and delivers the payload, then submits proof. An ERC-4337
                UserOperation triggers automatic escrow release — the robot gets paid without
                ever touching gas tokens.
              </p>
              <div className="flex items-center gap-4 mb-6">
                {["ACP v2", "ROS2", "Base Sepolia", "ERC-4337"].map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-surface-2 border border-border text-text-tertiary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={runSimulation}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 font-mono text-[14px] font-semibold text-background hover:brightness-110 transition-all"
              >
                Post Job →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid layout */}
      <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* Left column: Canvas + Narrative + Protocol Log */}
          <div className="flex flex-col gap-4">
            {/* Canvas */}
            <div className="h-[420px] rounded-2xl border border-border overflow-hidden">
              <WarehouseCanvas
                phase={phase}
                robotPos={robotPos}
                cameraMode={cameraMode}
                ambientRobots={ambientRobots}
                fault={injectedFault}
                onClickEntity={setInspected}
              />
            </div>

            {/* Narrative */}
            <NarrativeBar phase={phase} />

            {/* Protocol event log */}
            <ProtocolLog logs={logs} />
          </div>

          {/* Right column: Lifecycle + Data Cards + Toolboxes */}
          <div className="flex flex-col gap-4">
            <LifecycleStepper phase={phase} />
            <InjectFaultsToolbox
              injected={injectedFault}
              setInjected={setInjectedFault}
              running={running}
            />
            <StormControls
              active={stormActive}
              count={stormCount}
              setActive={setStormActive}
              setCount={setStormCount}
            />
            <ACPJobCard phase={phase} />
            <UserOpCard phase={phase} />
            <SettlementCard visible={phase === "settled"} />
          </div>
        </div>

        {/* Inspector slide-in panel */}
        <InspectorPanel entity={inspected} onClose={() => setInspected(null)} />

        {/* Bottom pitch section */}
        <div className="mt-8 mb-8 section-container p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                  Why the Robotics Lab
                </span>
              </div>
              <h2 className="font-mono text-[clamp(1.2rem,2.5vw,1.75rem)] font-semibold leading-[1.2] tracking-tight text-text-primary mb-4">
                This simulator shows the full protocol flow. The missing step is validating
                the physical execution loop with real robots.
              </h2>
              <p className="font-mono text-[13px] leading-[1.65] text-text-tertiary">
                Access to the robotics lab and the Unitree G1 robots would allow ROVA to
                complete that final step — validating agent-to-robot coordination in the
                real world. That&apos;s what we&apos;re building during the program.
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
                    "ERC-4337 gasless robot payments",
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
