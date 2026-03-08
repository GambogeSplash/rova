"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/shell/AppShell";
import { useCardGlow } from "@/hooks/useCardGlow";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_TYPE_SCHEMAS,
  WAREHOUSE_LOCATIONS,
  jobStatusColor,
  jobStatusLabel,
  PHASE_ORDER,
  PHASE_LABELS,
} from "@/lib/constants";
import {
  JOB_OFFERINGS,
  JOBS,
  SETTLEMENTS,
  AGENT_WALLET,
} from "@/lib/mock-data";
import type { TaskType, JobOffering, Job, JobPhase } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────

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

type SortKey = "price" | "reputation" | "eta";

// ─── Tab Components ───────────────────────────────────────────────────

function RegistryTab({
  onSelectOffering,
}: {
  onSelectOffering: (o: JobOffering) => void;
}) {
  const glow = useCardGlow();
  const [filterType, setFilterType] = useState<TaskType | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("price");

  const filtered = useMemo(() => {
    let list = JOB_OFFERINGS.filter((o) => o.active);
    if (filterType) list = list.filter((o) => o.taskType === filterType);
    list = [...list].sort((a, b) => {
      if (sortBy === "price") return a.priceUsdc - b.priceUsdc;
      if (sortBy === "reputation") return b.robotReputation - a.robotReputation;
      return a.etaMinutes - b.etaMinutes;
    });
    return list;
  }, [filterType, sortBy]);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType(null)}
            className={`font-mono text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
              filterType === null
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-surface-0 text-text-tertiary border-border hover:text-text-secondary"
            }`}
          >
            ALL
          </button>
          {TASK_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? null : t)}
              className={`font-mono text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                filterType === t
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-surface-0 text-text-tertiary border-border hover:text-text-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-tertiary">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="font-mono text-[11px] bg-surface-0 border border-border rounded-lg px-2 py-1.5 text-text-primary outline-none focus:border-accent/40"
          >
            <option value="price">Price</option>
            <option value="reputation">Reputation</option>
            <option value="eta">ETA</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
          <p className="font-mono text-[13px] text-text-tertiary">No offerings match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border border-border bg-surface-1 p-5 flex flex-col gap-3 ${glow.className}`}
              onMouseMove={glow.onMouseMove}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[13px] font-semibold text-blue-400">{o.robotName}</span>
                  <span className="font-mono text-[11px] text-text-tertiary ml-2">{o.robotModel}</span>
                </div>
                <TaskBadge type={o.taskType} />
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[24px] font-bold text-accent">{o.priceUsdc.toFixed(2)}</span>
                <span className="font-mono text-[11px] text-text-tertiary">USDC</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-text-tertiary">ETA</span>
                  <span className="font-mono text-[11px] text-text-secondary">{o.etaMinutes}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-text-tertiary">SLA</span>
                  <span className="font-mono text-[11px] text-text-secondary">{o.slaMinutes}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-text-tertiary">Rep</span>
                  <span className="font-mono text-[11px] text-text-secondary">{o.robotReputation.toFixed(1)} / 5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-text-tertiary">Stake</span>
                  <span className="font-mono text-[11px] text-text-secondary">{o.robotStake} USDC</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="font-mono text-[10px] text-text-tertiary">Jobs</span>
                  <span className="font-mono text-[11px] text-text-secondary">{o.robotJobsCompleted} completed</span>
                </div>
              </div>

              <button
                onClick={() => onSelectOffering(o)}
                className="mt-auto font-mono text-[11px] w-full py-2 rounded-lg border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                Select
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Job ─────────────────────────────────────────────────────────

function PostJobTab({ preselected }: { preselected: JobOffering | null }) {
  const [taskType, setTaskType] = useState<TaskType>(preselected?.taskType ?? "CARRY");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [bounty, setBounty] = useState(preselected?.priceUsdc?.toString() ?? "");
  const [sla, setSla] = useState(preselected?.slaMinutes?.toString() ?? "");
  const [submitted, setSubmitted] = useState(false);

  const schema = TASK_TYPE_SCHEMAS[taskType];
  const locationKeys = Object.keys(WAREHOUSE_LOCATIONS);

  const canSubmit = fromLoc && toLoc && bounty && sla && fromLoc !== toLoc;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-border bg-surface-1 p-8 max-w-lg mx-auto text-center space-y-4"
      >
        <div className="h-12 w-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
          <span className="text-accent text-[18px]">&#10003;</span>
        </div>
        <h2 className="font-mono text-[16px] font-semibold text-text-primary">Job Posted</h2>
        <p className="font-mono text-[12px] text-text-secondary">
          Your {TASK_TYPE_LABELS[taskType]} job has been submitted to the ROVA network.
        </p>
        <div className="rounded-xl border border-border bg-surface-0 p-4 text-left space-y-1">
          <DetailRow label="Job ID" value={`JOB-0x${Math.random().toString(16).slice(2, 6).toUpperCase()}`} />
          <DetailRow label="TX Hash" value={`0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`} />
          <DetailRow label="Schema" value={schema} />
          <DetailRow label="Bounty" value={`${bounty} USDC`} accent />
          <DetailRow label="Status" value="Open" />
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setFromLoc("");
            setToLoc("");
            setBounty("");
            setSla("");
          }}
          className="font-mono text-[11px] px-4 py-2 rounded-lg border border-border bg-surface-0 text-text-secondary hover:text-text-primary transition-colors"
        >
          Post Another
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Form */}
      <div className="lg:col-span-3 rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
        <h2 className="font-mono text-[14px] font-semibold text-text-primary">Post a Job</h2>

        {/* Task Type */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Task Type</label>
          <div className="flex gap-2">
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTaskType(t)}
                className={`font-mono text-[11px] px-3 py-2 rounded-lg border flex-1 transition-all ${
                  taskType === t
                    ? "bg-accent text-[#020202] border-accent font-semibold"
                    : "bg-surface-0 text-text-tertiary border-border hover:text-text-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* From */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">From Location</label>
          <select
            value={fromLoc}
            onChange={(e) => setFromLoc(e.target.value)}
            className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40"
          >
            <option value="">Select location...</option>
            {locationKeys.map((k) => (
              <option key={k} value={k}>
                {k} ({WAREHOUSE_LOCATIONS[k]})
              </option>
            ))}
          </select>
        </div>

        {/* To */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">To Location</label>
          <select
            value={toLoc}
            onChange={(e) => setToLoc(e.target.value)}
            className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40"
          >
            <option value="">Select location...</option>
            {locationKeys.map((k) => (
              <option key={k} value={k}>
                {k} ({WAREHOUSE_LOCATIONS[k]})
              </option>
            ))}
          </select>
        </div>

        {/* Bounty + SLA */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Bounty (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              placeholder="0.00"
              className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40 placeholder:text-text-tertiary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">SLA (minutes)</label>
            <input
              type="number"
              min="1"
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              placeholder="5"
              className="w-full font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-primary outline-none focus:border-accent/40 placeholder:text-text-tertiary/50"
            />
          </div>
        </div>

        {/* Schema */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Schema</label>
          <div className="font-mono text-[12px] bg-surface-0 border border-border rounded-xl px-4 py-2.5 text-text-secondary">
            {schema}
          </div>
        </div>

        {/* Selected Robot */}
        {preselected && (
          <div className="space-y-2">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Selected Robot</label>
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-blue-400">{preselected.robotName}</span>
                <span className="font-mono text-[11px] text-text-tertiary">{preselected.robotModel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] text-text-secondary">Rep {preselected.robotReputation.toFixed(1)}</span>
                <span className="font-mono text-[11px] text-accent">{preselected.priceUsdc.toFixed(2)} USDC</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full font-mono text-[12px] font-semibold py-3 rounded-xl transition-all ${
            canSubmit
              ? "bg-accent text-[#020202] hover:bg-accent/90"
              : "bg-surface-0 text-text-tertiary border border-border cursor-not-allowed"
          }`}
        >
          Post Job
        </button>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2 rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">Job Preview</h3>
        <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
          <DetailRow label="Task Type" value={TASK_TYPE_LABELS[taskType]} />
          <DetailRow label="From" value={fromLoc || "---"} />
          <DetailRow label="To" value={toLoc || "---"} />
          <DetailRow label="Bounty" value={bounty ? `${bounty} USDC` : "---"} accent={!!bounty} />
          <DetailRow label="SLA" value={sla ? `${sla} min` : "---"} />
          <DetailRow label="Schema" value={schema} />
          <DetailRow label="Client" value={AGENT_WALLET.name} />
          <DetailRow label="Network" value="Base Sepolia" />
        </div>

        {preselected && (
          <>
            <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider pt-2">Robot Details</h3>
            <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
              <DetailRow label="Robot" value={preselected.robotName} />
              <DetailRow label="Model" value={preselected.robotModel} />
              <DetailRow label="Reputation" value={`${preselected.robotReputation.toFixed(1)} / 5.0`} />
              <DetailRow label="Stake" value={`${preselected.robotStake} USDC`} />
              <DetailRow label="Price" value={`${preselected.priceUsdc.toFixed(2)} USDC`} accent />
              <DetailRow label="ETA" value={`${preselected.etaMinutes} min`} />
            </div>
          </>
        )}

        <div className="rounded-xl border border-border bg-surface-0 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Wallet Balance</span>
            <span className="font-mono text-[12px] text-text-primary">{AGENT_WALLET.balance.toFixed(2)} USDC</span>
          </div>
          {bounty && (
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">After Post</span>
              <span className="font-mono text-[12px] text-text-secondary">
                {(AGENT_WALLET.balance - parseFloat(bounty || "0")).toFixed(2)} USDC
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Active Jobs ──────────────────────────────────────────────────────

function ActiveJobsTab() {
  const activeJobs = useMemo(
    () => JOBS.filter((j) => j.status !== "completed" && j.status !== "failed" && j.status !== "cancelled"),
    []
  );
  const [selectedId, setSelectedId] = useState<string | null>(activeJobs[0]?.id ?? null);
  const selectedJob = activeJobs.find((j) => j.id === selectedId);

  const currentPhaseIdx = selectedJob ? PHASE_ORDER.indexOf(selectedJob.phase) : -1;

  if (activeJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-[14px] text-text-tertiary">No active jobs.</p>
        <p className="font-mono text-[11px] text-text-tertiary mt-1">Post a job to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Job list */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
          Active ({activeJobs.length})
        </h2>
        <div className="space-y-2">
          {activeJobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelectedId(j.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                selectedId === j.id
                  ? "border-accent/30 bg-accent/[0.04]"
                  : "border-border bg-surface-1 hover:bg-surface-1/80"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[12px] font-semibold text-text-primary">{j.id}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md ${jobStatusColor(j.status)}`}>
                  {jobStatusLabel(j.status)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <TaskBadge type={j.taskType} />
                <span className="font-mono text-[11px] text-text-secondary">
                  {j.from} &rarr; {j.to}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[11px] text-text-tertiary">
                  {j.robotName ?? "Unassigned"}
                </span>
                <span className="font-mono text-[12px] text-accent">{j.bounty.toFixed(2)} USDC</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-3 space-y-4">
        {selectedJob ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedJob.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-0">
                <h3 className="font-mono text-[14px] font-semibold text-text-primary mb-3">{selectedJob.id}</h3>
                <DetailRow label="Task Type" value={TASK_TYPE_LABELS[selectedJob.taskType]} />
                <DetailRow label="Client" value={selectedJob.client} />
                <DetailRow label="Robot" value={selectedJob.robotName ?? "Unassigned"} />
                <DetailRow label="From" value={selectedJob.from} />
                <DetailRow label="To" value={selectedJob.to} />
                <DetailRow label="Bounty" value={`${selectedJob.bounty.toFixed(2)} USDC`} accent />
                <DetailRow label="Bid" value={selectedJob.bid ? `${selectedJob.bid.toFixed(2)} USDC` : "---"} />
                <DetailRow label="SLA" value={`${selectedJob.slaMinutes} min`} />
                <DetailRow label="Elapsed" value={selectedJob.timeElapsedMinutes ? `${selectedJob.timeElapsedMinutes.toFixed(1)} min` : "---"} />
                <DetailRow label="Schema" value={selectedJob.schema} />
                <DetailRow label="TX Hash" value={selectedJob.txHash} />
                <DetailRow label="Created" value={new Date(selectedJob.createdAt).toLocaleTimeString()} />
              </div>

              {/* Phase stepper */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5">
                <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Phase Lifecycle
                </h3>
                <div className="space-y-0">
                  {PHASE_ORDER.map((phase, i) => {
                    const isCurrent = i === currentPhaseIdx;
                    const isPast = i < currentPhaseIdx;
                    const isFuture = i > currentPhaseIdx;
                    return (
                      <div key={phase} className="flex items-start gap-3">
                        {/* Connector */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-3 w-3 rounded-full border-2 flex-shrink-0 ${
                              isCurrent
                                ? "border-accent bg-accent"
                                : isPast
                                ? "border-accent/40 bg-accent/20"
                                : "border-border bg-surface-0"
                            }`}
                          />
                          {i < PHASE_ORDER.length - 1 && (
                            <div
                              className={`w-[2px] h-5 ${
                                isPast ? "bg-accent/30" : "bg-border"
                              }`}
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

              {/* Log */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5">
                <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-3">
                  Activity Log
                </h3>
                <div className="rounded-xl border border-border bg-surface-0 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {PHASE_ORDER.slice(0, currentPhaseIdx + 1).map((phase, i) => (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <span className="font-mono text-[10px] text-text-tertiary w-14 flex-shrink-0">
                        {new Date(
                          new Date(selectedJob.createdAt).getTime() + i * 30000
                        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className="font-mono text-[10px] text-accent">&gt;</span>
                      <span className="font-mono text-[11px] text-text-secondary">
                        {PHASE_LABELS[phase]}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
            <p className="font-mono text-[13px] text-text-tertiary">Select a job to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settlement History ───────────────────────────────────────────────

function HistoryTab() {
  const totalSpent = SETTLEMENTS.reduce((s, x) => s + x.robotPayment + x.protocolFee, 0);
  const totalFees = SETTLEMENTS.reduce((s, x) => s + x.protocolFee, 0);
  const totalRefunds = SETTLEMENTS.reduce((s, x) => s + x.refund, 0);
  const successCount = SETTLEMENTS.filter((s) => s.robotPayment > 0).length;
  const successRate = SETTLEMENTS.length > 0 ? ((successCount / SETTLEMENTS.length) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Spent" value={`${totalSpent.toFixed(2)} USDC`} />
        <StatCard label="Protocol Fees" value={`${totalFees.toFixed(4)} USDC`} />
        <StatCard label="Refunds" value={`${totalRefunds.toFixed(2)} USDC`} />
        <StatCard label="Success Rate" value={`${successRate}%`} sub={`${successCount} of ${SETTLEMENTS.length} jobs`} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 gap-2 px-5 py-3 border-b border-border bg-surface-0/50">
          {["Job ID", "Provider", "Task", "Paid", "Fee", "Refund", "Time", "TX Hash"].map((h) => (
            <span key={h} className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {SETTLEMENTS.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="font-mono text-[12px] text-text-tertiary">No settlements yet.</p>
          </div>
        ) : (
          SETTLEMENTS.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-8 gap-2 px-5 py-3 border-b border-border/40 last:border-b-0 hover:bg-surface-0/30 transition-colors"
            >
              <span className="font-mono text-[11px] text-text-primary truncate">{s.jobId}</span>
              <span className="font-mono text-[11px] text-blue-400 truncate">{s.provider}</span>
              <span><TaskBadge type={s.taskType} /></span>
              <span className="font-mono text-[11px] text-accent">{s.robotPayment.toFixed(4)}</span>
              <span className="font-mono text-[11px] text-text-secondary">{s.protocolFee.toFixed(4)}</span>
              <span className={`font-mono text-[11px] ${s.refund > 0 ? "text-yellow-400" : "text-text-tertiary"}`}>
                {s.refund > 0 ? s.refund.toFixed(2) : "---"}
              </span>
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

// ─── Wallet ───────────────────────────────────────────────────────────

function WalletTab() {
  const recentSettlements = SETTLEMENTS.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Balance" value={`${AGENT_WALLET.balance.toFixed(2)}`} sub="USDC" />
        <StatCard label="Total Spent" value={`${AGENT_WALLET.totalSpent.toFixed(2)}`} sub="USDC" />
        <StatCard label="Active Escrow" value={`${AGENT_WALLET.activeEscrow.toFixed(2)}`} sub="USDC" />
        <StatCard label="Jobs Posted" value={`${AGENT_WALLET.jobsPosted}`} sub="lifetime" />
      </div>

      {/* Wallet details */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-0">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-3">
          Wallet Details
        </h3>
        <DetailRow label="Name" value={AGENT_WALLET.name} />
        <DetailRow label="Address" value={AGENT_WALLET.address} />
        <DetailRow label="Network" value="Base Sepolia" />
        <DetailRow label="Available" value={`${(AGENT_WALLET.balance - AGENT_WALLET.activeEscrow).toFixed(2)} USDC`} accent />
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-3">
          Recent Transactions
        </h3>
        {recentSettlements.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-0 p-8 text-center">
            <p className="font-mono text-[12px] text-text-tertiary">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSettlements.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-surface-0 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.robotPayment > 0 ? "bg-accent" : "bg-red-400"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-text-primary">{s.jobId}</span>
                      <TaskBadge type={s.taskType} />
                    </div>
                    <span className="font-mono text-[10px] text-text-tertiary block mt-0.5">
                      {s.provider} &middot; {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[13px] font-semibold text-accent block">
                    -{(s.robotPayment + s.protocolFee).toFixed(4)}
                  </span>
                  {s.refund > 0 && (
                    <span className="font-mono text-[10px] text-yellow-400">+{s.refund.toFixed(2)} refund</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

type TabId = "registry" | "post" | "active" | "history" | "wallet";

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<TabId>("registry");
  const [selectedOffering, setSelectedOffering] = useState<JobOffering | null>(null);

  const handleSelectOffering = (o: JobOffering) => {
    setSelectedOffering(o);
    setActiveTab("post");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
    if (tab !== "post") {
      setSelectedOffering(null);
    }
  };

  return (
    <AppShell role="agent" activeTab={activeTab} onTabChange={handleTabChange}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "registry" && <RegistryTab onSelectOffering={handleSelectOffering} />}
          {activeTab === "post" && <PostJobTab preselected={selectedOffering} />}
          {activeTab === "active" && <ActiveJobsTab />}
          {activeTab === "history" && <HistoryTab />}
          {activeTab === "wallet" && <WalletTab />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
