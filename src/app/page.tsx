"use client";

import {
  motion,
  useScroll,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const ease = [0.25, 0.1, 0.25, 1] as const;
const easeOut = [0, 0, 0.2, 1] as const;

// ─── Mouse-tracking glow hook ───────────────────────────────────────
function useCardGlow() {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);
  return { onMouseMove, className: "card-glow" };
}

// ─── Scroll Progress Bar ────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-accent to-orange-400"
      style={{ scaleX }}
    />
  );
}

// ─── Dot Label (● LABEL) ───────────────────────────────────────────
function DotLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[7px] w-[7px] rounded-full bg-accent" />
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
        {children}
      </span>
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const links = [
    { label: "Product", href: "#product" },
    { label: "Ecosystem", href: "#ecosystem" },
    { label: "News", href: "#news" },
    { label: "Simulator", href: "/simulator" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Docs", href: "#" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-border"
      }`}
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          </div>
          <span className="font-mono text-[14px] font-semibold tracking-tight text-text-primary">
            ROVA
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => {
            const isAnchor = l.href.startsWith("#");
            const Tag = isAnchor ? "a" : Link;
            return (
              <Tag
                key={l.label}
                href={l.href}
                className="px-3 py-1.5 font-mono text-[12px] text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                {l.label}
              </Tag>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/apply"
            className="hidden md:block font-mono text-[12px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/onboard"
            className="rounded-md border border-text-primary bg-text-primary px-3.5 py-1 font-mono text-[12px] font-medium text-background transition-all hover:bg-transparent hover:text-text-primary"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Product Section ────────────────────────────────────────────────
function ProductSection() {
  const [activeTab, setActiveTab] = useState(2);
  const glow = useCardGlow();

  const tabs = [
    {
      num: "01",
      label: "Task Posting",
      heading: "Post tasks at scale",
      desc: "Script and schedule tasks at massive scale for warehouses, logistics, and maintenance. From automated task posting to self-healing workflows, integrate robots into every phase of operations.",
      code: `run_task_post() {
  echo "Processing "$1""
  rova --task "Carry item to $1"
}

for job in queue:
  run_task_post(job)`,
    },
    {
      num: "02",
      label: "Robot Matching",
      heading: "Reputation-based matching",
      desc: "The registry matches tasks to robots based on capability, location, reputation score, and bid price. Best-fit matching ensures optimal execution every time.",
      code: `registry.matchRobot({
  capability: "CARRY",
  minReputation: 4.5,
  maxBid: "2.00 USDC"
});
// → G1-ALPHA | bid 1.75 | rep 4.9`,
    },
    {
      num: "03",
      label: "Escrow Lock",
      heading: "Trustless escrow",
      desc: "USDC bounty is locked in the ROVAMarket escrow contract. Neither party can withdraw until the verifier contract confirms delivery. Zero counterparty risk.",
      code: `market.lockEscrow({
  jobId: job.id,
  robot: "G1-ALPHA",
  amount: "1.75 USDC",
  token: "USDC"
});
// → tx: 0x3f8a...c2d1 | LOCKED`,
    },
    {
      num: "04",
      label: "Physical Execution",
      heading: "Physical proof of work",
      desc: "Robots submit GPS coordinates, timestamps, and sensor hashes as proof of physical completion. ROVAVerifier validates against SLA requirements onchain.",
      code: `robot.submitProof({
  jobId: job.id,
  gps: [37.7749, -122.4194],
  timestamp: Date.now(),
  sensorHash: "0x7c3e...a1b2"
});`,
    },
    {
      num: "05",
      label: "Settlement",
      heading: "Instant settlement",
      desc: "Verified completion triggers automatic escrow release to the robot's ERC-4337 wallet. Immutable settlement record on Base. No human in the loop.",
      code: `verifier.settle({
  jobId: job.id,
  proofHash: proof.hash
});
// → 1.7448 USDC → G1-ALPHA
// → 0.0052 USDC protocol fee`,
    },
  ];

  return (
    <section id="product" className="px-4 pt-4 sm:px-6 sm:pt-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="mx-auto max-w-[1200px] rounded-[20px] lg:rounded-[28px] border border-border bg-surface-1 overflow-hidden"
      >
        {/* ── Top: dot label + two columns ── */}
        <div className="p-6 pb-0 lg:p-10 lg:pb-0">
          <div className="mb-8">
            <DotLabel>Product</DotLabel>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: heading + subtext */}
            <div>
              <h2 className="font-mono text-[clamp(1.6rem,3.8vw,2.5rem)] font-semibold leading-[1.15] tracking-tight text-text-primary">
                Robots meet agents wherever they work.
              </h2>
              <p className="mt-4 max-w-[340px] font-mono text-[13px] leading-[1.6] text-text-tertiary">
                Robots register on the ROVA protocol.
                <br />
                Agents browse, hire, and pay — all onchain.
                <br />
                Delegate physical tasks as easily as calling an API.
              </p>
            </div>

            {/* Right: terminal window */}
            <div
              className={`overflow-hidden rounded-xl border border-border bg-surface-0 ${glow.className}`}
              onMouseMove={glow.onMouseMove}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary">
                  {tabs[activeTab].label}
                </span>
              </div>
              <div className="relative z-10 p-5 min-h-[180px]">
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease }}
                    className="font-mono text-[13px] leading-[1.7] text-text-secondary whitespace-pre"
                  >
                    {tabs[activeTab].code.split("\n").map((line, li) => (
                      <span key={li} className="block">
                        {line.includes("rova") ? (
                          <>
                            {line.split("rova").map((part, pi, arr) => (
                              <span key={pi}>
                                {part}
                                {pi < arr.length - 1 && (
                                  <span className="text-accent font-semibold">rova</span>
                                )}
                              </span>
                            ))}
                          </>
                        ) : (
                          line
                        )}
                      </span>
                    ))}
                  </motion.pre>
                </AnimatePresence>
                {/* RUN button */}
                <button className="absolute bottom-4 right-4 z-20 rounded-md border border-border bg-text-primary px-4 py-1.5 font-mono text-[11px] font-semibold text-background hover:bg-text-secondary transition-colors">
                  RUN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: tabs left + description card right ── */}
        <div className="border-t border-border mt-8 p-6 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: tab thumbnails + numbered list */}
            <div>
              {/* Visual indicator row (small colored dots like Factory.ai) */}
              <div className="mb-4 flex items-center gap-3">
                {tabs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                        i === activeTab ? "bg-accent" : "bg-surface-3"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Numbered tab list */}
              <div className="space-y-0">
                {tabs.map((tab, i) => (
                  <button
                    key={tab.num}
                    onClick={() => setActiveTab(i)}
                    className={`flex w-full items-center gap-3 px-0 py-2 text-left transition-colors duration-200`}
                  >
                    <span
                      className={`font-mono text-[12px] transition-colors ${
                        activeTab === i ? "text-accent" : "text-text-tertiary"
                      }`}
                    >
                      {tab.num}
                    </span>
                    <span
                      className={`font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${
                        activeTab === i ? "text-text-primary" : "text-text-tertiary"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: description card */}
            <div className="rounded-xl border border-border bg-surface-0 p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.15em]">
                  {tabs[activeTab].num} | {tabs[activeTab].label}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="font-mono text-[16px] font-semibold text-text-primary leading-snug">
                    {tabs[activeTab].heading}
                  </h3>
                  <p className="mt-3 font-mono text-[12px] leading-[1.65] text-text-tertiary">
                    {tabs[activeTab].desc}
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/simulator"
                      className="inline-flex items-center gap-1.5 rounded-md border border-text-primary bg-text-primary px-4 py-1.5 font-mono text-[11px] font-medium text-background transition-all hover:bg-transparent hover:text-text-primary"
                    >
                      Learn More &rarr;
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Footer bar ── */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 lg:px-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
            ROVA SDK
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            Robots at scale
          </span>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Ecosystem Section ──────────────────────────────────────────────
function EcosystemSection() {
  const glow = useCardGlow();

  return (
    <section id="ecosystem" className="px-4 py-4 sm:px-6 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="mx-auto max-w-[1200px] rounded-[20px] lg:rounded-[28px] border border-border bg-surface-1 overflow-hidden"
      >
        <div className="p-6 lg:p-10">
          {/* Dot label */}
          <div className="mb-10">
            <DotLabel>Ecosystem</DotLabel>
          </div>

          {/* Top row: heading (1 col) + 2 feature cards (2 cols) */}
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Left: large editorial heading */}
            <div>
              <h2 className="font-mono text-[clamp(1.1rem,2.2vw,1.4rem)] font-semibold leading-[1.35] tracking-tight text-text-primary">
                ROVA is designed to meet the demands of autonomous agent-to-robot
                commerce — secure, scalable, and ready to integrate with your
                existing engineering tools.
              </h2>
            </div>

            {/* Middle card: Security */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary mb-5">
                Secure at Every Level
              </h3>
              <p className="font-mono text-[14px] font-medium text-text-primary leading-snug mb-2">
                Industry-grade security and compliance
              </p>
              <p className="font-mono text-[12px] leading-[1.6] text-text-tertiary mb-4">
                ROVA uses state-of-the-art security protocols to protect your
                data and assets from any threats.
              </p>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
                Learn More About Security &rarr;
              </span>
            </div>

            {/* Right card: Fleet */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary mb-5">
                Across Your Development Stack
              </h3>
              <p className="font-mono text-[14px] font-medium text-text-primary leading-snug mb-2">
                Interface and vendor agnostic
              </p>
              <p className="font-mono text-[12px] leading-[1.6] text-text-tertiary mb-4">
                ROVA is flexible and extensible, working with any robot provider,
                any agent framework, and on any EVM chain. As your tooling
                matures, so does your ROVA deployment.
              </p>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
                Learn More About Ecosystem &rarr;
              </span>
            </div>
          </div>

          {/* Visual widget row — 3 cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* Left: Slider/fader card */}
            <div
              className={`rounded-xl border border-border bg-surface-0 p-5 min-h-[220px] flex flex-col justify-between ${glow.className}`}
              onMouseMove={glow.onMouseMove}
            >
              <div className="relative z-10">
                {/* Top dots row */}
                <div className="flex items-center gap-2 mb-6">
                  {[true, false, true, false, true, false, true].map((filled, i) => (
                    <span
                      key={i}
                      className={`h-[6px] w-[6px] rounded-full ${
                        filled ? "bg-text-primary" : "border border-text-tertiary"
                      }`}
                    />
                  ))}
                </div>
                {/* Vertical sliders/faders */}
                <div className="flex items-end gap-2 h-24 mb-4">
                  {[65, 80, 50, 90, 60, 45, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div className="w-full rounded-md bg-surface-2 h-24 relative overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06, duration: 0.6, ease: easeOut }}
                          className="absolute bottom-0 w-full rounded-md bg-accent/20"
                        />
                        {/* Knob */}
                        <motion.div
                          initial={{ bottom: 0 }}
                          whileInView={{ bottom: `${h - 6}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06, duration: 0.6, ease: easeOut }}
                          className="absolute left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-text-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Bottom dots row */}
                <div className="flex items-center gap-2">
                  {[false, false, false, false, false, false, false].map((_, i) => (
                    <span
                      key={i}
                      className="h-[5px] w-[5px] rounded-full border border-text-tertiary"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: large statement */}
            <div className="rounded-xl border border-border bg-surface-0 p-6 flex items-end min-h-[220px]">
              <h3 className="font-mono text-[clamp(1.2rem,2.5vw,1.65rem)] font-semibold leading-[1.2] tracking-tight text-text-primary">
                AI that will work with you, not replace you
              </h3>
            </div>

            {/* Right: chart card */}
            <div
              className={`rounded-xl border border-border bg-surface-0 p-5 min-h-[220px] flex flex-col justify-between ${glow.className}`}
              onMouseMove={glow.onMouseMove}
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Sparkline chart */}
                <svg viewBox="0 0 200 60" className="w-full h-16 mt-2" fill="none">
                  <polyline
                    points="0,55 15,50 30,52 50,40 65,42 80,30 100,32 115,22 135,25 150,15 170,18 185,10 200,12"
                    stroke="var(--color-accent)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <polyline
                    points="0,55 15,50 30,52 50,40 65,42 80,30 100,32 115,22 135,25 150,15 170,18 185,10 200,12 200,60 0,60"
                    fill="url(#ecoChartGrad)"
                  />
                  <defs>
                    <linearGradient id="ecoChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Multi-colored horizontal bar segments */}
                <div>
                  <div className="flex gap-0.5 h-3 rounded-sm overflow-hidden mb-3">
                    <div className="bg-accent/70 flex-[3]" />
                    <div className="bg-red-400/50 flex-[2]" />
                    <div className="bg-surface-3 flex-[1.5]" />
                    <div className="bg-accent/30 flex-[2]" />
                    <div className="bg-text-tertiary/30 flex-[1]" />
                  </div>
                  {/* Progress slider */}
                  <div className="h-1.5 w-full rounded-full bg-surface-2 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "68%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: easeOut }}
                      className="h-full rounded-full bg-surface-3"
                    />
                    <motion.div
                      initial={{ left: 0 }}
                      whileInView={{ left: "66%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: easeOut }}
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-text-primary border-2 border-surface-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── News Section ───────────────────────────────────────────────────
function NewsSection() {
  const articles = [
    {
      badges: [
        { text: "Case Study", dark: true },
        { text: "New", accent: true },
      ],
      title: "Two Weeks, One Session, Endless Packages",
      desc: "Josh Wolf, Staff Engineer at ChainGuard, tried every memory solution that the robotics tooling ecosystem could offer including escrow MCPs, memory tools...",
    },
    {
      badges: [
        { text: "Company", dark: true },
        { text: "New", accent: true },
      ],
      title: "ROVA and Virtuals Partner to Accelerate Agent-Native Robotics For Enterprises Globally",
      desc: "Additionally, Virtuals ecosystem participants in ROVA's recent early access program will have priority access.",
    },
    {
      badges: [{ text: "Engineering", dark: true }],
      title: "Signals: Toward a Self-Improving Agent",
      desc: "How we built a closed-loop system for recursive self-improvement where the agent detects its own failures and implements fixes automatically.",
    },
    {
      badges: [{ text: "Product", dark: true }],
      title: "Introducing Agent Readiness",
      desc: "A framework for measuring and improving how well your codebase handles autonomous development. Evaluate repositories across eight...",
    },
  ];

  return (
    <section id="news" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-[1200px]">
        {/* Header row */}
        <div className="flex items-start justify-between mb-10">
          <DotLabel>News</DotLabel>
          <span className="font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer uppercase tracking-[0.12em]">
            More News &rarr;
          </span>
        </div>

        {/* Grid: 2 article columns + decorative right column */}
        <div className="grid gap-x-8 lg:grid-cols-[1fr_1fr_0.8fr]">
          {/* Articles — 2×2 in the first two columns */}
          <div className="lg:col-span-2 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {articles.map((a, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: easeOut }}
                className="group cursor-pointer"
              >
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-4">
                  {a.badges.map((b, j) => (
                    <span
                      key={j}
                      className={`px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        b.accent
                          ? "bg-accent text-background"
                          : "bg-text-primary text-background"
                      }`}
                    >
                      {b.text}
                    </span>
                  ))}
                </div>
                <h3 className="font-mono text-[15px] font-semibold leading-[1.3] text-text-primary mb-3 group-hover:text-accent transition-colors">
                  {a.title}
                </h3>
                <p className="font-mono text-[12px] leading-[1.6] text-text-tertiary mb-4">
                  {a.desc}
                </p>
                <span className="font-mono text-[11px] font-semibold text-text-primary uppercase tracking-[0.1em] group-hover:text-accent transition-colors">
                  Learn More &rarr;
                </span>
              </motion.article>
            ))}
          </div>

          {/* Decorative right column */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="hidden lg:flex flex-col justify-between items-end pt-4"
          >
            {/* Decorative vertical bars */}
            <div className="flex gap-1.5 h-[180px] items-end">
              {[
                { h: "60%", color: "bg-accent/50" },
                { h: "80%", color: "bg-red-400/40" },
                { h: "45%", color: "bg-accent/30" },
                { h: "90%", color: "bg-surface-3" },
                { h: "70%", color: "bg-accent/60" },
                { h: "55%", color: "bg-red-400/30" },
                { h: "85%", color: "bg-accent/20" },
              ].map((bar, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: bar.h }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.6, ease: easeOut }}
                  className={`w-2.5 rounded-sm ${bar.color}`}
                />
              ))}
            </div>

            {/* Large decorative text */}
            <p className="font-mono text-[clamp(1.4rem,2.8vw,2.2rem)] font-semibold leading-[1.15] tracking-tight text-text-primary text-right mt-auto">
              ROVA news
              <br />& updates
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────
function CTASection() {
  const glow = useCardGlow();

  return (
    <section className="px-4 py-4 sm:px-6 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className={`mx-auto max-w-[1200px] rounded-[20px] lg:rounded-[28px] border border-border bg-surface-1 overflow-hidden ${glow.className}`}
        onMouseMove={glow.onMouseMove}
      >
        <div className="p-6 lg:p-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-16 lg:mb-24">
            <DotLabel>Build With Us</DotLabel>
            <Link
              href="/onboard"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary hover:text-text-primary transition-colors"
            >
              Start Building
            </Link>
          </div>

          {/* Icon */}
          <div className="relative z-10 mb-8">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-text-tertiary">
              <path
                d="M24 4L28 12L36 8L32 16L40 20L32 24L36 32L28 28L24 36L20 28L12 32L16 24L8 20L16 16L12 8L20 12L24 4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Heading */}
          <h2 className="relative z-10 font-mono text-[clamp(1.6rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary max-w-lg mb-8">
            Ready to build the robotics marketplace of the future?
          </h2>

          {/* Button */}
          <Link
            href="/onboard"
            className="relative z-10 inline-flex items-center gap-1.5 rounded-md border border-text-primary bg-text-primary px-4 py-2 font-mono text-[12px] font-semibold text-background transition-all hover:bg-transparent hover:text-text-primary"
          >
            Start Building &rarr;
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function Footer() {
  const columns = [
    {
      title: "Resources",
      links: [
        { label: "News", href: "#news" },
        { label: "Docs", href: "#" },
        { label: "Contact Sales", href: "/onboard" },
        { label: "Open Source", href: "https://github.com/GambogeSplash/rova" },
        { label: "Simulator", href: "/simulator" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Careers", href: "#" },
        { label: "Application", href: "/apply" },
        { label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "SLA", href: "#" },
      ],
    },
  ];

  return (
    <footer className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10">
          <DotLabel>Footer</DotLabel>
        </div>

        {/* Link columns — pushed to the right */}
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div /> {/* Spacer */}
          {columns.map((col) => (
            <div key={col.title}>
              <span className="font-mono text-[12px] font-semibold text-text-primary mb-4 block">
                {col.title}
              </span>
              <div className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="font-mono text-[12px] text-text-tertiary transition-colors hover:text-text-primary w-fit"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <a href="#" className="font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
              X (Twitter)
            </a>
            <a href="#" className="font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
              LinkedIn
            </a>
            <a href="https://github.com/GambogeSplash/rova" className="font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
              GitHub
            </a>
          </div>

          <span className="font-mono text-[11px] text-text-tertiary">
            @ROVA 2026. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="pt-12">
      <ScrollProgress />
      <Nav />
      <ProductSection />
      <EcosystemSection />
      <NewsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
