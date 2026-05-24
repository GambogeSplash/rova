/* ROVA · primitive UI components (espresso system)
   Single source of truth for: Eyebrow, StatusPill, MonoNum, Kbd,
   DataRow, SectionLabel, RowSpec — reused across surfaces. */

import { ReactNode } from "react";

/* ─── Eyebrow — small uppercase mono label with hairline ─── */
export function Eyebrow({
  children,
  tone = "amber",
  className = "",
}: {
  children: ReactNode;
  tone?: "amber" | "slate" | "bean";
  className?: string;
}) {
  const cls =
    tone === "amber"
      ? "text-amber"
      : tone === "slate"
      ? "text-slate"
      : "text-bean";
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] ${cls} ${className}`}
    >
      <span className={`h-px w-6 ${tone === "amber" ? "bg-amber" : tone === "slate" ? "bg-slate" : "bg-bean"}`} />
      {children}
    </span>
  );
}

/* ─── StatusPill — tiny, outlined, mono. Use for job/robot state ─── */
export function StatusPill({
  tone = "idle",
  children,
}: {
  tone?: "ok" | "live" | "warn" | "fail" | "idle";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    ok: "border-forest text-forest",
    live: "border-teal text-teal",
    warn: "border-amber text-amber",
    fail: "border-alert text-alert",
    idle: "border-slate text-slate",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${tones[tone]} px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em]`}
    >
      <Dot tone={tone} />
      {children}
    </span>
  );
}

export function Dot({
  tone = "ok",
  size = 6,
}: {
  tone?: "ok" | "live" | "warn" | "fail" | "idle";
  size?: number;
}) {
  const tones: Record<string, string> = {
    ok: "bg-forest",
    live: "bg-teal pulse-glow",
    warn: "bg-amber",
    fail: "bg-alert",
    idle: "bg-slate/40",
  };
  return (
    <span
      className={`inline-block ${tones[tone]}`}
      style={{ width: size, height: size }}
    />
  );
}

/* ─── MonoNum — tabular number, optional unit ─── */
export function MonoNum({
  value,
  unit,
  size = "md",
  className = "",
}: {
  value: string | number;
  unit?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  const sizes: Record<string, string> = {
    sm: "text-[12px]",
    md: "text-[14px]",
    lg: "text-[18px]",
    xl: "text-[28px]",
    "2xl": "text-[44px]",
  };
  return (
    <span className={`font-mono tabular ${sizes[size]} ${className}`}>
      {value}
      {unit && <span className="text-slate ml-1">{unit}</span>}
    </span>
  );
}

/* ─── Kbd — keyboard hint chip ─── */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center justify-center border border-line-soft bg-paper px-1.5 font-mono text-[10px] text-bean">
      {children}
    </kbd>
  );
}

/* ─── DataRow — single labelled row in a spec sheet ─── */
export function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[200px,1fr] gap-6 py-3.5 border-b border-line-soft last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
        {label}
      </span>
      <span
        className={`${mono ? "font-mono tabular" : "font-sans"} text-[14px] text-bean`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── SectionLabel — hairline + small uppercase mono ─── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-bean" />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
        {children}
      </span>
    </div>
  );
}

/* ─── StatCard — large mono number + caption ─── */
export function StatCard({
  value,
  unit,
  label,
  hint,
  trend,
}: {
  value: string;
  unit?: string;
  label: string;
  hint?: string;
  trend?: { dir: "up" | "down" | "flat"; pct: string };
}) {
  return (
    <div className="px-6 py-7">
      <div className="font-mono text-[36px] leading-none font-semibold tracking-[-0.02em] tabular text-bean">
        {value}
        {unit && <span className="text-slate text-[20px] ml-1">{unit}</span>}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
          {label}
        </span>
        {trend && (
          <span
            className={`font-mono text-[11px] tabular ${
              trend.dir === "up"
                ? "text-forest"
                : trend.dir === "down"
                ? "text-alert"
                : "text-slate"
            }`}
          >
            {trend.dir === "up" ? "↑" : trend.dir === "down" ? "↓" : "·"}{" "}
            {trend.pct}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-1.5 font-mono text-[10px] text-slate/70">
          {hint}
        </div>
      )}
    </div>
  );
}

/* ─── HairlineHeader — table header row, uppercase mono ─── */
export function HairlineHeader({ cols }: { cols: string[] }) {
  return (
    <div
      className="grid border-b border-line-soft bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate"
      style={{
        gridTemplateColumns: cols.map(() => "1fr").join(" "),
      }}
    >
      {cols.map((c) => (
        <span key={c}>{c}</span>
      ))}
    </div>
  );
}

/* ─── AmberLink — text link with underline-grow hover ─── */
export function AmberLink({
  children,
  href,
  className = "",
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-amber hover:text-amber-pressed transition-colors link-hover ${className}`}
    >
      {children}
    </a>
  );
}

/* ─── Address chip with copy ─── */
export function AddressChip({
  address,
  short = true,
}: {
  address: string;
  short?: boolean;
}) {
  const display = short
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tabular text-bean-soft hover:text-bean transition-colors">
      {display}
    </span>
  );
}
