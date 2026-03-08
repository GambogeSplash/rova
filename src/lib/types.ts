// ─── Core Types (mirrors smart contract structs) ────────────────────

export type TaskType = "CARRY" | "NAVIGATE" | "INSPECT" | "SORT";

export type JobStatus =
  | "open"
  | "matching"
  | "assigned"
  | "escrow_locked"
  | "executing"
  | "proof_submitted"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled";

export type RobotStatus =
  | "active"
  | "idle"
  | "charging"
  | "maintenance"
  | "paused";

export type JobPhase =
  | "posted"
  | "matching"
  | "escrow_locked"
  | "navigating_pickup"
  | "picking_up"
  | "navigating_delivery"
  | "delivering"
  | "proof_submitted"
  | "verifying"
  | "settled";

// ─── Entities ────────────────────────────────────────────────────────

export interface Robot {
  id: string;
  name: string;
  model: string;
  owner: string;
  wallet: string;
  status: RobotStatus;
  reputation: number;
  stake: number;
  capabilities: TaskType[];
  battery: number;
  jobsCompleted: number;
  jobsFailed: number;
  earningsTotal: number;
  earningsToday: number;
  currentJobId: string | null;
  location: string;
}

export interface JobOffering {
  id: string;
  robotId: string;
  robotName: string;
  robotModel: string;
  robotReputation: number;
  robotStake: number;
  robotJobsCompleted: number;
  taskType: TaskType;
  priceUsdc: number;
  slaMinutes: number;
  etaMinutes: number;
  active: boolean;
}

export interface Job {
  id: string;
  client: string;
  clientAddress: string;
  robotId: string | null;
  robotName: string | null;
  taskType: TaskType;
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  bounty: number;
  bid: number | null;
  slaMinutes: number;
  status: JobStatus;
  phase: JobPhase;
  createdAt: string;
  completedAt: string | null;
  timeElapsedMinutes: number | null;
  proofGps: [number, number] | null;
  proofTimestamp: string | null;
  proofSensorHash: string | null;
  schema: string;
  txHash: string | null;
}

export interface Settlement {
  id: string;
  jobId: string;
  client: string;
  provider: string;
  robotPayment: number;
  protocolFee: number;
  refund: number;
  taskType: TaskType;
  timestamp: string;
  txHash: string;
  chain: string;
}

export interface AgentWallet {
  address: string;
  name: string;
  balance: number;
  totalSpent: number;
  activeEscrow: number;
  jobsPosted: number;
}

export interface FleetPolicy {
  acceptedTaskTypes: TaskType[];
  priceFloors: Record<TaskType, number>;
  priceCeilings: Record<TaskType, number>;
  maxConcurrentJobs: number;
  geofenceEnabled: boolean;
  geofenceBounds: { lat: [number, number]; lng: [number, number] };
  autoAccept: boolean;
  maxDailyWithdraw: number;
  emergencyPaused: boolean;
}

export interface EarningsDataPoint {
  hour: string;
  amount: number;
}

// ─── UI Types ────────────────────────────────────────────────────────

export type AppRole = "agent" | "robot" | "operator";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}
