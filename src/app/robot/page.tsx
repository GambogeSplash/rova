"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/shell/AppShell";
import { useCardGlow } from "@/hooks/useCardGlow";
import {
  TASK_TYPES,
  jobStatusColor,
  jobStatusLabel,
  PHASE_ORDER,
  PHASE_LABELS,
  robotStatusColor,
  robotStatusLabel,
} from "@/lib/constants";
import {
  ROBOTS,
  JOBS,
  JOB_OFFERINGS,
  SETTLEMENTS,
  INCOMING_JOBS_FOR_ROBOT,
} from "@/lib/mock-data";
import type { TaskType, Robot, Job, JobOffering, Settlement, JobPhase } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────

const ROBOT = ROBOTS[0]; // G1-ALPHA

function DetailRow({ label, value, accent }: { label: string; value: string | number | null; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0">
      <span className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-[12px] ${accent ? "text-accent" : "text-text-primary"}`}>
        {value ?? "---"}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-0 p-4 flex flex-col gap-1">
      <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span>
      <span className="font-mono text-[20px] font-semibold text-text-primary">{value}</span>
      {sub && <span className="font-mono text-[10px] text-text-tertiary">{sub}</span>}
    </div>
  );
}

function TaskBadge({ type }: { type: TaskType }) {
  return (
    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
      {type}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// ─── Tab 1: Incoming Jobs ─────────────────────────────────────────────

function IncomingTab({ onAccepted }: { onAccepted: () => void }) {
  const glow = useCardGlow();

  const incomingJobs = useMemo(
    () =>
      INCOMING_JOBS_FOR_ROBOT.filter((j) =>
        ROBOT.capabilities.includes(j.taskType)
      ),
    []
  );

  // Acceptance flow state
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());

  const acceptingJob = incomingJobs.find((j) => j.id === acceptingJobId);

  // Find the robot's offering price for the task type
  const getOfferingPrice = (taskType: TaskType): number => {
    const offering = JOB_OFFERINGS.find(
      (o) => o.robotId === ROBOT.id && o.taskType === taskType
    );
    return offering?.priceUsdc ?? 0;
  };

  const handleStartAccept = (job: Job) => {
    setAcceptingJobId(job.id);
    setBidAmount(getOfferingPrice(job.taskType).toFixed(2));
    setAccepted(false);
  };

  const handleConfirmAccept = () => {
    setAccepted(true);
    setTimeout(() => {
      onAccepted();
    }, 2000);
  };

  const handleDecline = (jobId: string) => {
    setDeclinedIds((prev) => new Set(prev).add(jobId));
  };

  const visibleJobs = incomingJobs.filter((j) => !declinedIds.has(j.id));

  // Acceptance modal
  if (acceptingJobId && acceptingJob) {
    if (accepted) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-surface-1 p-8 max-w-lg mx-auto text-center space-y-4"
        >
          <div className="h-12 w-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
            <span className="text-accent text-[18px]">&#10003;</span>
          </div>
          <h2 className="font-mono text-[16px] font-semibold text-text-primary">Job Accepted</h2>
          <p className="font-mono text-[12px] text-text-secondary">
            You have accepted job {acceptingJob.id}. Navigating to active job view...
          </p>
          <div className="rounded-xl border border-border bg-surface-0 p-4 text-left space-y-0">
            <DetailRow label="Job ID" value={acceptingJob.id} />
            <DetailRow label="Task" value={acceptingJob.taskType} />
            <DetailRow label="Your Bid" value={`${bidAmount} USDC`} accent />
            <DetailRow label="Bounty" value={`${acceptingJob.bounty.toFixed(2)} USDC`} />
            <DetailRow label="Status" value="Assigned" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-5"
      >
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
          <h2 className="font-mono text-[14px] font-semibold text-text-primary">Confirm Acceptance</h2>

          <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
            <DetailRow label="Job ID" value={acceptingJob.id} />
            <DetailRow label="Task" value={acceptingJob.taskType} />
            <DetailRow label="Client" value={acceptingJob.client} />
            <DetailRow label="From" value={acceptingJob.from} />
            <DetailRow label="To" value={acceptingJob.to} />
            <DetailRow label="Bounty" value={`${acceptingJob.bounty.toFixed(2)} USDC`} accent />
            <DetailRow label="SLA" value={`${acceptingJob.slaMinutes} min`} />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
              Your Bid (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={acceptingJob.bounty}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40 placeholder:text-text-tertiary/50"
            />
            <p className="font-mono text-[10px] text-text-tertiary">
              Your offering price: {getOfferingPrice(acceptingJob.taskType).toFixed(2)} USDC
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirmAccept}
              disabled={!bidAmount || parseFloat(bidAmount) <= 0}
              className="flex-1 font-mono text-[12px] font-semibold py-3 rounded-xl bg-accent text-[#020202] hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Accept
            </button>
            <button
              onClick={() => setAcceptingJobId(null)}
              className="flex-1 font-mono text-[12px] py-3 rounded-xl border border-border bg-surface-0 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (visibleJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-[14px] text-text-tertiary">No incoming jobs matching your capabilities.</p>
        <p className="font-mono text-[11px] text-text-tertiary mt-1">
          You are registered for: {ROBOT.capabilities.join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Incoming Jobs ({visibleJobs.length})
        </h2>
        <span className="font-mono text-[10px] text-text-tertiary">
          Capabilities: {ROBOT.capabilities.join(" / ")}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleJobs.map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`rounded-2xl border border-border bg-surface-1 p-5 flex flex-col gap-3 ${glow.className}`}
            onMouseMove={glow.onMouseMove}
          >
            <div className="flex items-start justify-between">
              <TaskBadge type={job.taskType} />
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md ${jobStatusColor(job.status)}`}>
                {jobStatusLabel(job.status)}
              </span>
            </div>

            <div className="font-mono text-[12px] text-text-secondary">
              <span className="text-text-primary">{job.from}</span>
              <span className="text-text-tertiary mx-2">&rarr;</span>
              <span className="text-text-primary">{job.to}</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[24px] font-bold text-accent">{job.bounty.toFixed(2)}</span>
              <span className="font-mono text-[11px] text-text-tertiary">USDC</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-text-tertiary">SLA</span>
                <span className="font-mono text-[11px] text-text-secondary">{job.slaMinutes}m</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-text-tertiary">Client</span>
                <span className="font-mono text-[11px] text-accent">{job.client}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="font-mono text-[10px] text-text-tertiary">Posted</span>
                <span className="font-mono text-[11px] text-text-secondary">{timeAgo(job.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleStartAccept(job)}
                className="flex-1 font-mono text-[11px] font-semibold py-2 rounded-lg bg-accent text-[#020202] hover:bg-accent/90 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(job.id)}
                className="flex-1 font-mono text-[11px] py-2 rounded-lg border border-border bg-surface-0 text-text-secondary hover:text-text-primary transition-colors"
              >
                Decline
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 2: Active Job ────────────────────────────────────────────────

function ActiveJobTab() {
  const activeJob = useMemo(
    () => JOBS.find((j) => j.robotId === ROBOT.id && j.status === "executing"),
    []
  );

  if (!activeJob) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-[14px] text-text-tertiary">No active job.</p>
        <p className="font-mono text-[11px] text-text-tertiary mt-1">Check incoming jobs.</p>
      </div>
    );
  }

  const currentPhaseIdx = PHASE_ORDER.indexOf(activeJob.phase);
  const elapsed = activeJob.timeElapsedMinutes ?? 0;
  const progressPct = Math.min((elapsed / activeJob.slaMinutes) * 100, 100);

  // Determine payload status based on phase
  const carryingPhases: JobPhase[] = ["picking_up", "navigating_delivery", "delivering"];
  const isCarrying = carryingPhases.includes(activeJob.phase);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Job detail */}
      <div className="lg:col-span-3 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface-1 p-5 space-y-0"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[14px] font-semibold text-text-primary">{activeJob.id}</h3>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md ${jobStatusColor(activeJob.status)}`}>
              {jobStatusLabel(activeJob.status)}
            </span>
          </div>
          <DetailRow label="Task Type" value={activeJob.taskType} />
          <DetailRow label="Client" value={activeJob.client} />
          <DetailRow label="From" value={activeJob.from} />
          <DetailRow label="To" value={activeJob.to} />
          <DetailRow label="Bounty" value={`${activeJob.bounty.toFixed(2)} USDC`} accent />
          <DetailRow label="Bid" value={activeJob.bid ? `${activeJob.bid.toFixed(2)} USDC` : "---"} />
          <DetailRow label="SLA" value={`${activeJob.slaMinutes} min`} />
          <DetailRow label="Elapsed" value={`${elapsed.toFixed(1)} min`} />
          <DetailRow label="Schema" value={activeJob.schema} />
          <DetailRow label="TX Hash" value={activeJob.txHash} />
          <DetailRow label="Created" value={new Date(activeJob.createdAt).toLocaleTimeString()} />
        </motion.div>

        {/* Progress bar */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
              SLA Progress
            </h3>
            <span className="font-mono text-[11px] text-text-secondary">
              {elapsed.toFixed(1)}m / {activeJob.slaMinutes}m
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-0 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progressPct > 80 ? "bg-red-400" : progressPct > 60 ? "bg-yellow-400" : "bg-accent"
              }`}
            />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-text-tertiary">0m</span>
            <span className={`font-mono text-[10px] ${progressPct > 80 ? "text-red-400" : "text-text-tertiary"}`}>
              {progressPct.toFixed(0)}%
            </span>
            <span className="font-mono text-[10px] text-text-tertiary">{activeJob.slaMinutes}m</span>
          </div>
        </div>

        {/* Location info */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-3">
          <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
            Location
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface-0 p-3 space-y-1">
              <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider block">From</span>
              <span className="font-mono text-[12px] text-text-primary block">{activeJob.from}</span>
              <span className="font-mono text-[10px] text-text-tertiary block">
                {activeJob.fromCoords[0].toFixed(4)}, {activeJob.fromCoords[1].toFixed(4)}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-0 p-3 space-y-1">
              <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider block">To</span>
              <span className="font-mono text-[12px] text-text-primary block">{activeJob.to}</span>
              <span className="font-mono text-[10px] text-text-tertiary block">
                {activeJob.toCoords[0].toFixed(4)}, {activeJob.toCoords[1].toFixed(4)}
              </span>
            </div>
          </div>

          {/* Payload status */}
          <div className="flex items-center gap-2 pt-1">
            <div className={`h-2.5 w-2.5 rounded-full ${isCarrying ? "bg-accent animate-pulse" : "bg-text-tertiary/40"}`} />
            <span className={`font-mono text-[11px] ${isCarrying ? "text-accent" : "text-text-tertiary"}`}>
              {isCarrying ? "Payload: Carrying" : "Payload: Empty"}
            </span>
          </div>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-4">
            Phase Lifecycle
          </h3>
          <div className="space-y-0">
            {PHASE_ORDER.map((phase, i) => {
              const isCurrent = i === currentPhaseIdx;
              const isPast = i < currentPhaseIdx;
              return (
                <div key={phase} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full border-2 flex-shrink-0 relative ${
                        isCurrent
                          ? "border-accent bg-accent"
                          : isPast
                          ? "border-accent/40 bg-accent/20"
                          : "border-border bg-surface-0"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-30" />
                      )}
                    </div>
                    {i < PHASE_ORDER.length - 1 && (
                      <div
                        className={`w-[2px] h-5 ${isPast ? "bg-accent/30" : "bg-border"}`}
                      />
                    )}
                  </div>
                  <span
                    className={`font-mono text-[11px] -mt-0.5 ${
                      isCurrent
                        ? "text-accent font-semibold"
                        : isPast
                        ? "text-text-secondary"
                        : "text-text-tertiary"
                    }`}
                  >
                    {PHASE_LABELS[phase]}
                    {isCurrent && (
                      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase card */}
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5 space-y-2">
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Current Phase</span>
          <span className="font-mono text-[16px] font-semibold text-accent block">
            {PHASE_LABELS[activeJob.phase]}
          </span>
          <span className="font-mono text-[11px] text-text-secondary block">
            Phase {currentPhaseIdx + 1} of {PHASE_ORDER.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Submit Proof ──────────────────────────────────────────────

function ProofTab() {
  const activeJob = useMemo(
    () => JOBS.find((j) => j.robotId === ROBOT.id && j.status === "executing"),
    []
  );

  const completablePhases: JobPhase[] = ["delivering", "proof_submitted", "verifying", "navigating_delivery"];
  const canSubmitProof = activeJob && completablePhases.includes(activeJob.phase);

  const [lat, setLat] = useState(activeJob?.toCoords[0]?.toString() ?? "");
  const [lng, setLng] = useState(activeJob?.toCoords[1]?.toString() ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0); // 0 = not started, 1-3 = steps, 4 = done
  const sensorHash = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

  const handleSubmit = () => {
    setSubmitted(true);
    setVerifyStep(1);
    setTimeout(() => setVerifyStep(2), 800);
    setTimeout(() => setVerifyStep(3), 1600);
    setTimeout(() => setVerifyStep(4), 2400);
  };

  if (!activeJob || !canSubmitProof) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-[14px] text-text-tertiary">No job ready for proof submission.</p>
        <p className="font-mono text-[11px] text-text-tertiary mt-1">
          {activeJob
            ? `Current phase: ${PHASE_LABELS[activeJob.phase]}. Wait until delivering phase.`
            : "No active job. Check incoming jobs."}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto space-y-5"
      >
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
          <h2 className="font-mono text-[14px] font-semibold text-text-primary">Verification Progress</h2>

          <div className="space-y-3">
            {[
              { label: "GPS Valid", step: 1 },
              { label: "Timestamp Valid", step: 2 },
              { label: "SLA Met", step: 3 },
            ].map(({ label, step }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: verifyStep >= step ? 1 : 0.3, x: 0 }}
                transition={{ delay: step * 0.2 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                    verifyStep >= step
                      ? "bg-accent/10 border-accent/30"
                      : "bg-surface-0 border-border"
                  }`}
                >
                  {verifyStep >= step && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-accent text-[11px]"
                    >
                      &#10003;
                    </motion.span>
                  )}
                </div>
                <span
                  className={`font-mono text-[12px] ${
                    verifyStep >= step ? "text-accent" : "text-text-tertiary"
                  }`}
                >
                  {label}
                </span>
                {verifyStep === step && verifyStep < 4 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse ml-auto" />
                )}
              </motion.div>
            ))}
          </div>

          {verifyStep >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2"
            >
              <div className="h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="font-mono text-[13px] font-semibold text-accent">Verification Complete</span>
              </div>

              <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
                <DetailRow label="Job ID" value={activeJob.id} />
                <DetailRow label="Payment" value={`${(activeJob.bid ?? activeJob.bounty).toFixed(4)} USDC`} accent />
                <DetailRow
                  label="Protocol Fee"
                  value={`${((activeJob.bid ?? activeJob.bounty) * 0.003).toFixed(4)} USDC`}
                />
                <DetailRow
                  label="Net Earnings"
                  value={`${((activeJob.bid ?? activeJob.bounty) * 0.997).toFixed(4)} USDC`}
                  accent
                />
                <DetailRow
                  label="TX Hash"
                  value={`0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`}
                />
                <DetailRow label="Chain" value="Base Sepolia" />
                <DetailRow label="Status" value="Settled" />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
        <h2 className="font-mono text-[14px] font-semibold text-text-primary">Submit Proof</h2>

        {/* Job reference */}
        <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
          <DetailRow label="Job ID" value={activeJob.id} />
          <DetailRow label="Task" value={activeJob.taskType} />
          <DetailRow label="Route" value={`${activeJob.from} → ${activeJob.to}`} />
          <DetailRow label="Bounty" value={`${activeJob.bounty.toFixed(2)} USDC`} accent />
        </div>

        {/* GPS Coordinates */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">GPS Coordinates</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-text-tertiary">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40"
              />
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-text-tertiary">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40"
              />
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Timestamp</label>
          <div className="font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-secondary">
            {new Date().toISOString()}
          </div>
        </div>

        {/* Sensor Hash */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Sensor Hash</label>
          <div className="font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-secondary">
            {sensorHash}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!lat || !lng}
          className="w-full font-mono text-[12px] font-semibold py-3 rounded-xl bg-accent text-[#020202] hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit to ROVAVerifier
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: Earnings ──────────────────────────────────────────────────

function EarningsTab() {
  const robotSettlements = useMemo(
    () => SETTLEMENTS.filter((s) => s.provider === ROBOT.name),
    []
  );

  const successRate =
    ROBOT.jobsCompleted + ROBOT.jobsFailed > 0
      ? ((ROBOT.jobsCompleted / (ROBOT.jobsCompleted + ROBOT.jobsFailed)) * 100).toFixed(1)
      : "0";

  const pendingEarnings = useMemo(() => {
    const activeJobs = JOBS.filter(
      (j) => j.robotId === ROBOT.id && j.status === "executing"
    );
    return activeJobs.reduce((sum, j) => sum + (j.bid ?? 0), 0);
  }, []);

  const maxSettlementAmount = Math.max(...robotSettlements.map((s) => s.robotPayment), 1);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Earned" value={`${ROBOT.earningsTotal.toFixed(2)}`} sub="USDC" />
        <StatCard label="Today" value={`${ROBOT.earningsToday.toFixed(2)}`} sub="USDC" />
        <StatCard label="Pending" value={`${pendingEarnings.toFixed(2)}`} sub="USDC" />
        <StatCard label="Stake" value="500" sub="ROVA" />
        <StatCard label="Success Rate" value={`${successRate}%`} sub={`${ROBOT.jobsCompleted} / ${ROBOT.jobsCompleted + ROBOT.jobsFailed}`} />
      </div>

      {/* Earnings bars */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Recent Earnings
        </h3>
        {robotSettlements.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-0 p-8 text-center">
            <p className="font-mono text-[12px] text-text-tertiary">No settlements yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {robotSettlements.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-text-primary">{s.jobId}</span>
                    <TaskBadge type={s.taskType} />
                  </div>
                  <span className="font-mono text-[12px] text-accent font-semibold">
                    +{s.robotPayment.toFixed(4)} USDC
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-0 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.robotPayment / maxSettlementAmount) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="h-full rounded-full bg-accent/60"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Settlement list */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="grid grid-cols-7 gap-2 px-5 py-3 border-b border-border bg-surface-0/50">
          {["Job ID", "Client", "Task", "Payment", "Fee", "Time", "TX Hash"].map((h) => (
            <span key={h} className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>
        {robotSettlements.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="font-mono text-[12px] text-text-tertiary">No settlements yet.</p>
          </div>
        ) : (
          robotSettlements.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-7 gap-2 px-5 py-3 border-b border-border/40 last:border-b-0 hover:bg-surface-0/30 transition-colors"
            >
              <span className="font-mono text-[11px] text-text-primary truncate">{s.jobId}</span>
              <span className="font-mono text-[11px] text-text-secondary truncate">{s.client}</span>
              <span><TaskBadge type={s.taskType} /></span>
              <span className="font-mono text-[11px] text-accent">{s.robotPayment.toFixed(4)}</span>
              <span className="font-mono text-[11px] text-text-secondary">{s.protocolFee.toFixed(4)}</span>
              <span className="font-mono text-[11px] text-text-tertiary truncate">
                {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-mono text-[10px] text-text-tertiary truncate">{s.txHash}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab 5: Capabilities ─────────────────────────────────────────────

function CapabilitiesTab() {
  const [capabilities, setCapabilities] = useState<Set<TaskType>>(
    new Set(ROBOT.capabilities)
  );

  const robotOfferings = useMemo(
    () => JOB_OFFERINGS.filter((o) => o.robotId === ROBOT.id),
    []
  );

  const [offeringActive, setOfferingActive] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(robotOfferings.map((o) => [o.id, o.active]))
  );

  const toggleCapability = (type: TaskType) => {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const stakeHealth = Math.min((ROBOT.stake / 500) * 100, 100);

  return (
    <div className="space-y-5">
      {/* Robot profile */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <span className="font-mono text-[11px] font-bold text-blue-400">G1</span>
            </div>
            <div>
              <span className="font-mono text-[14px] font-semibold text-text-primary block">{ROBOT.name}</span>
              <span className="font-mono text-[11px] text-text-tertiary">{ROBOT.model}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${robotStatusColor(ROBOT.status)}`} />
            <span className="font-mono text-[11px] text-text-secondary">{robotStatusLabel(ROBOT.status)}</span>
          </div>
        </div>
        <DetailRow label="Wallet" value={ROBOT.wallet} />
        <DetailRow label="Owner" value={ROBOT.owner} />
        <DetailRow label="Battery" value={`${ROBOT.battery}%`} />
        <DetailRow label="Reputation" value={`${ROBOT.reputation.toFixed(1)} / 5.0`} />
        <DetailRow label="Location" value={ROBOT.location} />
        <DetailRow label="Jobs Completed" value={ROBOT.jobsCompleted} />
        <DetailRow label="Jobs Failed" value={ROBOT.jobsFailed} />
      </div>

      {/* Capabilities toggles */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Capabilities
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TASK_TYPES.map((type) => {
            const isActive = capabilities.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleCapability(type)}
                className={`font-mono text-[12px] py-3 rounded-xl border transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent border-accent/30 font-semibold"
                    : "bg-surface-0 text-text-tertiary border-border hover:text-text-secondary"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[10px] text-text-tertiary">
          Active capabilities determine which job types you can receive.
        </p>
      </div>

      {/* Job Offerings table */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Active Job Offerings
        </h3>
        {robotOfferings.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-0 p-8 text-center">
            <p className="font-mono text-[12px] text-text-tertiary">No offerings configured.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-2.5 border-b border-border">
              {["Task Type", "Price", "SLA", "ETA", "Active"].map((h) => (
                <span key={h} className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>
            {robotOfferings.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border/40 last:border-b-0 items-center"
              >
                <span><TaskBadge type={o.taskType} /></span>
                <span className="font-mono text-[12px] text-accent">{o.priceUsdc.toFixed(2)} USDC</span>
                <span className="font-mono text-[11px] text-text-secondary">{o.slaMinutes}m</span>
                <span className="font-mono text-[11px] text-text-secondary">{o.etaMinutes}m</span>
                <div>
                  <button
                    onClick={() =>
                      setOfferingActive((prev) => ({
                        ...prev,
                        [o.id]: !prev[o.id],
                      }))
                    }
                    className={`font-mono text-[10px] px-3 py-1 rounded-lg border transition-all ${
                      offeringActive[o.id]
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-surface-0 text-text-tertiary border-border"
                    }`}
                  >
                    {offeringActive[o.id] ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stake section */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Stake
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[24px] font-bold text-text-primary">500</span>
          <span className="font-mono text-[12px] text-text-tertiary">ROVA</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Stake Health</span>
            <span className="font-mono text-[11px] text-text-secondary">{stakeHealth.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-0 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stakeHealth}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                stakeHealth > 80 ? "bg-accent" : stakeHealth > 50 ? "bg-yellow-400" : "bg-red-400"
              }`}
            />
          </div>
        </div>
        <p className="font-mono text-[10px] text-text-tertiary">
          Stake is slashed for failed jobs. Maintain a healthy stake to receive job assignments.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

type TabId = "incoming" | "active" | "proof" | "earnings" | "capabilities";

export default function RobotPage() {
  const [activeTab, setActiveTab] = useState<TabId>("incoming");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
  };

  const handleJobAccepted = () => {
    setActiveTab("active");
  };

  return (
    <AppShell role="robot" activeTab={activeTab} onTabChange={handleTabChange}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "incoming" && <IncomingTab onAccepted={handleJobAccepted} />}
          {activeTab === "active" && <ActiveJobTab />}
          {activeTab === "proof" && <ProofTab />}
          {activeTab === "earnings" && <EarningsTab />}
          {activeTab === "capabilities" && <CapabilitiesTab />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
