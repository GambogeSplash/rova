"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/shell/AppShell";
import { Dot } from "@/components/Primitives";
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
import type { TaskType, JobOffering, Job } from "@/lib/types";

const OPERATOR_HISTORY: Record<string, number> = {
  "r1": 0.92,
  "r2": 0.71,
  "r3": 0.88,
  "r4": 0.54,
  "r6": 0.81,
};

const JOB_TEMPLATES: {
  key: string;
  label: string;
  hint: string;
  taskType: TaskType;
  from: string;
  to: string;
  bounty: string;
  sla: string;
}[] = [
  { key: "lagos-restock", label: "Lagos restock", hint: "Rack B3 → Bay 2", taskType: "CARRY", from: "Rack B3", to: "Dispatch Bay 2", bounty: "2.00", sla: "5" },
  { key: "bulk-sort", label: "Bulk sort", hint: "C1 → A3, 10m", taskType: "SORT", from: "Rack C1", to: "Rack A3", bounty: "2.75", sla: "10" },
  { key: "inspection", label: "Inspection round", hint: "A2 → Insp.", taskType: "INSPECT", from: "Rack A2", to: "Inspection Point", bounty: "2.25", sla: "8" },
  { key: "warehouse-hop", label: "Inter-warehouse hop", hint: "Charge → C1", taskType: "NAVIGATE", from: "Charging Station", to: "Rack C1", bounty: "1.40", sla: "8" },
];

const SPEND_CAPS = {
  dailyCap: 100,
  dailyUsed: 86,
  perJobCap: 5,
  sessionKeyExpiresAt: "2026-03-08T09:00:00Z",
  sessionKeyId: "sk_0x42b1…91e7",
};

function scoreOffering(
  o: JobOffering,
  budget: number,
): { score: number; rep: number; price: number; hist: number } {
  const rep = Math.min(1, o.robotReputation / 5);
  const priceRaw = budget > 0 ? 1 - o.priceUsdc / budget : 0.5;
  const price = Math.max(0, Math.min(1, priceRaw));
  const hist = OPERATOR_HISTORY[o.robotId] ?? 0.5;
  const score = 0.4 * rep + 0.3 * price + 0.3 * hist;
  return { score, rep, price, hist };
}

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
                  <span className="font-mono text-[13px] font-semibold text-teal">{o.robotName}</span>
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
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(preselected?.id ?? null);

  const schema = TASK_TYPE_SCHEMAS[taskType];
  const locationKeys = Object.keys(WAREHOUSE_LOCATIONS);

  const canSubmit = fromLoc && toLoc && bounty && sla && fromLoc !== toLoc;

  const applyTemplate = (key: string) => {
    const t = JOB_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setActiveTemplate(key);
    setTaskType(t.taskType);
    setFromLoc(t.from);
    setToLoc(t.to);
    setBounty(t.bounty);
    setSla(t.sla);
    setSelectedOfferingId(null);
  };

  const budgetNum = parseFloat(bounty) || 0;

  const scoredOfferings = useMemo(() => {
    return JOB_OFFERINGS.filter((o) => o.active && o.taskType === taskType)
      .map((o) => ({ offering: o, ...scoreOffering(o, budgetNum > 0 ? budgetNum : 5) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [taskType, budgetNum]);

  const chosen = selectedOfferingId
    ? JOB_OFFERINGS.find((o) => o.id === selectedOfferingId) ?? preselected
    : preselected;

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
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[14px] font-semibold text-text-primary">Post a Job</h2>
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">Manual fallback</span>
        </div>

        {/* Templates */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Templates</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {JOB_TEMPLATES.map((t) => {
              const isActive = activeTemplate === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => applyTemplate(t.key)}
                  className={`text-left rounded-lg border px-3 py-2 transition-all ${
                    isActive
                      ? "border-accent/40 bg-accent/[0.06]"
                      : "border-border bg-surface-0 hover:border-border-hover"
                  }`}
                >
                  <div className={`font-mono text-[11px] ${isActive ? "text-accent" : "text-text-primary"}`}>{t.label}</div>
                  <div className="font-mono text-[10px] text-text-tertiary mt-0.5">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Bid optimizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
              Bid optimizer · {taskType}
            </label>
            <span className="font-mono text-[10px] text-text-tertiary">
              40 rep · 30 price · 30 history
            </span>
          </div>
          {scoredOfferings.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-0 p-4 text-center">
              <p className="font-mono text-[11px] text-text-tertiary">No matching offerings.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
              {scoredOfferings.map((row, i) => {
                const isChosen = selectedOfferingId === row.offering.id || (!selectedOfferingId && preselected?.id === row.offering.id);
                const scorePct = Math.round(row.score * 100);
                return (
                  <button
                    key={row.offering.id}
                    onClick={() => {
                      setSelectedOfferingId(row.offering.id);
                      setBounty(row.offering.priceUsdc.toFixed(2));
                      setSla(row.offering.slaMinutes.toString());
                    }}
                    className={`w-full grid grid-cols-[auto,1fr,auto] gap-3 items-center px-3 py-2.5 text-left border-b border-border/40 last:border-b-0 transition-all ${
                      isChosen ? "bg-accent/[0.06]" : "hover:bg-surface-1/60"
                    }`}
                  >
                    <span className={`font-mono text-[10px] w-5 ${i === 0 ? "text-accent" : "text-text-tertiary"}`}>
                      #{i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[12px] font-semibold ${isChosen ? "text-accent" : "text-teal"}`}>
                          {row.offering.robotName}
                        </span>
                        <span className="font-mono text-[10px] text-text-tertiary">{row.offering.robotModel}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-[10px] text-text-tertiary">
                          rep <span className="text-text-secondary">{row.offering.robotReputation.toFixed(2)}</span>
                        </span>
                        <span className="font-mono text-[10px] text-text-tertiary">
                          price <span className="text-text-secondary">{row.offering.priceUsdc.toFixed(2)}</span>
                        </span>
                        <span className="font-mono text-[10px] text-text-tertiary">
                          hist <span className="text-text-secondary">{(row.hist * 100).toFixed(0)}%</span>
                        </span>
                        <span className="font-mono text-[10px] text-text-tertiary">
                          eta <span className="text-text-secondary">{row.offering.etaMinutes}m</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-[13px] font-semibold ${isChosen ? "text-accent" : "text-text-primary"}`}>
                        {scorePct}
                      </div>
                      <div className="mt-1 h-[2px] w-16 bg-border overflow-hidden">
                        <div
                          className={`h-full ${isChosen ? "bg-accent" : "bg-text-secondary"}`}
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Robot */}
        {chosen && (
          <div className="space-y-2">
            <label className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Selected Robot</label>
            <div className="rounded-xl border border-teal/20 bg-teal/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-semibold text-teal">{chosen.robotName}</span>
                <span className="font-mono text-[11px] text-text-tertiary">{chosen.robotModel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] text-text-secondary">Rep {chosen.robotReputation.toFixed(1)}</span>
                <span className="font-mono text-[11px] text-accent">{chosen.priceUsdc.toFixed(2)} USDC</span>
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

        {chosen && (
          <>
            <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider pt-2">Robot Details</h3>
            <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-0">
              <DetailRow label="Robot" value={chosen.robotName} />
              <DetailRow label="Model" value={chosen.robotModel} />
              <DetailRow label="Reputation" value={`${chosen.robotReputation.toFixed(1)} / 5.0`} />
              <DetailRow label="Stake" value={`${chosen.robotStake} USDC`} />
              <DetailRow label="Price" value={`${chosen.priceUsdc.toFixed(2)} USDC`} accent />
              <DetailRow label="ETA" value={`${chosen.etaMinutes} min`} />
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

// ─── Follow-job widget ────────────────────────────────────────────────

function useCountdown(targetSec: number) {
  const [remaining, setRemaining] = useState(targetSec);
  useEffect(() => {
    setRemaining(targetSec);
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [targetSec]);
  return remaining;
}

function FollowJobWidget({ job }: { job: Job }) {
  const totalSec = Math.max(60, job.slaMinutes * 60);
  const elapsedSec = Math.round((job.timeElapsedMinutes ?? 0) * 60);
  const initialRemaining = Math.max(0, totalSec - elapsedSec);
  const remaining = useCountdown(initialRemaining);

  const [secsSinceHeartbeat, setSecsSinceHeartbeat] = useState(8);
  useEffect(() => {
    setSecsSinceHeartbeat(8);
    const t = setInterval(() => {
      setSecsSinceHeartbeat((s) => {
        const next = s + 1;
        return next > 14 ? 4 : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [job.id]);

  const phaseIdx = PHASE_ORDER.indexOf(job.phase);
  const progress = phaseIdx >= 0 ? phaseIdx / (PHASE_ORDER.length - 1) : 0;

  const beatTone: "live" | "warn" | "fail" =
    secsSinceHeartbeat < 15 ? "live" : secsSinceHeartbeat < 60 ? "warn" : "fail";
  const beatLabel = beatTone === "live" ? "fresh" : beatTone === "warn" ? "stale" : "lost";

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  const eventLog = useMemo(() => {
    const baseT = new Date(job.createdAt).getTime();
    const items: { kind: string; label: string; tone: "live" | "ok" | "idle" | "warn"; t: number }[] = [
      { kind: "assigned", label: `assigned · ${job.robotName ?? "robot"}`, tone: "ok", t: baseT },
    ];
    if (phaseIdx >= 2) items.push({ kind: "escrow", label: `escrow locked · ${job.bounty.toFixed(2)} USDC`, tone: "ok", t: baseT + 6_000 });
    if (phaseIdx >= 3) items.push({ kind: "phase", label: "phase · navigating_pickup", tone: "live", t: baseT + 18_000 });
    if (phaseIdx >= 4) items.push({ kind: "phase", label: "phase · picking_up", tone: "live", t: baseT + 42_000 });
    if (phaseIdx >= 5) items.push({ kind: "phase", label: "phase · navigating_delivery", tone: "live", t: baseT + 60_000 });
    if (phaseIdx >= 6) items.push({ kind: "phase", label: "phase · delivering", tone: "live", t: baseT + 96_000 });
    items.push({ kind: "position", label: "position · 52.4124, -1.5092", tone: "idle", t: baseT + 84_000 });
    items.push({ kind: "heartbeat", label: `heartbeat · ${secsSinceHeartbeat}s ago`, tone: beatTone === "fail" ? "warn" : "idle", t: baseT + 100_000 });
    return items.sort((a, b) => b.t - a.t).slice(0, 7);
  }, [job, phaseIdx, secsSinceHeartbeat, beatTone]);

  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Mini map */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
            Live Position
          </h3>
          <span className="font-mono text-[10px] text-text-tertiary">{job.from} &rarr; {job.to}</span>
        </div>
        <div className="relative h-44 rounded-xl border border-border bg-surface-0 overflow-hidden">
          <svg viewBox="0 0 320 160" className="absolute inset-0 h-full w-full text-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="160" stroke="currentColor" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 40} x2="320" y2={i * 40} stroke="currentColor" strokeWidth="0.5" />
            ))}
            <rect x="24" y="100" width="40" height="22" className="fill-none stroke-text-tertiary" strokeWidth="1" />
            <rect x="248" y="36" width="48" height="22" className="fill-none stroke-text-tertiary" strokeWidth="1" />
            <path
              d="M 44 111 Q 140 70 272 47"
              className="fill-none stroke-accent"
              strokeWidth="1.25"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          </svg>
          {/* origin label */}
          <span className="absolute left-2 top-[78px] font-mono text-[9px] text-text-tertiary uppercase tracking-wider">
            from
          </span>
          {/* dest label */}
          <span className="absolute right-2 top-2 font-mono text-[9px] text-text-tertiary uppercase tracking-wider">
            to
          </span>
          {/* dot animated along the dashed path */}
          <motion.span
            className="absolute h-2.5 w-2.5 rounded-full bg-accent"
            style={{ boxShadow: "0 0 0 4px rgba(182,114,55,0.18)" }}
            animate={{
              left: `${44 + progress * 228}px`,
              top: `${111 - progress * 64}px`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <div className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">ETA</div>
            <div className="font-mono text-[18px] font-semibold tabular text-text-primary mt-1">
              {mm}:{ss}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">SLA</div>
            <div className="font-mono text-[18px] font-semibold tabular text-text-primary mt-1">
              {job.slaMinutes}m
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Heartbeat</div>
            <div className="flex items-center gap-1.5 mt-2">
              <Dot tone={beatTone} />
              <Dot tone={secsSinceHeartbeat < 30 ? beatTone : "idle"} />
              <Dot tone={secsSinceHeartbeat < 45 ? beatTone : "idle"} />
              <span className="font-mono text-[10px] text-text-tertiary ml-1">{beatLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event stream */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
            Event Stream
          </h3>
          <span className="font-mono text-[10px] text-teal flex items-center gap-1.5">
            <Dot tone="live" /> SSE
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface-0 p-3 space-y-1.5 max-h-56 overflow-y-auto">
          {eventLog.map((e, i) => (
            <motion.div
              key={`${e.kind}-${e.t}-${i}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[60px,12px,1fr] gap-2 items-center"
            >
              <span className="font-mono text-[10px] text-text-tertiary tabular">{fmtTime(e.t)}</span>
              <span className="flex justify-center"><Dot tone={e.tone} /></span>
              <span className="font-mono text-[11px] text-text-secondary truncate">{e.label}</span>
            </motion.div>
          ))}
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
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
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

            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
            <p className="font-mono text-[13px] text-text-tertiary">Select a job to view details.</p>
          </div>
        )}
      </div>

      {/* Follow-job right rail */}
      <div className="lg:col-span-2">
        {selectedJob ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`follow-${selectedJob.id}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <FollowJobWidget job={selectedJob} />
            </motion.div>
          </AnimatePresence>
        ) : null}
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
              <span className="font-mono text-[11px] text-teal truncate">{s.provider}</span>
              <span><TaskBadge type={s.taskType} /></span>
              <span className="font-mono text-[11px] text-accent">{s.robotPayment.toFixed(4)}</span>
              <span className="font-mono text-[11px] text-text-secondary">{s.protocolFee.toFixed(4)}</span>
              <span className={`font-mono text-[11px] ${s.refund > 0 ? "text-amber" : "text-text-tertiary"}`}>
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
  const [bumpOpen, setBumpOpen] = useState(false);

  const dailyPct = Math.min(100, Math.round((SPEND_CAPS.dailyUsed / SPEND_CAPS.dailyCap) * 100));
  const dailyRemaining = Math.max(0, SPEND_CAPS.dailyCap - SPEND_CAPS.dailyUsed);
  const dailyTone =
    dailyPct >= 90 ? "alert" : dailyPct >= 75 ? "amber" : "accent";

  const expiresAtDate = new Date(SPEND_CAPS.sessionKeyExpiresAt);
  const expiresInMs = expiresAtDate.getTime() - new Date("2026-03-08T03:18:00Z").getTime();
  const expiresInH = Math.max(0, Math.floor(expiresInMs / 3_600_000));
  const expiresInM = Math.max(0, Math.floor((expiresInMs % 3_600_000) / 60_000));

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Balance" value={`${AGENT_WALLET.balance.toFixed(2)}`} sub="USDC" />
        <StatCard label="Total Spent" value={`${AGENT_WALLET.totalSpent.toFixed(2)}`} sub="USDC" />
        <StatCard label="Active Escrow" value={`${AGENT_WALLET.activeEscrow.toFixed(2)}`} sub="USDC" />
        <StatCard label="Jobs Posted" value={`${AGENT_WALLET.jobsPosted}`} sub="lifetime" />
      </div>

      {/* Spend controls */}
      <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[12px] font-semibold text-text-primary uppercase tracking-wider">
            Spend Controls
          </h3>
          <button
            onClick={() => setBumpOpen(true)}
            className="font-mono text-[11px] px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Bump cap
          </button>
        </div>

        {/* Daily cap */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Daily cap</span>
            <span className="font-mono text-[12px] tabular text-text-primary">
              ${SPEND_CAPS.dailyUsed.toFixed(0)}
              <span className="text-text-tertiary"> / ${SPEND_CAPS.dailyCap.toFixed(0)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${dailyTone === "alert" ? "bg-alert" : dailyTone === "amber" ? "bg-amber" : "bg-accent"}`}
              initial={{ width: 0 }}
              animate={{ width: `${dailyPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className={dailyTone === "alert" ? "text-alert" : dailyTone === "amber" ? "text-amber" : "text-text-tertiary"}>
              {dailyPct >= 90 ? "Near cap — agent will pause posting" : `${dailyRemaining.toFixed(0)} USDC remaining today`}
            </span>
            <span className="text-text-tertiary">resets 00:00 UTC</span>
          </div>
        </div>

        {/* Per-job + session key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Per-job cap</span>
              <span className="font-mono text-[14px] tabular text-text-primary">${SPEND_CAPS.perJobCap.toFixed(2)}</span>
            </div>
            <p className="font-mono text-[10px] text-text-tertiary leading-relaxed">
              SDK rejects postAndAssign with bounty &gt; cap before signing.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Session key</span>
              <span className="flex items-center gap-1.5">
                <Dot tone={expiresInH < 1 ? "warn" : "live"} />
                <span className="font-mono text-[10px] text-text-secondary">{SPEND_CAPS.sessionKeyId}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[14px] tabular text-text-primary">
                {expiresInH}h {expiresInM.toString().padStart(2, "0")}m
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">
                until {expiresAtDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
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
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.robotPayment > 0 ? "bg-accent" : "bg-alert"}`} />
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
                    <span className="font-mono text-[10px] text-amber">+{s.refund.toFixed(2)} refund</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BumpCapModal open={bumpOpen} onClose={() => setBumpOpen(false)} />
    </div>
  );
}

// ─── Bump-cap modal ───────────────────────────────────────────────────

function BumpCapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-bean/50 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface-1 p-6 space-y-5"
          >
            <div className="space-y-1.5">
              <h3 className="font-mono text-[14px] font-semibold text-text-primary">Request cap bump</h3>
              <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
                A new daily cap requires re-signing the session key from the agent creator's wallet. No transaction is broadcast in this demo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Current</span>
                <span className="font-mono text-[12px] tabular text-text-primary">$100 / day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Proposed</span>
                <span className="font-mono text-[12px] tabular text-accent">$150 / day</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="font-mono text-[11px] px-3 py-2 rounded-lg border border-border bg-surface-0 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="font-mono text-[11px] font-semibold px-3 py-2 rounded-lg bg-accent text-[#020202] hover:bg-accent/90 transition-colors"
              >
                Send to creator
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
