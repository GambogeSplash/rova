"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
type Role = null | "agent" | "operator";
type AgentStep = "task" | "select" | "escrow" | "tracking" | "settled";
type OperatorStep = "register" | "capabilities" | "stake" | "offerings" | "live";

interface TaskForm {
  taskType: string;
  from: string;
  to: string;
  bounty: string;
  sla: string;
}

interface RobotForm {
  name: string;
  model: string;
  wallet: string;
}

// ─── Mock robots for agent selection ─────────────────────────────────
const AVAILABLE_ROBOTS = [
  { id: "G1-ALPHA", price: 1.75, eta: "2min", rep: 4.9, stake: 500, jobs: 847 },
  { id: "G1-BETA", price: 1.90, eta: "3min", rep: 4.7, stake: 500, jobs: 612 },
  { id: "G1-DELTA", price: 1.80, eta: "2.5min", rep: 4.8, stake: 500, jobs: 723 },
];

const TASK_TYPES = ["CARRY", "NAVIGATE", "INSPECT", "SORT"];

const fadeIn = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(4px)" },
  transition: { duration: 0.4 },
};

// ─── Shared UI ───────────────────────────────────────────────────────
function TopBar() {
  return (
    <div className="border-b border-border bg-surface-0/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
            <span className="text-[14px] font-semibold text-text-primary">ROVA</span>
          </Link>
          <span className="text-text-tertiary">/</span>
          <span className="text-[13px] text-text-secondary">Get Started</span>
        </div>
        <Link href="/dashboard" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold transition-all duration-300 ${
            i < current
              ? "bg-accent text-background shadow-[0_0_12px_rgba(239,111,46,0.3)]"
              : i === current
              ? "bg-accent/20 text-accent border border-accent/40"
              : "bg-surface-2 text-text-tertiary"
          }`}>
            {i < current ? "\u2713" : i + 1}
          </div>
          <span className={`text-[11px] hidden sm:inline ${
            i === current ? "text-text-primary" : "text-text-tertiary"
          }`}>{s}</span>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 transition-colors ${i < current ? "bg-accent/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InputField({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-surface-0 px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/40 focus:shadow-[0_0_20px_rgba(239,111,46,0.06)] transition-all"
    />
  );
}

function PrimaryButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-sm text-background hover:brightness-110 transition-all glow-accent btn-press disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface-1 px-6 py-3 text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all btn-press"
    >
      {children}
    </button>
  );
}

function MockTxHash() {
  const hash = "0x" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "..." + Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return <span className="font-mono text-[11px] text-text-tertiary">{hash}</span>;
}

// ─── Role Selection ──────────────────────────────────────────────────
function RoleSelection({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <motion.div {...fadeIn} className="mx-auto max-w-2xl">
      <div className="text-center mb-12">
        <span className="text-[12px] font-medium text-accent tracking-widest uppercase">GET STARTED</span>
        <h1 className="mt-3 text-3xl font-bold text-text-primary sm:text-4xl">Who are you?</h1>
        <p className="mt-3 text-text-secondary">Choose your role to see how ROVA works for you.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <motion.button
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("agent")}
          className="text-left rounded-2xl border border-accent/20 p-8 card-elevated gradient-border"
          style={{ background: "linear-gradient(145deg, rgba(239,111,46,0.04), transparent)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
              <span className="font-mono text-sm font-bold text-accent">A</span>
            </div>
            <span className="font-mono text-[10px] text-accent">CLIENT</span>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">I&apos;m an Agent</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            I need physical work done. Post a task, select a robot, and let escrow handle payment automatically.
          </p>
          <div className="mt-5 font-mono text-[10px] text-accent/60">
            Post Task &rarr; Select Robot &rarr; Auto-settle
          </div>
        </motion.button>

        <motion.button
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("operator")}
          className="text-left rounded-2xl border border-blue-400/20 p-8 card-elevated"
          style={{ background: "linear-gradient(145deg, rgba(96,165,250,0.04), transparent)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 border border-blue-400/20">
              <span className="font-mono text-sm font-bold text-blue-400">R</span>
            </div>
            <span className="font-mono text-[10px] text-blue-400">PROVIDER</span>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">I&apos;m a Fleet Operator</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            I have robots that can do physical work. Register them on ROVA and start earning from agent tasks.
          </p>
          <div className="mt-5 font-mono text-[10px] text-blue-400/60">
            Register &rarr; Stake &rarr; Earn
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Agent Flow ──────────────────────────────────────────────────────
function AgentFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<AgentStep>("task");
  const [task, setTask] = useState<TaskForm>({ taskType: "CARRY", from: "Rack B3", to: "Dispatch Bay 2", bounty: "2.00", sla: "5" });
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const steps = ["Post Task", "Select Robot", "Lock Escrow", "Tracking", "Settled"];
  const stepIndex = ["task", "select", "escrow", "tracking", "settled"].indexOf(step);

  const handleEscrow = () => {
    setStep("escrow");
    setTimeout(() => {
      setStep("tracking");
      setTimeout(() => {
        setSettling(true);
        setTimeout(() => {
          setStep("settled");
        }, 2000);
      }, 3000);
    }, 2000);
  };

  return (
    <motion.div {...fadeIn} className="mx-auto max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
        &larr; Back to role selection
      </button>

      <StepIndicator steps={steps} current={stepIndex} />

      <AnimatePresence mode="wait">
        {step === "task" && (
          <motion.div key="task" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(239,111,46,0.5)]" />
              <span className="font-mono text-xs text-accent">POST A TASK</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">Define what physical work you need done. Your bounty will be locked in escrow until a robot completes the job.</p>

            <FormField label="Task Type">
              <div className="flex gap-2">
                {TASK_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTask({ ...task, taskType: t })}
                    className={`flex-1 rounded-lg px-3 py-2.5 font-mono text-xs font-semibold border transition-all ${
                      task.taskType === t
                        ? "border-accent/30 bg-accent/10 text-accent shadow-[0_0_12px_rgba(239,111,46,0.08)]"
                        : "border-border bg-surface-0 text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="From (Pickup)">
                <InputField value={task.from} onChange={(v) => setTask({ ...task, from: v })} placeholder="e.g. Rack B3" />
              </FormField>
              <FormField label="To (Delivery)">
                <InputField value={task.to} onChange={(v) => setTask({ ...task, to: v })} placeholder="e.g. Dispatch Bay 2" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bounty (USDC)">
                <InputField value={task.bounty} onChange={(v) => setTask({ ...task, bounty: v })} placeholder="2.00" type="number" />
              </FormField>
              <FormField label="SLA (Minutes)">
                <InputField value={task.sla} onChange={(v) => setTask({ ...task, sla: v })} placeholder="5" type="number" />
              </FormField>
            </div>

            <div className="mt-2 rounded-lg border border-border bg-surface-0 p-3 font-mono text-[10px] text-text-tertiary">
              Schema: ROVA-{task.taskType}-v1 &middot; Network: Base Sepolia &middot; Escrow: ROVAMarket.sol
            </div>

            <div className="mt-6">
              <PrimaryButton onClick={() => setStep("select")} disabled={!task.from || !task.to || !task.bounty}>
                Post Task &rarr;
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === "select" && (
          <motion.div key="select" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              <span className="font-mono text-xs text-blue-400">SELECT A ROBOT</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              {AVAILABLE_ROBOTS.length} robots available for <span className="text-accent">{task.taskType}</span> tasks. Select one based on price, ETA, and reputation.
            </p>

            <div className="space-y-3">
              {AVAILABLE_ROBOTS.map((robot) => (
                <motion.button
                  key={robot.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedRobot(robot.id)}
                  className={`w-full text-left rounded-xl border p-5 transition-all duration-200 ${
                    selectedRobot === robot.id
                      ? "border-accent/30 bg-accent/[0.04] shadow-[0_0_20px_rgba(239,111,46,0.06)]"
                      : "border-border bg-surface-0 hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${selectedRobot === robot.id ? "bg-accent shadow-[0_0_8px_rgba(239,111,46,0.4)]" : "bg-blue-400"} animate-pulse`} />
                      <span className="font-mono text-sm font-bold text-text-primary">{robot.id}</span>
                    </div>
                    <span className="font-mono text-lg font-bold text-accent">{robot.price} <span className="text-xs text-text-tertiary">USDC</span></span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="text-[10px] font-medium text-text-tertiary uppercase">ETA</div>
                      <div className="font-mono text-xs text-text-primary">{robot.eta}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-text-tertiary uppercase">Rep</div>
                      <div className="font-mono text-xs text-accent">{robot.rep}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-text-tertiary uppercase">Stake</div>
                      <div className="font-mono text-xs text-text-primary">{robot.stake} ROVA</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-text-tertiary uppercase">Jobs</div>
                      <div className="font-mono text-xs text-text-primary">{robot.jobs}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton onClick={handleEscrow} disabled={!selectedRobot}>
                Hire {selectedRobot ?? "..."} &rarr; Lock Escrow
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === "escrow" && (
          <motion.div key="escrow" {...fadeIn} className="rounded-2xl border border-yellow-400/20 p-8 card-elevated text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6 h-12 w-12 rounded-full border-2 border-yellow-400/30 border-t-yellow-400"
            />
            <span className="font-mono text-xs text-yellow-400">LOCKING ESCROW</span>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">Securing {AVAILABLE_ROBOTS.find(r => r.id === selectedRobot)?.price} USDC</h3>
            <p className="mt-2 text-sm text-text-secondary">Bounty is being locked in ROVAMarket.sol escrow contract on Base Sepolia...</p>
            <div className="mt-4"><MockTxHash /></div>
          </motion.div>
        )}

        {step === "tracking" && (
          <motion.div key="tracking" {...fadeIn} className="rounded-2xl border border-blue-400/20 p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              <span className="font-mono text-xs text-blue-400">ROBOT EXECUTING</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }} className="flex items-center gap-3 rounded-lg bg-surface-0 p-3">
                <span className="text-accent">[ESCROW]</span>
                <span className="text-text-secondary">{AVAILABLE_ROBOTS.find(r => r.id === selectedRobot)?.price} USDC locked &middot; <MockTxHash /></span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-3 rounded-lg bg-surface-0 p-3">
                <span className="text-blue-400">[{selectedRobot}]</span>
                <span className="text-text-secondary">Job accepted &middot; navigating to {task.from}...</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="flex items-center gap-3 rounded-lg bg-surface-0 p-3">
                <span className="text-blue-400">[{selectedRobot}]</span>
                <span className="text-text-secondary">Arrived at {task.from} &middot; picking up payload...</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="flex items-center gap-3 rounded-lg bg-surface-0 p-3">
                <span className="text-blue-400">[{selectedRobot}]</span>
                <span className="text-text-secondary">Navigating to {task.to} &middot; payload secured...</span>
              </motion.div>
              {settling && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-lg bg-accent/[0.04] border border-accent/10 p-3">
                  <span className="text-purple-400">[VERIFIER]</span>
                  <span className="text-text-secondary">GPS confirmed &middot; SLA met &middot; submitting proof...</span>
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-1 rounded-full bg-surface-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-accent rounded-full"
                initial={{ width: "10%" }}
                animate={{ width: settling ? "100%" : "70%" }}
                transition={{ duration: settling ? 1 : 3, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

        {step === "settled" && (
          <motion.div key="settled" {...fadeIn} className="rounded-2xl border border-accent/20 p-8 card-elevated text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/30 shadow-[0_0_30px_rgba(239,111,46,0.15)]"
            >
              <span className="text-2xl text-accent">{"\u2713"}</span>
            </motion.div>
            <span className="font-mono text-xs text-accent">JOB SETTLED</span>
            <h3 className="mt-2 text-xl font-bold text-text-primary">Task Complete</h3>

            <div className="mt-6 rounded-xl border border-border bg-surface-0 p-5 text-left space-y-2">
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Task</span><span className="font-mono text-xs text-text-primary">{task.taskType}: {task.from} &rarr; {task.to}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Robot</span><span className="font-mono text-xs text-blue-400">{selectedRobot}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Paid to robot</span><span className="font-mono text-xs text-accent">{AVAILABLE_ROBOTS.find(r => r.id === selectedRobot)?.price} USDC</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Refunded</span><span className="font-mono text-xs text-text-primary">{(parseFloat(task.bounty) - (AVAILABLE_ROBOTS.find(r => r.id === selectedRobot)?.price ?? 0)).toFixed(2)} USDC</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Time</span><span className="font-mono text-xs text-text-primary">2m 48s / {task.sla}m</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Tx</span><MockTxHash /></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <SecondaryButton onClick={() => { setStep("task"); setSelectedRobot(null); }}>
                Post Another Task
              </SecondaryButton>
              <Link href="/dashboard" className="rounded-xl border border-border bg-surface-1 px-6 py-3 text-sm text-text-secondary hover:text-text-primary text-center transition-all btn-press">
                View Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Operator Flow ───────────────────────────────────────────────────
function OperatorFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<OperatorStep>("register");
  const [robot, setRobot] = useState<RobotForm>({ name: "G1-OMEGA", model: "Unitree G1", wallet: "" });
  const [capabilities, setCapabilities] = useState<string[]>(["CARRY"]);
  const [stakeAmount, setStakeAmount] = useState("500");
  const [offerings, setOfferings] = useState<{ type: string; price: string; sla: string }[]>([]);
  const [staking, setStaking] = useState(false);

  const steps = ["Register", "Capabilities", "Stake", "Offerings", "Live"];
  const stepIndex = ["register", "capabilities", "stake", "offerings", "live"].indexOf(step);

  const toggleCap = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleStake = () => {
    setStaking(true);
    setTimeout(() => {
      setStaking(false);
      setStep("offerings");
    }, 2500);
  };

  return (
    <motion.div {...fadeIn} className="mx-auto max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
        &larr; Back to role selection
      </button>

      <StepIndicator steps={steps} current={stepIndex} />

      <AnimatePresence mode="wait">
        {step === "register" && (
          <motion.div key="register" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              <span className="font-mono text-xs text-blue-400">REGISTER ROBOT</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">Register your robot on the ROVA registry. It will be assigned an onchain identity and can start receiving jobs.</p>

            <FormField label="Robot Name">
              <InputField value={robot.name} onChange={(v) => setRobot({ ...robot, name: v })} placeholder="e.g. G1-OMEGA" />
            </FormField>
            <FormField label="Robot Model">
              <InputField value={robot.model} onChange={(v) => setRobot({ ...robot, model: v })} placeholder="e.g. Unitree G1" />
            </FormField>
            <FormField label="Payment Wallet (ERC-4337)">
              <InputField value={robot.wallet} onChange={(v) => setRobot({ ...robot, wallet: v })} placeholder="0x... or leave blank for auto-deploy" />
            </FormField>

            <div className="mt-2 rounded-lg border border-border bg-surface-0 p-3 font-mono text-[10px] text-text-tertiary">
              Contract: ROVARegistry.sol &middot; Function: registerRobot() &middot; Network: Base Sepolia
            </div>

            <div className="mt-6">
              <PrimaryButton onClick={() => setStep("capabilities")} disabled={!robot.name}>
                Register {robot.name} &rarr;
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === "capabilities" && (
          <motion.div key="capabilities" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              <span className="font-mono text-xs text-blue-400">SET CAPABILITIES</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">What can <span className="text-blue-400">{robot.name}</span> do? Select all task types your robot can perform.</p>

            <div className="grid grid-cols-2 gap-3">
              {TASK_TYPES.map((type) => {
                const active = capabilities.includes(type);
                const descriptions: Record<string, string> = {
                  CARRY: "Pick up and deliver items between locations",
                  NAVIGATE: "Travel to waypoints for scouting or presence",
                  INSPECT: "Scan and report on inventory or conditions",
                  SORT: "Organize items into designated storage areas",
                };
                return (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleCap(type)}
                    className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                      active
                        ? "border-accent/30 bg-accent/[0.04] shadow-[0_0_15px_rgba(239,111,46,0.06)]"
                        : "border-border bg-surface-0 hover:border-border-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-mono text-xs font-bold ${active ? "text-accent" : "text-text-tertiary"}`}>{type}</span>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        active ? "border-accent bg-accent" : "border-border"
                      }`}>
                        {active && <span className="text-[8px] text-background font-bold">{"\u2713"}</span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-text-tertiary leading-relaxed">{descriptions[type]}</p>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6">
              <PrimaryButton onClick={() => setStep("stake")} disabled={capabilities.length === 0}>
                Set {capabilities.length} Capabilities &rarr;
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === "stake" && (
          <motion.div key="stake" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(239,111,46,0.5)]" />
              <span className="font-mono text-xs text-accent">STAKE ROVA</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Stake ROVA tokens to activate <span className="text-blue-400">{robot.name}</span> on the registry. Higher stake = higher trust score = more jobs won.
            </p>

            <FormField label="Stake Amount (ROVA)">
              <InputField value={stakeAmount} onChange={setStakeAmount} placeholder="500" type="number" />
            </FormField>

            <div className="rounded-xl border border-border bg-surface-0 p-4 space-y-2 mb-6">
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Min Stake</span><span className="font-mono text-xs text-text-primary">100 ROVA</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Your Stake</span><span className="font-mono text-xs text-accent">{stakeAmount} ROVA</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Trust Score</span><span className="font-mono text-xs text-accent">{parseInt(stakeAmount) >= 500 ? "High" : parseInt(stakeAmount) >= 250 ? "Medium" : "Low"}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Slash Risk</span><span className="font-mono text-xs text-yellow-400">10% of bid on failure</span></div>
            </div>

            {staking ? (
              <div className="flex items-center justify-center gap-3 py-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 rounded-full border-2 border-accent/30 border-t-accent"
                />
                <span className="font-mono text-xs text-text-secondary">Staking {stakeAmount} ROVA...</span>
              </div>
            ) : (
              <PrimaryButton onClick={handleStake} disabled={parseInt(stakeAmount) < 100}>
                Stake {stakeAmount} ROVA &rarr;
              </PrimaryButton>
            )}
          </motion.div>
        )}

        {step === "offerings" && (
          <motion.div key="offerings" {...fadeIn} className="rounded-2xl border border-border p-8 card-elevated">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(239,111,46,0.5)]" />
              <span className="font-mono text-xs text-accent">PUBLISH JOB OFFERINGS</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Set your prices and SLAs for each capability. Agents will see these when browsing the registry.
            </p>

            <div className="space-y-3 mb-6">
              {capabilities.map((cap) => {
                const existing = offerings.find((o) => o.type === cap);
                return (
                  <div key={cap} className="rounded-xl border border-border bg-surface-0 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-accent">{cap}</span>
                      {existing && <span className="font-mono text-[9px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">CONFIGURED</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-text-tertiary uppercase mb-1">Price (USDC)</label>
                        <input
                          type="number"
                          step="0.25"
                          defaultValue={existing?.price ?? "1.75"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOfferings((prev) => {
                              const filtered = prev.filter((o) => o.type !== cap);
                              return [...filtered, { type: cap, price: val, sla: existing?.sla ?? "5" }];
                            });
                          }}
                          className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-text-tertiary uppercase mb-1">SLA (Minutes)</label>
                        <input
                          type="number"
                          defaultValue={existing?.sla ?? "5"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOfferings((prev) => {
                              const filtered = prev.filter((o) => o.type !== cap);
                              return [...filtered, { type: cap, price: existing?.price ?? "1.75", sla: val }];
                            });
                          }}
                          className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent/30 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <PrimaryButton onClick={() => setStep("live")}>
              Publish {capabilities.length} Offerings &rarr; Go Live
            </PrimaryButton>
          </motion.div>
        )}

        {step === "live" && (
          <motion.div key="live" {...fadeIn} className="rounded-2xl border border-accent/20 p-8 card-elevated text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/30 shadow-[0_0_30px_rgba(239,111,46,0.15)]"
            >
              <span className="text-2xl text-accent">{"\u2713"}</span>
            </motion.div>
            <span className="font-mono text-xs text-accent">ROBOT LIVE</span>
            <h3 className="mt-2 text-xl font-bold text-text-primary">{robot.name} is Online</h3>
            <p className="mt-2 text-sm text-text-secondary">Your robot is registered, staked, and accepting jobs on the ROVA marketplace.</p>

            <div className="mt-6 rounded-xl border border-border bg-surface-0 p-5 text-left space-y-2">
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Robot</span><span className="font-mono text-xs text-blue-400">{robot.name}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Model</span><span className="font-mono text-xs text-text-primary">{robot.model}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Stake</span><span className="font-mono text-xs text-accent">{stakeAmount} ROVA</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Capabilities</span><span className="font-mono text-xs text-text-primary">{capabilities.join(", ")}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Offerings</span><span className="font-mono text-xs text-accent">{capabilities.length} published</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Status</span><span className="font-mono text-xs text-accent flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />ACCEPTING JOBS</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px] text-text-tertiary">Registry Tx</span><MockTxHash /></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <SecondaryButton onClick={() => { setStep("register"); setCapabilities(["CARRY"]); setOfferings([]); }}>
                Register Another
              </SecondaryButton>
              <Link href="/dashboard" className="rounded-xl border border-border bg-surface-1 px-6 py-3 text-sm text-text-secondary hover:text-text-primary text-center transition-all btn-press">
                Fleet Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function OnboardPage() {
  const [role, setRole] = useState<Role>(null);

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <TopBar />
      <div className="py-12 px-6">
        <AnimatePresence mode="wait">
          {role === null && <RoleSelection key="select" onSelect={setRole} />}
          {role === "agent" && <AgentFlow key="agent" onBack={() => setRole(null)} />}
          {role === "operator" && <OperatorFlow key="operator" onBack={() => setRole(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
