import type { TaskType, JobStatus, RobotStatus, JobPhase, NavItem } from "./types";

// ─── Task Types ──────────────────────────────────────────────────────

export const TASK_TYPES: TaskType[] = ["CARRY", "NAVIGATE", "INSPECT", "SORT"];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CARRY: "Carry & Deliver",
  NAVIGATE: "Navigate & Scout",
  INSPECT: "Inspect & Report",
  SORT: "Sort & Organize",
};

export const TASK_TYPE_SCHEMAS: Record<TaskType, string> = {
  CARRY: "ROVA-CARRY-v1",
  NAVIGATE: "ROVA-NAVIGATE-v1",
  INSPECT: "ROVA-INSPECT-v1",
  SORT: "ROVA-SORT-v1",
};

// ─── Status Colors ───────────────────────────────────────────────────

export function jobStatusColor(status: JobStatus): string {
  switch (status) {
    case "open":
    case "matching":
      return "text-yellow-400 bg-yellow-400/10";
    case "assigned":
    case "escrow_locked":
    case "executing":
      return "text-blue-400 bg-blue-400/10";
    case "proof_submitted":
    case "verifying":
      return "text-purple-400 bg-purple-400/10";
    case "completed":
      return "text-accent bg-accent/10";
    case "failed":
    case "cancelled":
      return "text-red-400 bg-red-400/10";
  }
}

export function jobStatusLabel(status: JobStatus): string {
  switch (status) {
    case "open": return "Open";
    case "matching": return "Matching";
    case "assigned": return "Assigned";
    case "escrow_locked": return "Escrow Locked";
    case "executing": return "Executing";
    case "proof_submitted": return "Proof Sent";
    case "verifying": return "Verifying";
    case "completed": return "Completed";
    case "failed": return "Failed";
    case "cancelled": return "Cancelled";
  }
}

export function robotStatusColor(status: RobotStatus): string {
  switch (status) {
    case "active": return "bg-accent";
    case "idle": return "bg-blue-400";
    case "charging": return "bg-yellow-400";
    case "maintenance": return "bg-text-tertiary";
    case "paused": return "bg-red-400";
  }
}

export function robotStatusLabel(status: RobotStatus): string {
  switch (status) {
    case "active": return "Active";
    case "idle": return "Idle";
    case "charging": return "Charging";
    case "maintenance": return "Maintenance";
    case "paused": return "Paused";
  }
}

// ─── Phase Order ─────────────────────────────────────────────────────

export const PHASE_ORDER: JobPhase[] = [
  "posted",
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

export const PHASE_LABELS: Record<JobPhase, string> = {
  posted: "Job Posted",
  matching: "Matching Robot",
  escrow_locked: "Escrow Locked",
  navigating_pickup: "Navigating to Pickup",
  picking_up: "Picking Up",
  navigating_delivery: "In Transit",
  delivering: "Delivering",
  proof_submitted: "Proof Submitted",
  verifying: "Verifying Proof",
  settled: "Settled",
};

// ─── Navigation ──────────────────────────────────────────────────────

export const AGENT_NAV: NavItem[] = [
  { id: "registry", label: "Registry", icon: "BROWSE" },
  { id: "post", label: "Post Job", icon: "POST" },
  { id: "active", label: "Active Jobs", icon: "TRACK" },
  { id: "history", label: "History", icon: "HIST" },
  { id: "wallet", label: "Wallet", icon: "WALLET" },
];

export const ROBOT_NAV: NavItem[] = [
  { id: "incoming", label: "Incoming Jobs", icon: "INBOX" },
  { id: "active", label: "Active Job", icon: "EXEC" },
  { id: "proof", label: "Submit Proof", icon: "PROOF" },
  { id: "earnings", label: "Earnings", icon: "EARN" },
  { id: "capabilities", label: "Capabilities", icon: "REG" },
];

export const OPERATOR_NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: "DASH" },
  { id: "fleet", label: "Fleet", icon: "FLEET" },
  { id: "jobs", label: "Jobs", icon: "JOBS" },
  { id: "earnings", label: "Earnings", icon: "EARN" },
  { id: "policies", label: "Policies", icon: "POLICY" },
  { id: "emergency", label: "Emergency", icon: "ALERT" },
];

// ─── Warehouse Locations ─────────────────────────────────────────────

export const WAREHOUSE_LOCATIONS: Record<string, string> = {
  "Rack A1": "Zone A · Row 1",
  "Rack A2": "Zone A · Row 2",
  "Rack A3": "Zone A · Row 3",
  "Rack B1": "Zone B · Row 1",
  "Rack B2": "Zone B · Row 2",
  "Rack B3": "Zone B · Row 3",
  "Rack C1": "Zone C · Row 1",
  "Rack C2": "Zone C · Row 2",
  "Dispatch Bay 1": "Dispatch · Bay 1",
  "Dispatch Bay 2": "Dispatch · Bay 2",
  "Dispatch Bay 3": "Dispatch · Bay 3",
  "Charging Station": "Utility · Charging",
  "Inspection Point": "Utility · Inspection",
};
