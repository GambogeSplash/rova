/* ROVA · schematic icon set
   1px stroke line work · 24x24 viewBox · espresso-aesthetic.
   Recreate-not-copy of the espressosys.com icon family. */

import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

/* ─── Brand mark ─── */
export function RovaMark({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="2" y="2" width="20" height="20" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── Robot — humanoid silhouette ─── */
export function RobotIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="8" y="3" width="8" height="6" rx="1" />
      <circle cx="10" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <path d="M9 9 L9 14 L8 17 L10 21" />
      <path d="M15 9 L15 14 L16 17 L14 21" />
      <path d="M9 11 L15 11" />
    </svg>
  );
}

/* ─── Agent — diamond/abstract ─── */
export function AgentIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M12 2 L21 12 L12 22 L3 12 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ─── Operator — concentric grid ─── */
export function OperatorIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="3" y="3" width="18" height="18" />
      <path d="M3 9 L21 9 M3 15 L21 15 M9 3 L9 21 M15 3 L15 21" />
    </svg>
  );
}

/* ─── Wallet ─── */
export function WalletIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="3" y="6" width="18" height="13" rx="1" />
      <path d="M3 10 L21 10" />
      <circle cx="17" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── Escrow lock ─── */
export function LockIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="5" y="11" width="14" height="10" rx="1" />
      <path d="M8 11 L8 7 a4 4 0 0 1 8 0 L16 11" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── GPS pin ─── */
export function PinIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M12 22 C12 22 5 14 5 9 a7 7 0 0 1 14 0 c0 5 -7 13 -7 13 Z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}

/* ─── Battery ─── */
export function BatteryIcon({
  size = 20,
  level = 80,
  ...rest
}: IconProps & { level?: number }) {
  const fillWidth = Math.max(0, Math.min(level, 100)) / 100 * 12;
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="3" y="8" width="17" height="8" rx="1" />
      <rect x="20" y="10" width="1.5" height="4" rx="0.3" />
      <rect
        x="4.5"
        y="9.5"
        width={fillWidth}
        height="5"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/* ─── Signal / live ─── */
export function PulseIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M2 12 L7 12 L9 6 L13 18 L15 12 L22 12" />
    </svg>
  );
}

/* ─── Receipt ─── */
export function ReceiptIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M5 3 L19 3 L19 22 L16 20 L13 22 L10 20 L7 22 L5 20 L5 3 Z" />
      <path d="M9 8 L15 8 M9 12 L15 12 M9 16 L13 16" />
    </svg>
  );
}

/* ─── Chain / link / Base ─── */
export function ChainIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M9.5 14.5 L14.5 9.5" />
      <path d="M9 7 a4 4 0 0 0 0 8 L11 15" />
      <path d="M15 9 L13 9 a4 4 0 0 0 0 -8 L13 17 a4 4 0 0 0 0 8 L15 25" />
      <path d="M15 17 a4 4 0 0 0 0 -8 L13 9" />
    </svg>
  );
}

/* ─── Manipulator arm ─── */
export function ArmIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <circle cx="4" cy="20" r="1.5" />
      <path d="M5 19 L10 13" />
      <circle cx="10" cy="13" r="1.4" />
      <path d="M11 12 L17 6" />
      <path d="M16 6 L20 4 M16 6 L20 8" />
    </svg>
  );
}

/* ─── Spec sheet ─── */
export function SpecIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M7 8 L17 8 M7 12 L17 12 M7 16 L13 16" />
    </svg>
  );
}

/* ─── Play / run ─── */
export function PlayIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M7 4 L20 12 L7 20 Z" />
    </svg>
  );
}

/* ─── Pause ─── */
export function PauseIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

/* ─── Arrow right ─── */
export function ArrowRightIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M5 12 L19 12 M13 6 L19 12 L13 18" />
    </svg>
  );
}

/* ─── Check ─── */
export function CheckIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M4 12 L10 18 L20 6" />
    </svg>
  );
}

/* ─── X / fail ─── */
export function XIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  );
}

/* ─── Command (kbd) ─── */
export function CommandIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })}>
      <path d="M6 6 a2 2 0 1 1 2 2 L8 16 a2 2 0 1 1 -2 -2 Z M16 8 a2 2 0 1 1 2 -2 L18 16 a2 2 0 1 1 -2 2 Z" />
    </svg>
  );
}

/* ─── Schematic: warehouse top-down (decorative) ─── */
export function WarehouseSchematic({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 480 240"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={className}
      {...rest}
    >
      <rect x="6" y="6" width="468" height="228" />
      {/* Aisles */}
      <path d="M6 80 L474 80 M6 160 L474 160" />
      {/* Shelves row A */}
      {[60, 130, 200, 270, 340, 410].map((x) => (
        <rect key={`a-${x}`} x={x} y="20" width="40" height="48" />
      ))}
      {/* Shelves row B */}
      {[60, 130, 200, 270, 340, 410].map((x) => (
        <rect key={`b-${x}`} x={x} y="92" width="40" height="48" />
      ))}
      {/* Dispatch bays */}
      {[180, 192, 204].map((y) => (
        <rect key={`bay-${y}`} x="380" y={y - 6} width="80" height="10" />
      ))}
      {/* Robots — small filled squares */}
      <rect x="115" y="50" width="6" height="6" fill="currentColor" />
      <rect x="265" y="120" width="6" height="6" fill="currentColor" />
      <rect x="395" y="185" width="6" height="6" fill="currentColor" />
      {/* Motion paths */}
      <path d="M120 56 Q200 72 268 124" strokeDasharray="2 3" />
      <path d="M268 124 L398 188" strokeDasharray="2 3" />
      {/* Job markers (annotated) */}
      <circle cx="160" cy="44" r="3" fill="currentColor" />
      <circle cx="380" cy="200" r="3" fill="currentColor" />
    </svg>
  );
}

/* ─── Schematic: protocol flow (4 nodes + arrows) ─── */
export function ProtocolFlowSchematic({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 600 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={className}
      {...rest}
    >
      {/* 4 boxes */}
      {[
        { x: 20, label: "AGENT" },
        { x: 170, label: "REGISTRY" },
        { x: 320, label: "VERIFIER" },
        { x: 470, label: "WALLET" },
      ].map((b, i) => (
        <g key={b.label}>
          <rect x={b.x} y="30" width="100" height="60" />
          <text
            x={b.x + 50}
            y="64"
            textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="10"
            letterSpacing="0.14em"
            fill="currentColor"
          >
            {b.label}
          </text>
        </g>
      ))}
      {/* Arrows */}
      <path d="M120 60 L170 60 M160 56 L170 60 L160 64" />
      <path d="M270 60 L320 60 M310 56 L320 60 L310 64" />
      <path d="M420 60 L470 60 M460 56 L470 60 L460 64" />
    </svg>
  );
}
