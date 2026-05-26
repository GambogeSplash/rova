"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { RovaMark, OperatorIcon, AgentIcon, RobotIcon, ArrowRightIcon, CheckIcon } from "@/components/Icons";
import { Eyebrow, AmberLink } from "@/components/Primitives";

type Track = "operator" | "agent" | "partner";
type Phase = "select" | "form" | "done";

const CAL_URL = "https://cal.com/rova/pilot";

const ease = [0.2, 0, 0, 1] as const;

interface OperatorForm {
  org: string;
  role: string;
  fleetSize: string;
  locations: string;
  robotMakes: string;
  currentAutomation: string;
  firstShip: string;
  budget: string;
  email: string;
  handle: string;
}

interface AgentForm {
  company: string;
  framework: string;
  workType: string;
  monthlyBudget: string;
  jobVolume: string;
  timeline: string;
  email: string;
  handle: string;
  sdkHelp: "yes" | "no" | "";
}

interface PartnerForm {
  company: string;
  role: string;
  productLine: string;
  deployments: string;
  geographies: string;
  unitsInField: string;
  unlock: string;
  email: string;
  readyForPilot: "yes" | "no" | "";
}

const EMPTY_OPERATOR: OperatorForm = {
  org: "",
  role: "",
  fleetSize: "",
  locations: "",
  robotMakes: "",
  currentAutomation: "",
  firstShip: "",
  budget: "",
  email: "",
  handle: "",
};

const EMPTY_AGENT: AgentForm = {
  company: "",
  framework: "",
  workType: "",
  monthlyBudget: "",
  jobVolume: "",
  timeline: "",
  email: "",
  handle: "",
  sdkHelp: "",
};

const EMPTY_PARTNER: PartnerForm = {
  company: "",
  role: "",
  productLine: "",
  deployments: "",
  geographies: "",
  unitsInField: "",
  unlock: "",
  email: "",
  readyForPilot: "",
};

const FLEET_SIZES = ["1-5", "6-20", "21-50", "50+"];
const FRAMEWORKS = ["Virtuals", "CrewAI", "Eliza", "Custom"];
const BUDGETS = ["< $1k", "$1k – $5k", "$5k – $20k", "$20k+"];
const TIMELINES = ["This month", "Next 60 days", "Q3+", "Exploring"];

function TopNav({ phase, onBack }: { phase: Phase; onBack: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-line-soft bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5">
            <RovaMark size={18} />
            <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-bean">
              ROVA
            </span>
          </Link>
          {phase !== "select" && (
            <button
              onClick={onBack}
              className="font-sans text-[13px] text-slate hover:text-bean transition-colors flex items-center gap-1.5"
            >
              <span aria-hidden>←</span> Switch track
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <Link href="/simulator" className="font-sans text-[13px] text-bean hover:text-amber transition-colors hidden sm:inline">
            Simulator
          </Link>
          <a
            href={CAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[13px] text-bean hover:text-amber transition-colors"
          >
            Book a call
          </a>
        </div>
      </div>
    </nav>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 transition-all duration-300 ${
            i === current
              ? "w-8 bg-amber"
              : i < current
              ? "w-4 bg-bean"
              : "w-4 bg-line-soft"
          }`}
        />
      ))}
      <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate tabular">
        Step {current + 1} / {total}
      </span>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
        {children}
      </label>
      {hint && <span className="font-mono text-[10px] text-slate/70">{hint}</span>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-line-soft bg-paper px-4 py-3 font-sans text-[14px] text-bean placeholder:text-slate/50 focus:border-amber focus:outline-none transition-colors"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none border border-line-soft bg-paper px-4 py-3 font-sans text-[14px] leading-relaxed text-bean placeholder:text-slate/50 focus:border-amber focus:outline-none transition-colors"
    />
  );
}

function OptionRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`border px-4 py-2 font-sans text-[13px] transition-colors ${
              active
                ? "border-bean bg-bean text-paper"
                : "border-line-soft bg-paper text-bean hover:border-bean"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }: { value: "yes" | "no" | ""; onChange: (v: "yes" | "no") => void }) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`border px-5 py-2 font-sans text-[13px] uppercase tracking-wide transition-colors ${
            value === v
              ? "border-bean bg-bean text-paper"
              : "border-line-soft bg-paper text-bean hover:border-bean"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function PrimaryButton({
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
      className="inline-flex items-center gap-2 bg-amber px-6 py-3 font-sans text-[14px] font-medium text-paper transition-colors hover:bg-amber-pressed disabled:cursor-not-allowed disabled:opacity-40 btn-press"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 border border-line-soft bg-paper px-5 py-3 font-sans text-[13px] text-bean transition-colors hover:border-bean"
    >
      {children}
    </button>
  );
}

/* ─── Track Selector ────────────────────────────────────────────── */

const TRACKS: Array<{
  id: Track;
  title: string;
  subtitle: string;
  ask: string;
  benefit: string;
  Icon: typeof OperatorIcon;
}> = [
  {
    id: "operator",
    title: "Operator",
    subtitle: "Run a fleet",
    ask: "You own or operate physical robots and want a second revenue stream from idle hours.",
    benefit: "Earn USDC for off-shift work. Keep operator control of every job your robots take.",
    Icon: OperatorIcon,
  },
  {
    id: "agent",
    title: "Agent",
    subtitle: "Build on Rova",
    ask: "You build agents on Virtuals, CrewAI, Eliza or custom stacks and want them to do physical work.",
    benefit: "Hire physical robots through the same ACP interface you already use for digital agents.",
    Icon: AgentIcon,
  },
  {
    id: "partner",
    title: "Robot partner",
    subtitle: "Manufacturer, integrator",
    ask: "You make robots, sell SDKs, or integrate hardware for enterprise customers.",
    benefit: "Get every robot you ship a wallet, an identity, and a marketplace from day one.",
    Icon: RobotIcon,
  },
];

function TrackSelector({ onPick }: { onPick: (t: Track) => void }) {
  return (
    <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Eyebrow>Pilot · cohort 01 · 2026</Eyebrow>
        <h1 className="mt-5 font-sans text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
          Apply to run the first
          <br />
          ACP pilots on Rova.
        </h1>
        <p className="mt-6 max-w-[58ch] font-sans text-[16px] leading-[1.55] text-bean-soft">
          We review applications weekly. Pick the track that fits and we&apos;ll
          come back inside 7 days with next steps. The highest-intent path is to
          book a call directly.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {TRACKS.map((t, i) => {
          const Icon = t.Icon;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.1 + i * 0.06 }}
              className="group flex flex-col border border-line-soft bg-cream-soft p-7 text-left transition-colors hover:border-bean focus:outline-none focus:border-bean"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center border border-line-soft bg-paper">
                  <Icon size={20} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
                  Track 0{TRACKS.indexOf(t) + 1}
                </span>
              </div>
              <h2 className="mt-6 font-sans text-[22px] font-semibold tracking-[-0.01em] text-bean">
                {t.title}
              </h2>
              <span className="mt-1 font-sans text-[13px] text-slate">{t.subtitle}</span>
              <p className="mt-5 font-sans text-[14px] leading-[1.55] text-bean-soft">
                {t.ask}
              </p>
              <div className="mt-5 border-t border-line-soft pt-5">
                <p className="font-sans text-[13px] leading-[1.55] text-bean">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber mr-2">Why</span>
                  {t.benefit}
                </p>
              </div>
              <span className="mt-7 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-amber group-hover:text-amber-pressed transition-colors">
                Apply <ArrowRightIcon size={14} />
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-14 flex flex-col items-start gap-3 border-t border-line-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-[14px] text-bean-soft">
          Already know we should talk? Skip the form.
        </p>
        <a
          href={CAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-amber hover:text-amber-pressed link-hover"
        >
          Book a 15-min intro call <ArrowRightIcon size={14} />
        </a>
      </div>
    </div>
  );
}

/* ─── Operator Form ─────────────────────────────────────────────── */

function OperatorTrack({
  onSubmit,
}: {
  onSubmit: (data: OperatorForm) => void;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OperatorForm>(EMPTY_OPERATOR);
  const update = <K extends keyof OperatorForm>(k: K, v: OperatorForm[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const step1Valid = data.org.trim() && data.role.trim() && data.fleetSize;
  const step2Valid = data.locations.trim() && data.robotMakes.trim();
  const step3Valid = data.firstShip.trim() && data.email.trim();

  return (
    <FormShell
      track="operator"
      title="Operator track"
      subtitle="Three steps. Six minutes."
      step={step}
      total={3}
    >
      {step === 0 && (
        <StepShell key="op-0" heading="Tell us about your fleet">
          <div className="space-y-6">
            <div>
              <FieldLabel>Organization / fleet name</FieldLabel>
              <TextInput
                value={data.org}
                onChange={(v) => update("org", v)}
                placeholder="e.g. Lagos Logistics Co."
              />
            </div>
            <div>
              <FieldLabel>Your role</FieldLabel>
              <TextInput
                value={data.role}
                onChange={(v) => update("role", v)}
                placeholder="Head of Ops, CTO, Founder…"
              />
            </div>
            <div>
              <FieldLabel>Fleet size today</FieldLabel>
              <OptionRow
                options={FLEET_SIZES}
                value={data.fleetSize}
                onChange={(v) => update("fleetSize", v)}
              />
            </div>
          </div>
          <FormFooter
            onBack={null}
            onNext={() => setStep(1)}
            nextDisabled={!step1Valid}
          />
        </StepShell>
      )}

      {step === 1 && (
        <StepShell key="op-1" heading="Where and what runs today">
          <div className="space-y-6">
            <div>
              <FieldLabel>Warehouse / site locations</FieldLabel>
              <TextInput
                value={data.locations}
                onChange={(v) => update("locations", v)}
                placeholder="City, region. Multiple OK."
              />
            </div>
            <div>
              <FieldLabel>Robot makes & models</FieldLabel>
              <TextInput
                value={data.robotMakes}
                onChange={(v) => update("robotMakes", v)}
                placeholder="Unitree G1, Spot, Reachy, AMRs…"
              />
            </div>
            <div>
              <FieldLabel>Current automation stack</FieldLabel>
              <TextArea
                value={data.currentAutomation}
                onChange={(v) => update("currentAutomation", v)}
                placeholder="WMS, ROS2 deployment, scheduler — whatever fits."
                rows={3}
              />
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={!step2Valid}
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell key="op-2" heading="The pilot itself">
          <div className="space-y-6">
            <div>
              <FieldLabel>What would you ship in the first 30 days?</FieldLabel>
              <TextArea
                value={data.firstShip}
                onChange={(v) => update("firstShip", v)}
                placeholder="One concrete job loop. The narrower the better."
                rows={4}
              />
            </div>
            <div>
              <FieldLabel>Anchor budget</FieldLabel>
              <OptionRow
                options={BUDGETS}
                value={data.budget}
                onChange={(v) => update("budget", v)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Contact email</FieldLabel>
                <TextInput
                  type="email"
                  value={data.email}
                  onChange={(v) => update("email", v)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <FieldLabel hint="optional">Handle (TG / X / DC)</FieldLabel>
                <TextInput
                  value={data.handle}
                  onChange={(v) => update("handle", v)}
                  placeholder="@username"
                />
              </div>
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(1)}
            onSubmit={() => onSubmit(data)}
            submitDisabled={!step3Valid}
          />
        </StepShell>
      )}
    </FormShell>
  );
}

/* ─── Agent Form ────────────────────────────────────────────────── */

function AgentTrack({ onSubmit }: { onSubmit: (data: AgentForm) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AgentForm>(EMPTY_AGENT);
  const update = <K extends keyof AgentForm>(k: K, v: AgentForm[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const step1Valid = data.company.trim() && data.framework;
  const step2Valid = data.workType.trim() && data.monthlyBudget;
  const step3Valid = data.timeline && data.email.trim() && data.sdkHelp;

  return (
    <FormShell
      track="agent"
      title="Agent builder track"
      subtitle="Three steps. Five minutes."
      step={step}
      total={3}
    >
      {step === 0 && (
        <StepShell key="ag-0" heading="What you're building">
          <div className="space-y-6">
            <div>
              <FieldLabel>Company / handle</FieldLabel>
              <TextInput
                value={data.company}
                onChange={(v) => update("company", v)}
                placeholder="Project name or your handle"
              />
            </div>
            <div>
              <FieldLabel>Agent framework</FieldLabel>
              <OptionRow
                options={FRAMEWORKS}
                value={data.framework}
                onChange={(v) => update("framework", v)}
              />
            </div>
          </div>
          <FormFooter
            onBack={null}
            onNext={() => setStep(1)}
            nextDisabled={!step1Valid}
          />
        </StepShell>
      )}

      {step === 1 && (
        <StepShell key="ag-1" heading="The physical work">
          <div className="space-y-6">
            <div>
              <FieldLabel>What kind of physical work do you need?</FieldLabel>
              <TextArea
                value={data.workType}
                onChange={(v) => update("workType", v)}
                placeholder="CARRY, NAVIGATE, INSPECT, SORT — describe the loop."
                rows={4}
              />
            </div>
            <div>
              <FieldLabel>Monthly budget for physical jobs</FieldLabel>
              <OptionRow
                options={BUDGETS}
                value={data.monthlyBudget}
                onChange={(v) => update("monthlyBudget", v)}
              />
            </div>
            <div>
              <FieldLabel>Expected job volume</FieldLabel>
              <TextInput
                value={data.jobVolume}
                onChange={(v) => update("jobVolume", v)}
                placeholder="e.g. 200 jobs/day at steady state"
              />
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={!step2Valid}
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell key="ag-2" heading="Timeline and contact">
          <div className="space-y-6">
            <div>
              <FieldLabel>Integration timeline</FieldLabel>
              <OptionRow
                options={TIMELINES}
                value={data.timeline}
                onChange={(v) => update("timeline", v)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Contact email</FieldLabel>
                <TextInput
                  type="email"
                  value={data.email}
                  onChange={(v) => update("email", v)}
                  placeholder="you@project.xyz"
                />
              </div>
              <div>
                <FieldLabel hint="optional">Handle (TG / X / DC)</FieldLabel>
                <TextInput
                  value={data.handle}
                  onChange={(v) => update("handle", v)}
                  placeholder="@username"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Do you need SDK help to integrate?</FieldLabel>
              <YesNo
                value={data.sdkHelp}
                onChange={(v) => update("sdkHelp", v)}
              />
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(1)}
            onSubmit={() => onSubmit(data)}
            submitDisabled={!step3Valid}
          />
        </StepShell>
      )}
    </FormShell>
  );
}

/* ─── Partner Form ──────────────────────────────────────────────── */

function PartnerTrack({ onSubmit }: { onSubmit: (data: PartnerForm) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<PartnerForm>(EMPTY_PARTNER);
  const update = <K extends keyof PartnerForm>(k: K, v: PartnerForm[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const step1Valid = data.company.trim() && data.role.trim() && data.productLine.trim();
  const step2Valid = data.deployments.trim() && data.geographies.trim() && data.unitsInField.trim();
  const step3Valid = data.unlock.trim() && data.email.trim() && data.readyForPilot;

  return (
    <FormShell
      track="partner"
      title="Robot partner track"
      subtitle="Three steps. Five minutes."
      step={step}
      total={3}
    >
      {step === 0 && (
        <StepShell key="pa-0" heading="Your company">
          <div className="space-y-6">
            <div>
              <FieldLabel>Company</FieldLabel>
              <TextInput
                value={data.company}
                onChange={(v) => update("company", v)}
                placeholder="Manufacturer or integrator name"
              />
            </div>
            <div>
              <FieldLabel>Your role</FieldLabel>
              <TextInput
                value={data.role}
                onChange={(v) => update("role", v)}
                placeholder="BD, Product, Founder…"
              />
            </div>
            <div>
              <FieldLabel>Robot product line</FieldLabel>
              <TextInput
                value={data.productLine}
                onChange={(v) => update("productLine", v)}
                placeholder="e.g. Quadruped AMR for industrial inspection"
              />
            </div>
          </div>
          <FormFooter
            onBack={null}
            onNext={() => setStep(1)}
            nextDisabled={!step1Valid}
          />
        </StepShell>
      )}

      {step === 1 && (
        <StepShell key="pa-1" heading="Where you ship today">
          <div className="space-y-6">
            <div>
              <FieldLabel>Live deployments</FieldLabel>
              <TextArea
                value={data.deployments}
                onChange={(v) => update("deployments", v)}
                placeholder="Named customers or industries are fine."
                rows={3}
              />
            </div>
            <div>
              <FieldLabel>Geographies</FieldLabel>
              <TextInput
                value={data.geographies}
                onChange={(v) => update("geographies", v)}
                placeholder="e.g. US, EU, MENA"
              />
            </div>
            <div>
              <FieldLabel>Units in field</FieldLabel>
              <TextInput
                value={data.unitsInField}
                onChange={(v) => update("unitsInField", v)}
                placeholder="Approximate count"
              />
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={!step2Valid}
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell key="pa-2" heading="Partnership shape">
          <div className="space-y-6">
            <div>
              <FieldLabel>What would unlock co-marketing for you?</FieldLabel>
              <TextArea
                value={data.unlock}
                onChange={(v) => update("unlock", v)}
                placeholder="A signed customer case study, a joint demo, an SDK reference…"
                rows={4}
              />
            </div>
            <div>
              <FieldLabel>Contact email</FieldLabel>
              <TextInput
                type="email"
                value={data.email}
                onChange={(v) => update("email", v)}
                placeholder="bd@company.com"
              />
            </div>
            <div>
              <FieldLabel>Ready for a joint pilot?</FieldLabel>
              <YesNo
                value={data.readyForPilot}
                onChange={(v) => update("readyForPilot", v)}
              />
            </div>
          </div>
          <FormFooter
            onBack={() => setStep(1)}
            onSubmit={() => onSubmit(data)}
            submitDisabled={!step3Valid}
          />
        </StepShell>
      )}
    </FormShell>
  );
}

/* ─── Shared form chrome ────────────────────────────────────────── */

function FormShell({
  track,
  title,
  subtitle,
  step,
  total,
  children,
}: {
  track: Track;
  title: string;
  subtitle: string;
  step: number;
  total: number;
  children: React.ReactNode;
}) {
  const TrackIcon =
    track === "operator" ? OperatorIcon : track === "agent" ? AgentIcon : RobotIcon;
  return (
    <div className="mx-auto max-w-[720px] px-5 sm:px-8 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex items-start justify-between gap-6 border-b border-line-soft pb-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center border border-line-soft bg-cream-soft">
            <TrackIcon size={20} />
          </div>
          <div>
            <Eyebrow tone="amber">{title}</Eyebrow>
            <p className="mt-2 font-sans text-[14px] text-bean-soft">{subtitle}</p>
          </div>
        </div>
        <ProgressDots total={total} current={step} />
      </motion.div>

      <div className="mt-10">
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </div>
    </div>
  );
}

function StepShell({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.32, ease }}
    >
      <h2 className="font-sans text-[26px] leading-[1.15] tracking-[-0.02em] font-semibold text-bean">
        {heading}
      </h2>
      <div className="mt-8">{children}</div>
    </motion.div>
  );
}

function FormFooter({
  onBack,
  onNext,
  onSubmit,
  nextDisabled,
  submitDisabled,
}: {
  onBack: (() => void) | null;
  onNext?: () => void;
  onSubmit?: () => void;
  nextDisabled?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-line-soft pt-6">
      <div>
        {onBack && (
          <SecondaryButton onClick={onBack}>
            <span aria-hidden>←</span> Back
          </SecondaryButton>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSubmit ? (
          <PrimaryButton onClick={onSubmit} disabled={submitDisabled}>
            Submit application <ArrowRightIcon size={14} />
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onNext} disabled={nextDisabled}>
            Continue <ArrowRightIcon size={14} />
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

/* ─── Done screen ───────────────────────────────────────────────── */

function DoneScreen({ track, onReset }: { track: Track; onReset: () => void }) {
  const label =
    track === "operator"
      ? "operator"
      : track === "agent"
      ? "agent builder"
      : "robot partner";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
      className="mx-auto max-w-[640px] px-5 sm:px-8 py-20 sm:py-28 text-center"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center border border-forest bg-paper">
        <CheckIcon size={22} />
      </div>
      <Eyebrow tone="amber" className="mt-8 justify-center">
        Application received
      </Eyebrow>
      <h1 className="mt-5 font-sans text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.02em] font-semibold text-bean">
        Got it. We&apos;ll be back inside 7 days.
      </h1>
      <p className="mt-6 font-sans text-[16px] leading-[1.55] text-bean-soft">
        Your {label} application is in. We review every Friday and reach out
        with next steps. If you&apos;d rather move faster — book a call.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={CAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-amber px-6 py-3 font-sans text-[14px] font-medium text-paper transition-colors hover:bg-amber-pressed btn-press"
        >
          Book a call now <ArrowRightIcon size={14} />
        </a>
        <SecondaryButton onClick={onReset}>Submit another track</SecondaryButton>
      </div>

      <div className="mt-14 border-t border-line-soft pt-8">
        <p className="font-sans text-[13px] text-slate">
          In the meantime —{" "}
          <AmberLink href="/simulator">see the protocol live</AmberLink>{" "}
          or{" "}
          <AmberLink href="/onboard">walk the onboarding flow</AmberLink>.
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Root ──────────────────────────────────────────────────────── */

export default function ApplyPage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [track, setTrack] = useState<Track | null>(null);

  const handlePick = (t: Track) => {
    setTrack(t);
    setPhase("form");
    if (typeof window !== "undefined") {
      console.log("[rova.apply] track_selected", { track: t });
    }
  };

  const handleSubmit = (
    data: OperatorForm | AgentForm | PartnerForm,
    t: Track
  ) => {
    if (typeof window !== "undefined") {
      console.log("[rova.apply] submitted", { track: t, data });
    }
    setPhase("done");
  };

  const handleBack = () => {
    setPhase("select");
    setTrack(null);
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav phase={phase} onBack={handleBack} />

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TrackSelector onPick={handlePick} />
          </motion.div>
        )}

        {phase === "form" && track === "operator" && (
          <motion.div
            key="form-op"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OperatorTrack onSubmit={(d) => handleSubmit(d, "operator")} />
          </motion.div>
        )}

        {phase === "form" && track === "agent" && (
          <motion.div
            key="form-ag"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AgentTrack onSubmit={(d) => handleSubmit(d, "agent")} />
          </motion.div>
        )}

        {phase === "form" && track === "partner" && (
          <motion.div
            key="form-pa"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PartnerTrack onSubmit={(d) => handleSubmit(d, "partner")} />
          </motion.div>
        )}

        {phase === "done" && track && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DoneScreen track={track} onReset={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-line-soft py-10">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <RovaMark size={14} />
            <span className="font-sans text-[12px] text-slate">ROVA Protocol</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
            ACP-native · Base · v0.1
          </span>
        </div>
      </footer>
    </div>
  );
}
