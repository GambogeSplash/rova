"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Eyebrow,
  StatusPill,
  MonoNum,
  Kbd,
  Dot,
  SectionLabel,
  AmberLink,
} from "@/components/Primitives";
import {
  RovaMark,
  OperatorIcon,
  AgentIcon,
  WalletIcon,
  RobotIcon,
  LockIcon,
  PinIcon,
  CheckIcon,
  ArrowRightIcon,
  CommandIcon,
} from "@/components/Icons";

type Door = null | "operator" | "agent";

const TASK_TYPES = ["CARRY", "SORT", "NAVIGATE", "INSPECT"] as const;
type TaskType = (typeof TASK_TYPES)[number];

const ROBOT_MODELS = [
  "Unitree G1",
  "Boston Dynamics Spot",
  "Reachy",
  "Custom ROS2",
];

interface PolicyTemplate {
  id: string;
  title: string;
  summary: string;
  autoAccept: boolean;
  floors: Record<string, number>;
  recommended?: boolean;
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "cautious",
    title: "Cautious Warehouse",
    summary:
      "Manual approval · Geofence to building · 4.0+ reputation required.",
    autoAccept: false,
    floors: { CARRY: 4.5, SORT: 3.0 },
    recommended: true,
  },
  {
    id: "fulfillment",
    title: "24/7 Fulfillment",
    summary: "Auto-accept · Round-the-clock · 3.0+ reputation · Indoor + RTK.",
    autoAccept: true,
    floors: { CARRY: 4.0, SORT: 2.75 },
  },
  {
    id: "lastmile",
    title: "Outdoor Last-Mile",
    summary: "Wider area · Daylight only · 4.5+ rep · Outdoor + rain capable.",
    autoAccept: false,
    floors: { CARRY: 6.0, SORT: 3.5 },
  },
];

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.24, ease: [0.2, 0, 0, 1] as const },
};

/* ─── Shared chrome ────────────────────────────────────────────── */

function TopBar({
  door,
  onBackToDoors,
}: {
  door: Door;
  onBackToDoors: () => void;
}) {
  return (
    <header className="border-b border-line-paper bg-paper">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-bean hover:text-amber transition-colors"
          >
            <RovaMark size={18} />
            <span className="font-sans text-[14px] font-semibold tracking-[-0.01em]">
              ROVA
            </span>
          </Link>
          <span className="h-3 w-px bg-line-soft" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate">
            Onboarding
          </span>
        </div>
        <div className="flex items-center gap-5">
          {door && (
            <button
              onClick={onBackToDoors}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
            >
              ← Switch door
            </button>
          )}
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

function ProgressDots({
  total,
  current,
  labels,
}: {
  total: number;
  current: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center border transition-colors",
                  done
                    ? "border-bean bg-bean text-paper"
                    : active
                    ? "border-bean bg-paper text-bean"
                    : "border-line-soft bg-paper text-slate",
                ].join(" ")}
                style={{ borderRadius: 999 }}
              >
                {done ? (
                  <CheckIcon size={10} />
                ) : (
                  <span className="font-mono text-[9px] tabular">{i + 1}</span>
                )}
              </span>
              <span
                className={[
                  "hidden sm:inline font-mono text-[10px] uppercase tracking-[0.14em]",
                  active ? "text-bean" : done ? "text-bean-soft" : "text-slate",
                ].join(" ")}
              >
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <span
                className={[
                  "h-px w-6 transition-colors",
                  done ? "bg-bean" : "bg-line-soft",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepHeader({
  doorLabel,
  index,
  total,
  title,
  subtitle,
}: {
  doorLabel: string;
  index: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <Eyebrow tone="amber">
        {doorLabel} · Step {index + 1} of {total}
      </Eyebrow>
      <h1 className="mt-4 font-sans text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold text-bean sm:text-[34px]">
        {title}
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.55] text-bean-soft">
        {subtitle}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
          {label}
        </span>
        {hint && (
          <span className="font-mono text-[10px] text-slate/80">{hint}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full bg-paper border border-line-soft px-3.5 py-2.5 font-mono text-[13px] text-bean placeholder:text-slate/60",
        "outline-none focus:border-bean transition-colors",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-paper border border-line-soft px-3.5 py-2.5 font-mono text-[13px] text-bean outline-none focus:border-bean transition-colors"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function AmberButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 bg-amber px-5 py-2.5 font-sans text-[14px] font-medium text-paper hover:bg-amber-pressed transition-colors btn-press disabled:bg-slate/40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 border border-line-soft bg-paper px-5 py-2.5 font-sans text-[14px] text-bean hover:border-bean transition-colors btn-press"
    >
      {children}
    </button>
  );
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border border-line-soft bg-cream-soft p-6">
      {children}
    </aside>
  );
}

function StepActions({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  backDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-line-paper pt-6">
      {onBack ? (
        <button
          onClick={onBack}
          disabled={backDisabled}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors disabled:opacity-40"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <AmberButton onClick={onNext} disabled={nextDisabled}>
        {nextLabel} <ArrowRightIcon size={14} />
      </AmberButton>
    </div>
  );
}

/* ─── Door selector ────────────────────────────────────────────── */

function DoorSelect({ onPick }: { onPick: (d: Door) => void }) {
  return (
    <motion.div {...fade} className="mx-auto max-w-[1080px] px-6 py-16">
      <div className="mx-auto max-w-[640px] text-center">
        <Eyebrow tone="amber" className="justify-center">
          Get started on Rova
        </Eyebrow>
        <h1 className="mt-5 font-sans text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
          Two doors. One marketplace.
        </h1>
        <p className="mt-5 mx-auto max-w-[52ch] text-[16px] leading-[1.55] text-bean-soft">
          Pick the side you&apos;re coming from. We&apos;ll walk you through
          everything you need to be live on Base — wallet, identity, and the
          first call you can make.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-px bg-line-soft border border-line-soft md:grid-cols-2">
        <DoorCard
          eyebrow="Door A · Fleet operator"
          icon={<OperatorIcon size={28} />}
          title="I have robots"
          tagline="Register a fleet, set a policy, and let them earn USDC off-hours."
          meta={["4 steps", "~45 min", "Stake 100 ROVA"]}
          onClick={() => onPick("operator")}
        />
        <DoorCard
          eyebrow="Door B · Agent builder"
          icon={<AgentIcon size={28} />}
          title="I want to hire robots"
          tagline="Spin up an agent identity, cap your spend, and post your first job."
          meta={["3 steps", "~15 min", "No stake required"]}
          onClick={() => onPick("agent")}
        />
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
          Already onboarded?
        </span>
        <div className="flex items-center gap-4">
          <AmberLink href="/dashboard">Go to dashboard</AmberLink>
          <span className="text-slate">·</span>
          <AmberLink href="/agent">Open agent view</AmberLink>
          <span className="text-slate">·</span>
          <AmberLink href="/robot">Open robot view</AmberLink>
        </div>
      </div>
    </motion.div>
  );
}

function DoorCard({
  eyebrow,
  icon,
  title,
  tagline,
  meta,
  onClick,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  meta: string[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-paper p-10 text-left transition-colors hover:bg-cream-soft"
    >
      <div className="flex items-center justify-between">
        <span className="text-bean">{icon}</span>
        <Eyebrow tone="slate">{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-8 font-sans text-[26px] leading-[1.1] tracking-[-0.02em] font-semibold text-bean">
        {title}
      </h2>
      <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.55] text-bean-soft">
        {tagline}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {meta.map((m) => (
          <span
            key={m}
            className="border border-line-soft bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate"
          >
            {m}
          </span>
        ))}
      </div>
      <div className="mt-10 inline-flex items-center gap-2 font-sans text-[14px] font-medium text-amber group-hover:text-amber-pressed transition-colors">
        Start <ArrowRightIcon size={14} />
      </div>
    </button>
  );
}

/* ─── Operator door ────────────────────────────────────────────── */

interface OperatorState {
  wallet: { address: string; chain: "base-sepolia" | "base"; warehouse: string };
  robot: { name: string; model: string; stake: string; location: string };
  policyTemplate: string;
  taskTypes: TaskType[];
  floors: Record<string, number>;
  autoAccept: boolean;
  offerings: Record<string, boolean>;
}

function OperatorFlow({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OperatorState>({
    wallet: { address: "", chain: "base-sepolia", warehouse: "" },
    robot: { name: "", model: ROBOT_MODELS[0], stake: "100", location: "" },
    policyTemplate: "cautious",
    taskTypes: ["CARRY", "SORT"],
    floors: { CARRY: 4.5, SORT: 3.0 },
    autoAccept: false,
    offerings: { CARRY: true, SORT: true },
  });

  const labels = ["Wallet", "Robot", "Policy", "Offerings"];
  const total = labels.length;

  const setS = <K extends keyof OperatorState>(k: K, v: OperatorState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, total));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvanceStep = (i: number) => {
    if (i === 0) return state.wallet.address.length >= 8;
    if (i === 1)
      return state.robot.name.trim().length > 0 && Number(state.robot.stake) >= 100;
    if (i === 2) return state.taskTypes.length > 0;
    if (i === 3) return Object.values(state.offerings).some(Boolean);
    return true;
  };

  return (
    <motion.div {...fade} className="mx-auto max-w-[1080px] px-6 py-12">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={onExit}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
          >
            ← Back to door select
          </button>
          <div className="mt-3 flex items-center gap-3">
            <OperatorIcon size={22} />
            <span className="font-sans text-[18px] font-semibold tracking-[-0.01em] text-bean">
              Operator onboarding
            </span>
          </div>
        </div>
        <ProgressDots total={total} current={step} labels={labels} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="op-wallet"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Operator"
              index={0}
              total={total}
              title="Connect your operator wallet"
              subtitle="This wallet owns the fleet and signs registration calls. Safe is recommended for fleets larger than five robots."
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <Field label="Wallet address" hint="0x… or ENS">
                  <TextInput
                    value={state.wallet.address}
                    onChange={(e) =>
                      setS("wallet", {
                        ...state.wallet,
                        address: e.target.value,
                      })
                    }
                    placeholder="0xA3f7…b21d"
                  />
                </Field>
                <Field label="Network">
                  <div className="flex gap-2">
                    {[
                      { id: "base-sepolia", label: "Base Sepolia" },
                      { id: "base", label: "Base mainnet" },
                    ].map((n) => {
                      const active = state.wallet.chain === n.id;
                      return (
                        <button
                          key={n.id}
                          onClick={() =>
                            setS("wallet", {
                              ...state.wallet,
                              chain: n.id as "base-sepolia" | "base",
                            })
                          }
                          className={[
                            "flex-1 border px-3.5 py-2.5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors",
                            active
                              ? "border-bean bg-bean text-paper"
                              : "border-line-soft bg-paper text-bean hover:border-bean",
                          ].join(" ")}
                        >
                          {n.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Warehouse address" hint="Optional · used for default geofence">
                  <TextInput
                    value={state.wallet.warehouse}
                    onChange={(e) =>
                      setS("wallet", {
                        ...state.wallet,
                        warehouse: e.target.value,
                      })
                    }
                    placeholder="2114 Industrial Way, Oakland CA"
                  />
                </Field>

                <div className="flex items-center gap-2 pt-2">
                  <GhostButton
                    onClick={() =>
                      setS("wallet", {
                        ...state.wallet,
                        address: "0xA3f7" + Math.random().toString(16).slice(2, 6) + "b21d",
                      })
                    }
                  >
                    <WalletIcon size={14} /> Connect wallet
                  </GhostButton>
                  <span className="font-mono text-[10px] text-slate">
                    or paste an address manually
                  </span>
                </div>
              </div>

              <Aside>
                <SectionLabel>What happens here</SectionLabel>
                <ul className="mt-4 space-y-3 text-[14px] leading-[1.55] text-bean-soft">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    Standard wallet picker — MetaMask, Safe, Rainbow, WalletConnect.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    SIWE message is signed and stored as a session cookie.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    Wrong network triggers a programmatic switch on supporting wallets.
                  </li>
                </ul>
                <div className="mt-6 flex items-center gap-2">
                  <StatusPill tone="warn">Testnet only</StatusPill>
                  <span className="font-mono text-[10px] text-slate">
                    Don&apos;t send mainnet funds in v1.
                  </span>
                </div>
              </Aside>
            </div>

            <StepActions
              onNext={next}
              nextLabel="Continue"
              nextDisabled={!canAdvanceStep(0)}
            />
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="op-robot"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Operator"
              index={1}
              total={total}
              title="Register your first robot"
              subtitle="One robot now — add the rest from the dashboard later. First-success-fast is the goal."
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <Field label="Robot name" hint="Required">
                  <TextInput
                    value={state.robot.name}
                    onChange={(e) =>
                      setS("robot", { ...state.robot, name: e.target.value })
                    }
                    placeholder="G1-ALPHA"
                  />
                </Field>
                <Field label="Model">
                  <SelectInput
                    value={state.robot.model}
                    onChange={(v) =>
                      setS("robot", { ...state.robot, model: v })
                    }
                    options={ROBOT_MODELS}
                  />
                </Field>
                <Field label="Initial stake (ROVA)" hint="Minimum 100">
                  <div className="flex items-center gap-3">
                    <TextInput
                      type="number"
                      min={100}
                      value={state.robot.stake}
                      onChange={(e) =>
                        setS("robot", {
                          ...state.robot,
                          stake: e.target.value,
                        })
                      }
                    />
                    <span className="font-mono text-[12px] text-slate whitespace-nowrap">
                      ≈ <MonoNum value={Math.round(Number(state.robot.stake) * 1.79)} unit="USD" size="sm" />
                    </span>
                  </div>
                </Field>
                <Field label="Location" hint="Lat/lng or address">
                  <div className="flex gap-2">
                    <TextInput
                      value={state.robot.location}
                      onChange={(e) =>
                        setS("robot", {
                          ...state.robot,
                          location: e.target.value,
                        })
                      }
                      placeholder="37.8044, -122.2711"
                    />
                    <GhostButton
                      onClick={() =>
                        setS("robot", {
                          ...state.robot,
                          location: "37.8044, -122.2711",
                        })
                      }
                    >
                      <PinIcon size={14} /> Locate
                    </GhostButton>
                  </div>
                </Field>
              </div>

              <Aside>
                <SectionLabel>This creates</SectionLabel>
                <ul className="mt-4 space-y-3 text-[14px] leading-[1.55] text-bean-soft">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    An ERC-4337 smart wallet to receive USDC.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    A registry entry in <span className="font-mono text-bean">ROVARegistry</span>.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 bg-bean shrink-0" />
                    A session key the SDK signs with on the robot&apos;s behalf.
                  </li>
                </ul>
                <div className="mt-6 border-t border-line-soft pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                    Stake economics
                  </span>
                  <p className="mt-2 text-[13px] leading-[1.55] text-bean-soft">
                    Slashable on failed delivery. Refundable on deactivation. You can top up
                    later from the dashboard.
                  </p>
                </div>
              </Aside>
            </div>

            <StepActions
              onBack={back}
              onNext={next}
              nextLabel="Register robot"
              nextDisabled={!canAdvanceStep(1)}
            />
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="op-policy"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Operator"
              index={2}
              total={total}
              title="Author your fleet policy"
              subtitle="Start from a template. Tune the load-bearing knobs. The full editor lives at /dashboard/policies."
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {POLICY_TEMPLATES.map((t) => {
                const active = state.policyTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setS("policyTemplate", t.id);
                      setS("autoAccept", t.autoAccept);
                      setS("floors", { ...state.floors, ...t.floors });
                    }}
                    className={[
                      "text-left border p-5 transition-colors",
                      active
                        ? "border-bean bg-cream-soft"
                        : "border-line-soft bg-paper hover:border-bean",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                        Template
                      </span>
                      {t.recommended && (
                        <StatusPill tone="ok">Recommended</StatusPill>
                      )}
                    </div>
                    <div className="mt-3 font-sans text-[16px] font-semibold tracking-[-0.01em] text-bean">
                      {t.title}
                    </div>
                    <p className="mt-2 text-[13px] leading-[1.5] text-bean-soft">
                      {t.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-10">
              <SectionLabel>Tune the policy</SectionLabel>
              <div className="mt-5 space-y-6">
                <Field label="Accept task types">
                  <div className="flex flex-wrap gap-2">
                    {TASK_TYPES.map((t) => {
                      const on = state.taskTypes.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => {
                            const nextSet = on
                              ? state.taskTypes.filter((x) => x !== t)
                              : [...state.taskTypes, t];
                            setS("taskTypes", nextSet);
                          }}
                          className={[
                            "border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                            on
                              ? "border-bean bg-bean text-paper"
                              : "border-line-soft bg-paper text-bean hover:border-bean",
                          ].join(" ")}
                        >
                          {on ? "✓ " : ""}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {state.taskTypes.map((t) => (
                  <Field
                    key={t}
                    label={`Price floor (${t})`}
                    hint={`Market floor: $${(t === "CARRY" ? 4.5 : 3.0).toFixed(2)}`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={0.25}
                        value={state.floors[t] ?? 0}
                        onChange={(e) =>
                          setS("floors", {
                            ...state.floors,
                            [t]: Number(e.target.value),
                          })
                        }
                        className="flex-1 accent-bean"
                      />
                      <MonoNum
                        value={(state.floors[t] ?? 0).toFixed(2)}
                        unit="USDC"
                        size="md"
                      />
                    </div>
                    {(state.floors[t] ?? 0) === 0 && (
                      <p className="mt-1.5 font-mono text-[10px] text-amber">
                        $0 floor accepts any offer — recommended ≥ $4.50.
                      </p>
                    )}
                  </Field>
                ))}

                <Field label="Auto-accept offers">
                  <div className="flex gap-2">
                    {[
                      { v: true, label: "On" },
                      { v: false, label: "Off · review first 1–2 weeks" },
                    ].map((o) => {
                      const active = state.autoAccept === o.v;
                      return (
                        <button
                          key={o.label}
                          onClick={() => setS("autoAccept", o.v)}
                          className={[
                            "border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                            active
                              ? "border-bean bg-bean text-paper"
                              : "border-line-soft bg-paper text-bean hover:border-bean",
                          ].join(" ")}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>

            <StepActions
              onBack={back}
              onNext={next}
              nextLabel="Save policy"
              nextDisabled={!canAdvanceStep(2)}
            />
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            key="op-offerings"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Operator"
              index={3}
              total={total}
              title="Publish your first offerings"
              subtitle="Each offering is a (taskType, price, SLA) tuple written on-chain. We publish at your floor — agents bid above."
            />

            <div className="space-y-3">
              {state.taskTypes.map((t) => {
                const on = state.offerings[t] !== false;
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setS("offerings", {
                        ...state.offerings,
                        [t]: !on,
                      })
                    }
                    className={[
                      "w-full text-left border p-5 transition-colors",
                      on
                        ? "border-bean bg-cream-soft"
                        : "border-line-soft bg-paper hover:border-bean",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <span
                          className={[
                            "flex h-5 w-5 items-center justify-center border",
                            on
                              ? "border-bean bg-bean text-paper"
                              : "border-line-soft bg-paper text-slate",
                          ].join(" ")}
                          style={{ borderRadius: 2 }}
                        >
                          {on && <CheckIcon size={11} />}
                        </span>
                        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-bean">
                          {t}
                        </span>
                        <span className="font-mono text-[12px] text-slate">
                          {state.robot.name || "G1-ALPHA"} · #1
                        </span>
                      </div>
                      <div className="flex items-center gap-5">
                        <MonoNum
                          value={(state.floors[t] ?? 0).toFixed(2)}
                          unit="USDC"
                          size="md"
                        />
                        <span className="font-mono text-[11px] text-slate">
                          30 min SLA
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-paper pt-5">
              <div className="flex items-center gap-3">
                <LockIcon size={14} />
                <span className="font-mono text-[11px] text-slate">
                  Two transactions · gas estimate ~$0.04
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate">
                Once published, offers appear in your dashboard offer-stream.
              </span>
            </div>

            <StepActions
              onBack={back}
              onNext={next}
              nextLabel="Publish offerings"
              nextDisabled={!canAdvanceStep(3)}
            />
          </motion.section>
        )}

        {step === total && (
          <motion.section
            key="op-done"
            {...fade}
            className="border border-line-paper bg-paper p-10 md:p-14 text-center"
          >
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center border border-bean text-bean" style={{ borderRadius: 999 }}>
              <CheckIcon size={20} />
            </div>
            <Eyebrow tone="amber" className="justify-center">
              Operator onboarded
            </Eyebrow>
            <h2 className="mt-4 font-sans text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold text-bean">
              {state.robot.name || "G1-ALPHA"} is live on Rova
            </h2>
            <p className="mt-4 mx-auto max-w-[52ch] text-[15px] leading-[1.55] text-bean-soft">
              First offers will land in the top bar of your dashboard. Approve a few
              manually before you flip auto-accept.
            </p>

            <div className="mt-10 mx-auto max-w-[560px] border border-line-soft bg-cream-soft px-6 py-5 text-left">
              <SectionLabel>Final state</SectionLabel>
              <ul className="mt-4 space-y-2 font-mono text-[12px] text-bean-soft">
                <li className="flex justify-between"><span className="text-slate">Robot</span><span>{state.robot.name || "G1-ALPHA"} · {state.robot.model}</span></li>
                <li className="flex justify-between"><span className="text-slate">Stake</span><MonoNum value={state.robot.stake} unit="ROVA" size="sm" /></li>
                <li className="flex justify-between"><span className="text-slate">Policy</span><span>{POLICY_TEMPLATES.find((p) => p.id === state.policyTemplate)?.title}</span></li>
                <li className="flex justify-between"><span className="text-slate">Offerings</span><span>{state.taskTypes.filter((t) => state.offerings[t] !== false).join(", ")}</span></li>
                <li className="flex justify-between"><span className="text-slate">Auto-accept</span><span>{state.autoAccept ? "On" : "Off"}</span></li>
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 bg-amber px-5 py-2.5 font-sans text-[14px] font-medium text-paper hover:bg-amber-pressed transition-colors btn-press">
                Open dashboard <ArrowRightIcon size={14} />
              </Link>
              <GhostButton onClick={() => setStep(0)}>Register another robot</GhostButton>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Agent door ───────────────────────────────────────────────── */

interface AgentState {
  agentName: string;
  wallet: string;
  dailyCap: string;
  perJobCap: string;
  copied: boolean;
}

const SDK_SNIPPET = `import { Rova } from "@rovaprotocol/sdk";

const rova = new Rova({
  agent: process.env.ROVA_AGENT_ID,
  signer: process.env.ROVA_AGENT_SIGNER,
  chain: "base-sepolia",
});

const job = await rova.jobs.post({
  taskType: "CARRY",
  bounty: "2.00",   // USDC
  sla: 5,           // minutes
  pickup: "rack-b3",
  drop:   "dispatch-bay-2",
});

await job.waitForSettlement();`;

function AgentFlow({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<AgentState>({
    agentName: "",
    wallet: "",
    dailyCap: "250",
    perJobCap: "25",
    copied: false,
  });

  const labels = ["Identity", "Spend caps", "Integrate"];
  const total = labels.length;

  const setS = <K extends keyof AgentState>(k: K, v: AgentState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, total));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvance = (i: number) => {
    if (i === 0)
      return state.agentName.trim().length > 0 && state.wallet.length >= 8;
    if (i === 1)
      return Number(state.dailyCap) > 0 && Number(state.perJobCap) > 0;
    return true;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SDK_SNIPPET);
      setS("copied", true);
      setTimeout(() => setS("copied", false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <motion.div {...fade} className="mx-auto max-w-[1080px] px-6 py-12">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={onExit}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
          >
            ← Back to door select
          </button>
          <div className="mt-3 flex items-center gap-3">
            <AgentIcon size={22} />
            <span className="font-sans text-[18px] font-semibold tracking-[-0.01em] text-bean">
              Agent builder onboarding
            </span>
          </div>
        </div>
        <ProgressDots total={total} current={step} labels={labels} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="ag-identity"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Agent"
              index={0}
              total={total}
              title="Connect wallet and name your agent"
              subtitle="Your wallet pays for jobs. The agent name appears in robot pickers and on-chain logs."
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <Field label="Agent handle" hint="lowercase, no spaces">
                  <TextInput
                    value={state.agentName}
                    onChange={(e) =>
                      setS("agentName", e.target.value.toLowerCase().replace(/\s+/g, "-"))
                    }
                    placeholder="restock-bot"
                  />
                </Field>
                <Field label="Funding wallet">
                  <div className="flex gap-2">
                    <TextInput
                      value={state.wallet}
                      onChange={(e) => setS("wallet", e.target.value)}
                      placeholder="0x… or ENS"
                    />
                    <GhostButton
                      onClick={() =>
                        setS(
                          "wallet",
                          "0xB7c2" + Math.random().toString(16).slice(2, 6) + "ef8a",
                        )
                      }
                    >
                      <WalletIcon size={14} /> Connect
                    </GhostButton>
                  </div>
                </Field>
              </div>

              <Aside>
                <SectionLabel>What an agent is</SectionLabel>
                <p className="mt-4 text-[14px] leading-[1.55] text-bean-soft">
                  An on-chain identity that posts jobs and funds escrow. Most
                  agents are Virtuals — but anything that can sign EIP-712 works:
                  a Python script, a Zapier hook, your own backend.
                </p>
                <div className="mt-6 border-t border-line-soft pt-4">
                  <SectionLabel>You&apos;ll get</SectionLabel>
                  <ul className="mt-3 space-y-2 text-[13px] text-bean-soft">
                    <li className="flex items-center gap-2">
                      <Dot tone="ok" /> An ACP-compatible agent ID
                    </li>
                    <li className="flex items-center gap-2">
                      <Dot tone="ok" /> A session signer for the SDK
                    </li>
                    <li className="flex items-center gap-2">
                      <Dot tone="ok" /> Hard-coded spend ceilings
                    </li>
                  </ul>
                </div>
              </Aside>
            </div>

            <StepActions
              onNext={next}
              nextLabel="Continue"
              nextDisabled={!canAdvance(0)}
            />
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="ag-caps"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Agent"
              index={1}
              total={total}
              title="Set spend caps"
              subtitle="Hard ceilings the SDK enforces before signing escrow. Edit these any time from /agent."
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <Field label="Daily cap" hint="USDC per 24h">
                  <div className="flex items-center gap-3">
                    <TextInput
                      type="number"
                      min={1}
                      value={state.dailyCap}
                      onChange={(e) => setS("dailyCap", e.target.value)}
                    />
                    <MonoNum value={state.dailyCap} unit="USDC" size="md" />
                  </div>
                </Field>
                <Field label="Per-job cap" hint="USDC per single bounty">
                  <div className="flex items-center gap-3">
                    <TextInput
                      type="number"
                      min={1}
                      value={state.perJobCap}
                      onChange={(e) => setS("perJobCap", e.target.value)}
                    />
                    <MonoNum value={state.perJobCap} unit="USDC" size="md" />
                  </div>
                </Field>

                <div className="border border-line-soft bg-cream-soft px-5 py-4">
                  <div className="flex items-center gap-3">
                    <LockIcon size={14} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                      Failsafe
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[12px] leading-[1.55] text-bean-soft">
                    Caps trip <span className="text-bean">before</span> the
                    transaction is signed. A runaway agent costs you nothing
                    beyond today&apos;s ceiling.
                  </p>
                </div>
              </div>

              <Aside>
                <SectionLabel>Recommended starting points</SectionLabel>
                <div className="mt-4 space-y-3">
                  {[
                    { kind: "Hobby script", daily: 50, job: 5 },
                    { kind: "Internal tool", daily: 250, job: 25 },
                    { kind: "Production agent", daily: 2000, job: 100 },
                  ].map((r) => (
                    <button
                      key={r.kind}
                      onClick={() => {
                        setS("dailyCap", String(r.daily));
                        setS("perJobCap", String(r.job));
                      }}
                      className="w-full flex items-center justify-between border border-line-soft bg-paper px-4 py-3 text-left hover:border-bean transition-colors"
                    >
                      <span className="font-sans text-[13px] text-bean">
                        {r.kind}
                      </span>
                      <span className="font-mono text-[11px] text-slate">
                        <MonoNum value={r.daily} unit="/d" size="sm" /> ·{" "}
                        <MonoNum value={r.job} unit="/job" size="sm" />
                      </span>
                    </button>
                  ))}
                </div>
              </Aside>
            </div>

            <StepActions
              onBack={back}
              onNext={next}
              nextLabel="Save caps"
              nextDisabled={!canAdvance(1)}
            />
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="ag-sdk"
            {...fade}
            className="border border-line-paper bg-paper p-8 md:p-10"
          >
            <StepHeader
              doorLabel="Agent"
              index={2}
              total={total}
              title="Make your first call"
              subtitle="Install the SDK and post a job — or skip the code and post manually from /agent."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.4fr,0.9fr]">
              <div>
                <div className="flex items-center justify-between border border-line-soft bg-cream-soft px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Eyebrow tone="slate">SDK · TypeScript</Eyebrow>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate">
                      pnpm add @rovaprotocol/sdk
                    </span>
                  </div>
                </div>
                <pre className="border border-line-soft border-t-0 bg-paper p-5 overflow-x-auto font-mono text-[12px] leading-[1.6] text-bean">
                  <code>{SDK_SNIPPET}</code>
                </pre>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate">
                    Copy and paste into your editor.{" "}
                    <Kbd>⌘</Kbd> <Kbd>C</Kbd> works too.
                  </span>
                  <GhostButton onClick={copy}>
                    {state.copied ? (
                      <>
                        <CheckIcon size={14} /> Copied
                      </>
                    ) : (
                      <>Copy snippet</>
                    )}
                  </GhostButton>
                </div>
              </div>

              <Aside>
                <SectionLabel>Prefer no code?</SectionLabel>
                <p className="mt-4 text-[14px] leading-[1.55] text-bean-soft">
                  The agent surface at <span className="font-mono text-bean">/agent</span> has
                  a job poster with the same payload shape. Useful for one-off
                  jobs and for testing a robot before you wire the SDK in.
                </p>
                <div className="mt-5">
                  <AmberLink href="/agent">
                    Open the agent dashboard <ArrowRightIcon size={12} />
                  </AmberLink>
                </div>
                <div className="mt-6 border-t border-line-soft pt-4">
                  <SectionLabel>Identity</SectionLabel>
                  <ul className="mt-3 space-y-2 font-mono text-[11px] text-bean-soft">
                    <li className="flex justify-between"><span className="text-slate">handle</span><span>@{state.agentName || "your-agent"}</span></li>
                    <li className="flex justify-between"><span className="text-slate">daily cap</span><span>{state.dailyCap} USDC</span></li>
                    <li className="flex justify-between"><span className="text-slate">per-job cap</span><span>{state.perJobCap} USDC</span></li>
                  </ul>
                </div>
              </Aside>
            </div>

            <StepActions
              onBack={back}
              onNext={next}
              nextLabel="Finish setup"
            />
          </motion.section>
        )}

        {step === total && (
          <motion.section
            key="ag-done"
            {...fade}
            className="border border-line-paper bg-paper p-10 md:p-14 text-center"
          >
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center border border-bean text-bean" style={{ borderRadius: 999 }}>
              <CheckIcon size={20} />
            </div>
            <Eyebrow tone="amber" className="justify-center">
              Agent onboarded
            </Eyebrow>
            <h2 className="mt-4 font-sans text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold text-bean">
              @{state.agentName || "your-agent"} is ready to post jobs
            </h2>
            <p className="mt-4 mx-auto max-w-[52ch] text-[15px] leading-[1.55] text-bean-soft">
              Post your first job from the SDK, or use the manual poster at
              <span className="font-mono text-bean"> /agent</span>. You can adjust
              spend caps any time.
            </p>

            <div className="mt-10 mx-auto max-w-[520px] border border-line-soft bg-cream-soft px-6 py-5 text-left">
              <SectionLabel>Final state</SectionLabel>
              <ul className="mt-4 space-y-2 font-mono text-[12px] text-bean-soft">
                <li className="flex justify-between"><span className="text-slate">Agent</span><span>@{state.agentName}</span></li>
                <li className="flex justify-between"><span className="text-slate">Wallet</span><span>{state.wallet}</span></li>
                <li className="flex justify-between"><span className="text-slate">Daily cap</span><MonoNum value={state.dailyCap} unit="USDC" size="sm" /></li>
                <li className="flex justify-between"><span className="text-slate">Per-job cap</span><MonoNum value={state.perJobCap} unit="USDC" size="sm" /></li>
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/agent" className="inline-flex items-center gap-2 bg-amber px-5 py-2.5 font-sans text-[14px] font-medium text-paper hover:bg-amber-pressed transition-colors btn-press">
                Post your first job <ArrowRightIcon size={14} />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 border border-line-soft bg-paper px-5 py-2.5 font-sans text-[14px] text-bean hover:border-bean transition-colors btn-press">
                Go to dashboard
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              <CommandIcon size={12} /> <span>Press ⌘K from anywhere</span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function OnboardPage() {
  const [door, setDoor] = useState<Door>(null);

  return (
    <div className="min-h-screen bg-paper text-bean">
      <TopBar door={door} onBackToDoors={() => setDoor(null)} />
      <AnimatePresence mode="wait">
        {door === null && <DoorSelect key="doors" onPick={setDoor} />}
        {door === "operator" && (
          <OperatorFlow key="operator" onExit={() => setDoor(null)} />
        )}
        {door === "agent" && (
          <AgentFlow key="agent" onExit={() => setDoor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
