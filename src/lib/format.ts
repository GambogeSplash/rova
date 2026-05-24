/* ROVA · formatting helpers — single source of truth for how
   addresses, amounts, time, and IDs render across the product. */

export function fmtUSDC(n: number, opts?: { precision?: number }): string {
  const p = opts?.precision ?? 4;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: p,
  });
}

export function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function fmtJobId(id: string): string {
  return id.startsWith("JOB") ? id : `JOB-${id}`;
}

export function fmtDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtTimeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function fmtTimeHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

export function fmtFullTime(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${String(
    d.getUTCHours()
  ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function basescanUrl(hash: string, kind: "tx" | "address" = "tx"): string {
  return `https://sepolia.basescan.org/${kind}/${hash}`;
}

/* Deterministic pseudo-random — for procedural mock data. */
export function seedRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function pickStatusTone(
  status: string
): "ok" | "live" | "warn" | "fail" | "idle" {
  switch (status) {
    case "completed":
    case "settled":
      return "ok";
    case "open":
    case "matching":
    case "assigned":
    case "escrow_locked":
    case "executing":
    case "navigating_pickup":
    case "picking_up":
    case "navigating_delivery":
    case "delivering":
      return "live";
    case "proof_submitted":
    case "verifying":
      return "warn";
    case "failed":
    case "cancelled":
      return "fail";
    default:
      return "idle";
  }
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}
