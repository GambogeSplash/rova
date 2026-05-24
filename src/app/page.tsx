"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  WarehouseSchematic,
  ProtocolFlowSchematic,
  RovaMark,
} from "@/components/Icons";

const ease = [0.2, 0, 0, 1] as const;

/* ───────────────────────────────────────────────────────────
 * ROVA — Landing (v3, Espresso system 1:1)
 * See DESIGN-DIRECTION-V3.md
 * Section order mirrors espressosys.com:
 *  Nav · Hero · Value Prop · Features 4-col · Ecosystem 4-col ·
 *  Alternating features · Partners · Metrics ·
 *  Built-for-next centered CTA · Integration 3-card ·
 *  How it works 5-step · News 3-card · Footer
 * ─────────────────────────────────────────────────────────── */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-bean"
      style={{ scaleX }}
    />
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
      <span className="h-px w-6 bg-amber" />
      {children}
    </span>
  );
}

function StatusDot({ tone = "ok" }: { tone?: "ok" | "live" | "warn" | "idle" }) {
  const cls =
    tone === "ok"
      ? "bg-forest"
      : tone === "live"
      ? "bg-teal pulse-glow"
      : tone === "warn"
      ? "bg-wheat"
      : "bg-slate/40";
  return <span className={`inline-block h-[7px] w-[7px] ${cls}`} />;
}

/* ─── Nav ─────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Protocol", href: "#protocol" },
    { label: "Ecosystem", href: "#ecosystem" },
    { label: "Contracts", href: "#contracts" },
    { label: "Lab", href: "#lab" },
    { label: "Docs", href: "/simulator" },
  ];

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-colors duration-200 ${
        scrolled ? "border-b border-line-soft bg-paper/90 backdrop-blur" : "border-b border-transparent bg-paper"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 place-items-center border border-bean">
            <span className="h-1.5 w-1.5 bg-bean" />
          </span>
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-bean">
            ROVA
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => {
            const anchor = l.href.startsWith("#");
            const C = anchor ? "a" : Link;
            return (
              <C
                key={l.label}
                href={l.href}
                className="font-sans text-[14px] text-bean hover:text-amber transition-colors"
              >
                {l.label}
              </C>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/onboard"
            className="bg-amber text-paper px-4 py-2 font-sans text-[13px] font-medium hover:bg-amber-pressed transition-colors btn-press"
          >
            Talk to the team
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero — CENTERED single column ──────────────────────── */
function Hero() {
  return (
    <section className="pt-40 pb-32 bg-paper">
      <div className="mx-auto max-w-[920px] px-5 sm:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <Eyebrow>ACP-native · Base Sepolia · v0.1</Eyebrow>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.05 }}
          className="mt-7 font-sans text-[clamp(2.8rem,6.5vw,5.2rem)] leading-[1.02] tracking-[-0.03em] font-semibold text-bean"
        >
          The settlement layer.
          <br />
          For robots that earn.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="mt-8 mx-auto max-w-[60ch] text-[18px] leading-[1.55] text-bean-soft"
        >
          ROVA is an ACP-native task marketplace where Virtuals agents hire
          physical robots and payment settles automatically on Base.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.16 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <Link
            href="/simulator"
            className="bg-amber text-paper px-6 py-3 font-sans text-[15px] font-medium hover:bg-amber-pressed transition-colors btn-press"
          >
            See the demo
          </Link>
        </motion.div>

        {/* Schematic illustration — espresso-style line work */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.28 }}
          className="mt-20 mx-auto max-w-[820px]"
        >
          <div className="border border-line-soft bg-cream-soft p-6 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
                Warehouse · top-down · sample plan
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                3 jobs in flight
              </span>
            </div>
            <WarehouseSchematic className="text-bean w-full h-auto" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Value Proposition — centered, separate section ───── */
function ValueProp() {
  return (
    <section className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[820px] px-5 sm:px-8 text-center">
        <Eyebrow>What we built</Eyebrow>
        <h2 className="mt-7 font-sans text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
          ACP, extended to the
          <br />
          physical world.
        </h2>
        <p className="mt-7 mx-auto max-w-[58ch] text-[17px] leading-[1.55] text-bean-soft">
          Post a physical task. The robot accepts, executes, and submits proof.
          Escrow releases automatically — no human in the loop, no
          counterparty risk. The same primitive Virtuals agents already use,
          extended from API calls to physical work.
        </p>
        <div className="mt-9">
          <Link
            href="/onboard"
            className="inline-flex items-center gap-2 font-sans text-[15px] font-medium text-amber hover:text-amber-pressed transition-colors link-hover"
          >
            Get in touch <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── 4-col Features Grid (espresso numbered 01-04) ────── */
function Features() {
  const pillars = [
    {
      n: "01",
      title: "Trustless.",
      body: "USDC escrow releases on cryptographic proof of completion, not human approval.",
    },
    {
      n: "02",
      title: "Programmable.",
      body: "ACP v2 in. Any Virtuals agent can hire any registered robot, atomically.",
    },
    {
      n: "03",
      title: "Portable.",
      body: "ROS2-compatible SDK. Unitree G1 reference. Any robot platform plugs in.",
    },
    {
      n: "04",
      title: "Settled.",
      body: "ERC-4337 wallets pay robots directly. Onchain receipts live on Base.",
    },
  ];

  return (
    <section className="border-t border-line-soft py-24 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-px bg-line-soft md:grid-cols-4 border border-line-soft">
          {pillars.map((p) => (
            <div key={p.n} className="bg-paper p-8 md:p-10">
              <div className="font-mono text-[11px] tracking-[0.16em] text-amber">
                {p.n}
              </div>
              <div className="mt-6 font-sans text-[22px] font-semibold tracking-[-0.02em] text-bean">
                {p.title}
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-bean-soft">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Ecosystem 4-col Options (espresso "Join" pattern) ── */
function Ecosystem() {
  const cards = [
    {
      tag: "For agents",
      title: "Hire physical work",
      body: "Virtuals agents post tasks, deposit bounty, receive verified proof.",
      cta: "View agent surface",
      href: "/agent",
    },
    {
      tag: "For robots",
      title: "Earn onchain",
      body: "Register capabilities, accept jobs, get paid into an ERC-4337 wallet.",
      cta: "View robot surface",
      href: "/robot",
    },
    {
      tag: "For operators",
      title: "Run a fleet",
      body: "Set price floors, geofences, and policy. Monitor jobs in real time.",
      cta: "Open dashboard",
      href: "/dashboard",
    },
    {
      tag: "For labs",
      title: "Pilot with us",
      body: "Eastworld and Base Batches 003 teams: get ROVA-ready on day one.",
      cta: "Apply for a pilot",
      href: "/apply",
    },
  ];

  return (
    <section id="ecosystem" className="border-t border-line-soft py-24 bg-cream-soft">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="text-center mb-14">
          <Eyebrow>The ROVA ecosystem</Eyebrow>
          <h2 className="mt-6 font-sans text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.06] tracking-[-0.025em] font-semibold text-bean">
            Four ways to plug in.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-line-soft md:grid-cols-4 border border-line-soft">
          {cards.map((c) => (
            <Link
              key={c.tag}
              href={c.href}
              className="group bg-paper p-7 md:p-8 hover:bg-cream transition-colors"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                {c.tag}
              </div>
              <div className="mt-5 font-sans text-[20px] font-semibold tracking-[-0.02em] text-bean">
                {c.title}
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.55] text-bean-soft min-h-[3.5em]">
                {c.body}
              </p>
              <div className="mt-7 font-sans text-[13px] font-medium text-amber group-hover:text-amber-pressed inline-flex items-center gap-1.5 transition-colors">
                {c.cta} <span aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── "A better way" 4-col alternating features ────────── */
function BetterWay() {
  const items = [
    {
      n: "1",
      title: "Onchain proof",
      body: "Robots submit GPS, timestamp, and sensor hash. ROVAVerifier validates the proof and SLA on-chain. No off-chain trust required.",
    },
    {
      n: "2",
      title: "Robot wallets",
      body: "Every robot has an ERC-4337 smart wallet. Receives payment, holds balance, signs attestations. The robot is the counterparty.",
    },
    {
      n: "3",
      title: "ACP-native",
      body: "Agents hire physical robots with the same ACP v2 primitive they use to hire digital agents. Same auth, same escrow, same receipts.",
    },
    {
      n: "4",
      title: "Base finality",
      body: "Settlement happens on Base. Sub-2-second finality. Receipts are public, immutable, and queryable for the lifetime of the chain.",
    },
  ];

  return (
    <section className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="max-w-[600px] mb-16">
          <Eyebrow>Built right</Eyebrow>
          <h2 className="mt-6 font-sans text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] tracking-[-0.025em] font-semibold text-bean">
            A better way to move work onchain.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.n} className="border-t border-bean pt-6">
              <div className="font-mono text-[11px] tracking-[0.16em] text-amber">
                0{it.n}
              </div>
              <div className="mt-5 font-sans text-[22px] font-semibold tracking-[-0.02em] text-bean">
                {it.title}
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-bean-soft">
                {it.body}
              </p>
            </div>
          ))}
        </div>

        {/* Protocol flow schematic */}
        <div className="mt-20 border border-line-soft bg-cream-soft px-6 py-10 md:px-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate mb-6">
            Protocol flow · AGENT → REGISTRY → VERIFIER → WALLET
          </div>
          <ProtocolFlowSchematic className="text-bean w-full h-auto max-w-[720px] mx-auto" />
        </div>
      </div>
    </section>
  );
}

/* ─── Partners (Team / Expertise pattern) ───────────────── */
function Partners() {
  const partners = [
    "BASE",
    "VIRTUALS",
    "EASTWORLD",
    "UNITREE",
    "COINBASE",
    "ROS2",
    "FOUNDRY",
    "BASESCAN",
    "OPENZEPPELIN",
    "STACKR",
    "RETH",
    "NETWORK SCHOOL",
  ];

  return (
    <section className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[420px,1fr] lg:gap-20">
          <div>
            <Eyebrow>Proven expertise</Eyebrow>
            <h2 className="mt-6 font-sans text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.08] tracking-[-0.025em] font-semibold text-bean">
              The substrate behind ROVA.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.6] text-bean-soft">
              ROVA is built on, references, or is compatible with the stack
              already used by every serious robotics-and-onchain team —
              from ACP to ERC-4337 to ROS2.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-line-soft sm:grid-cols-3 md:grid-cols-4 border border-line-soft">
            {partners.map((p) => (
              <div
                key={p}
                className="bg-paper px-4 py-8 flex items-center justify-center font-mono text-[12px] tracking-[0.18em] text-bean hover:bg-cream-soft transition-colors"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Metrics — left text + 4-col + (live ticker as image) ─ */
function Metrics() {
  return (
    <section className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[420px,1fr] lg:gap-16 lg:items-end">
          <div>
            <Eyebrow>Live</Eyebrow>
            <h2 className="mt-6 font-sans text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.08] tracking-[-0.025em] font-semibold text-bean">
              Trusted by the agents already paying robots.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.6] text-bean-soft">
              Live on Base Sepolia. Every job settles in seconds. Every
              receipt is public.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-bean">
            {[
              { v: "127", l: "Jobs settled · 24h" },
              { v: "1.2s", l: "Median accept time" },
              { v: "218.4", l: "USDC paid · 24h" },
              { v: "0", l: "Counterparty failures" },
            ].map((s) => (
              <div
                key={s.l}
                className="border-r border-line-soft last:border-r-0 px-5 py-7"
              >
                <div className="font-mono text-[36px] leading-none font-semibold tracking-[-0.02em] tabular text-bean">
                  {s.v}
                </div>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <LiveTicker />
      </div>
    </section>
  );
}

function LiveTicker() {
  return (
    <div className="mt-16 border border-line-soft bg-paper">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
          Live feed · Base Sepolia
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-bean">
          <StatusDot tone="live" /> operational
        </span>
      </div>
      <div className="divide-y divide-line-soft">
        <JobRow id="JOB#0142" robot="G1-ALPHA" task="CARRY · Pallet 7 → Bay 3" amount="1.75" status="live" statusLabel="In transit · 1m 24s" />
        <JobRow id="JOB#0141" robot="G1-ZETA" task="INSPECT · Aisle 4 / shelf 12" amount="0.85" status="warn" statusLabel="Proof submitted" />
        <JobRow id="JOB#0140" robot="G1-IOTA" task="NAVIGATE · Dock 1 → Bay 9" amount="2.10" status="ok" statusLabel="Escrow released" />
        <JobRow id="JOB#0139" robot="G1-ALPHA" task="CARRY · Bin 22 → Bay 1" amount="1.40" status="ok" statusLabel="Escrow released" />
      </div>
    </div>
  );
}

function JobRow({
  id,
  robot,
  task,
  amount,
  status,
  statusLabel,
}: {
  id: string;
  robot: string;
  task: string;
  amount: string;
  status: "live" | "warn" | "ok";
  statusLabel: string;
}) {
  return (
    <div className="grid grid-cols-[96px,1fr,auto] items-center gap-4 px-5 py-3.5">
      <span className="font-mono text-[12px] text-bean">{id}</span>
      <div className="min-w-0">
        <div className="font-mono text-[11px] text-slate truncate">{robot}</div>
        <div className="font-sans text-[13.5px] text-bean truncate">{task}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-[13px] text-bean tabular">
          {amount} <span className="text-slate">USDC</span>
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
          <StatusDot tone={status} /> {statusLabel}
        </span>
      </div>
    </div>
  );
}

/* ─── Built for what's next — centered CTA section ─────── */
function BuiltForNext() {
  return (
    <section className="border-t border-line-soft py-32 bg-cream">
      <div className="mx-auto max-w-[820px] px-5 sm:px-8 text-center">
        <Eyebrow>Built for what's next</Eyebrow>
        <h2 className="mt-7 font-sans text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
          The economy where agents
          <br />
          and robots compound.
        </h2>
        <p className="mt-7 mx-auto max-w-[60ch] text-[17px] leading-[1.6] text-bean-soft">
          Every embodied-AI product will need a settlement layer. ROVA is the
          one Virtuals agents already speak, on the chain Coinbase already
          ships.
        </p>
        <div className="mt-10">
          <Link
            href="/onboard"
            className="bg-amber text-paper px-6 py-3 font-sans text-[15px] font-medium hover:bg-amber-pressed transition-colors btn-press"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── 3-card "How orgs work" integration paths ─────────── */
function IntegrationCards() {
  const cards = [
    {
      tag: "Pilot",
      title: "Run a 30-day pilot",
      body: "Bring your robot, your ops team, and one task. We bring the contracts, the SDK, and the wallet. Live on Sepolia in a week.",
      cta: "Apply",
      href: "/apply",
    },
    {
      tag: "Integrate",
      title: "Drop in the ROVA SDK",
      body: "ROS2-compatible Python SDK. Listen for jobs, sign attestations, submit proofs. Examples for Unitree G1 included.",
      cta: "View SDK",
      href: "/simulator",
    },
    {
      tag: "Operate",
      title: "Run a robot fleet",
      body: "Manage policy across a fleet. Set bid floors, geofence boundaries, robot whitelists. Pause or slash with one click.",
      cta: "Open dashboard",
      href: "/dashboard",
    },
  ];

  return (
    <section className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="text-center mb-14">
          <Eyebrow>Three ways to ship</Eyebrow>
          <h2 className="mt-6 font-sans text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
            Pick your integration depth.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-line-soft md:grid-cols-3 border border-line-soft">
          {cards.map((c) => (
            <div key={c.tag} className="bg-paper p-8 md:p-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                {c.tag}
              </div>
              <div className="mt-5 font-sans text-[24px] font-semibold tracking-[-0.02em] text-bean">
                {c.title}
              </div>
              <p className="mt-4 text-[14px] leading-[1.6] text-bean-soft">
                {c.body}
              </p>
              <Link
                href={c.href}
                className="mt-7 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-amber hover:text-amber-pressed transition-colors link-hover"
              >
                {c.cta} <span aria-hidden>→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How ROVA Works — 5-step centered numbered process ─ */
function Process() {
  const steps = [
    {
      n: "1",
      title: "A Virtuals agent posts a job to the ROVA registry.",
      body: "Capability, geofence, deadline, and USDC bounty are deposited into ROVAMarket escrow.",
    },
    {
      n: "2",
      title: "A registered robot listens, accepts, and signs.",
      body: "Reputation, capability match, and bid all settle onchain. The robot's ERC-4337 wallet signs an attestation.",
    },
    {
      n: "3",
      title: "The robot executes the task in the physical world.",
      body: "GPS coordinates, timestamps, and sensor hashes are streamed back through the ROVA SDK.",
    },
    {
      n: "4",
      title: "ROVAVerifier validates proof and SLA onchain.",
      body: "If proof matches, the verifier emits Completed. If SLA fails, the escrow slashes.",
    },
    {
      n: "5",
      title: "Escrow releases. Robot wallet receives funds.",
      body: "Settlement is final on Base. The receipt is public and immutable. No human in the loop.",
    },
  ];

  return (
    <section id="protocol" className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[920px] px-5 sm:px-8">
        <div className="text-center mb-16">
          <Eyebrow>How ROVA works</Eyebrow>
          <h2 className="mt-6 font-sans text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
            Posted. Accepted. Proven. Settled.
          </h2>
        </div>

        <div className="border-t border-bean">
          {steps.map((s) => (
            <div
              key={s.n}
              className="grid grid-cols-[44px,1fr] gap-6 border-b border-line-soft py-8 md:grid-cols-[60px,1fr]"
            >
              <div className="font-mono text-[12px] text-amber pt-1">0{s.n}</div>
              <div>
                <div className="font-sans text-[18px] font-medium tracking-[-0.015em] text-bean">
                  {s.title}
                </div>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-bean-soft max-w-[58ch]">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Contracts data sheet ─────────────────────────────── */
function Contracts() {
  const rows = [
    { name: "ROVARegistry", address: "0x4ab2…c731", purpose: "Robot identity, capabilities, Job Offerings." },
    { name: "ROVAMarket", address: "0x91c0…3e88", purpose: "Task lifecycle, escrow lock, settlement." },
    { name: "ROVAVerifier", address: "0x73fa…ad19", purpose: "Proof validation, SLA enforcement." },
    { name: "ROVAWallet", address: "0x2dee…8b04", purpose: "ERC-4337 smart wallets for robot payouts." },
  ];

  return (
    <section id="contracts" className="border-t border-line-soft py-28 bg-cream-soft">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <Eyebrow>Onchain</Eyebrow>
            <h2 className="mt-6 font-sans text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
              Deployed on Base Sepolia.
            </h2>
          </div>
          <a
            href="https://sepolia.basescan.org/"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-amber hover:text-amber-pressed transition-colors link-hover"
          >
            View on Basescan →
          </a>
        </div>

        <div className="border border-line-soft bg-paper">
          <div className="grid grid-cols-[1.2fr,1.4fr,2fr] border-b border-line-soft bg-cream-soft px-6 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
            <span>Contract</span>
            <span>Address</span>
            <span>Purpose</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.name}
              className="grid grid-cols-[1.2fr,1.4fr,2fr] gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 hover:bg-cream-soft transition-colors"
            >
              <span className="font-mono text-[14px] text-bean">{r.name}</span>
              <span className="font-mono text-[13px] text-bean-soft tabular">{r.address}</span>
              <span className="font-sans text-[14px] text-bean-soft">{r.purpose}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── News — 3-card grid ──────────────────────────────── */
function News() {
  const posts = [
    {
      tag: "RELEASE",
      date: "May 8, 2026",
      title: "ROVA v0.1 goes live on Base Sepolia",
      body: "Registry, Market, Verifier, and Wallet contracts deployed. First public job settled in 1.4 seconds.",
    },
    {
      tag: "SDK",
      date: "May 3, 2026",
      title: "Introducing the ROVA Python SDK",
      body: "ROS2-compatible. One command to register a robot, listen for jobs, and stream proof of work.",
    },
    {
      tag: "LAB",
      date: "Apr 26, 2026",
      title: "Working with Eastworld Labs cohorts",
      body: "Why every Base Batches 003 humanoid team should plug into ROVA before their pilot launches.",
    },
  ];

  return (
    <section id="lab" className="border-t border-line-soft py-28 bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <Eyebrow>Latest news</Eyebrow>
            <h2 className="mt-6 font-sans text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.05] tracking-[-0.025em] font-semibold text-bean">
              From the ROVA lab.
            </h2>
          </div>
          <a
            href="https://github.com/GambogeSplash/rova"
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-amber hover:text-amber-pressed transition-colors link-hover"
          >
            All releases →
          </a>
        </div>

        <div className="grid grid-cols-1 gap-px bg-line-soft md:grid-cols-3 border border-line-soft">
          {posts.map((p) => (
            <article key={p.title} className="bg-paper p-8 md:p-10">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                <span>{p.tag}</span>
                <span className="text-slate">·</span>
                <span className="text-slate">{p.date}</span>
              </div>
              <h3 className="mt-6 font-sans text-[20px] font-semibold tracking-[-0.02em] leading-[1.2] text-bean">
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.6] text-bean-soft">
                {p.body}
              </p>
              <div className="mt-8 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-amber link-hover">
                Read <span aria-hidden>→</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-line-soft bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr,1fr,1fr,1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-5 w-5 place-items-center border border-bean">
                <span className="h-1.5 w-1.5 bg-bean" />
              </span>
              <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-bean">
                ROVA
              </span>
            </Link>
            <p className="mt-5 max-w-[36ch] text-[13.5px] leading-[1.6] text-bean-soft">
              The settlement layer for robots that earn. ACP-native marketplace
              built on Base.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              ["Simulator", "/simulator"],
              ["Dashboard", "/dashboard"],
              ["Onboard", "/onboard"],
              ["Apply to lab", "/apply"],
            ]}
          />
          <FooterCol
            title="Surfaces"
            links={[
              ["Agent", "/agent"],
              ["Robot", "/robot"],
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              ["GitHub", "https://github.com/GambogeSplash/rova"],
              ["Basescan", "https://sepolia.basescan.org/"],
              ["ACP v2", "https://www.virtuals.io/"],
            ]}
          />
        </div>

        <div className="mt-14 flex items-center justify-between border-t border-line-soft pt-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
            ROVA · v0.1 · MIT
          </span>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
            <StatusDot tone="ok" /> Network operational · Base Sepolia
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
        {title}
      </div>
      <ul className="mt-5 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="font-sans text-[13.5px] text-bean hover:text-amber transition-colors link-hover"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */
export default function Page() {
  return (
    <main className="bg-paper text-bean min-h-screen">
      <ScrollProgress />
      <Nav />
      <Hero />
      <ValueProp />
      <Features />
      <Ecosystem />
      <BetterWay />
      <Partners />
      <Metrics />
      <BuiltForNext />
      <IntegrationCards />
      <Process />
      <Contracts />
      <News />
      <Footer />
    </main>
  );
}
