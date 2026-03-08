"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5 },
  }),
};

// ─── Section Components ──────────────────────────────────────────────
function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={0}
      className="border-b border-border py-12"
    >
      <div className="flex items-baseline gap-4 mb-6">
        <span className="font-mono text-[10px] text-accent/50">{number}</span>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-sm text-text-secondary leading-relaxed">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
          <span className="text-accent mt-1.5 text-[6px]">{"\u25CF"}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function TableRow({ cells, header }: { cells: string[]; header?: boolean }) {
  return (
    <div className={`grid grid-cols-${cells.length} gap-4 px-4 py-2.5 ${header ? "border-b border-border bg-surface-2" : "border-b border-border last:border-0"}`}>
      {cells.map((cell, i) => (
        <span key={i} className={`font-mono text-[11px] ${header ? "text-text-tertiary uppercase tracking-wider text-[10px]" : i === 0 ? "text-text-primary" : i === 1 ? "text-accent" : "text-text-secondary"}`}>
          {cell}
        </span>
      ))}
    </div>
  );
}

// ─── Main Application Page ───────────────────────────────────────────
export default function ApplicationPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-surface-0">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <span className="text-[14px] font-semibold text-text-primary">ROVA</span>
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="text-[13px] text-text-secondary">Base Batches 003 Application</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/simulator" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors">
              Simulator
            </Link>
            <Link href="/dashboard" className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
              <div className="h-3 w-3 rounded-full bg-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">ROVA Protocol</h1>
              <p className="text-[13px] text-text-tertiary">Application for Base Batches 003 — Embodied AI Track</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.03] px-5 py-4">
            <p className="text-sm text-text-secondary leading-relaxed italic">
              &ldquo;ROVA is the first ACP-native registry that lets Virtuals agents hire physical robots &mdash; same protocol, same escrow, same verification, extended to the physical world.&rdquo;
            </p>
          </div>
        </motion.div>

        {/* ── 01 Project Overview ─────────────────────────────────── */}
        <Section id="overview" number="01" title="Project Overview">
          <Field label="Project Name">ROVA &mdash; ACP-Native Task Marketplace for Physical Robots</Field>
          <Field label="One-Line Description">
            An onchain marketplace where Virtuals agents post physical tasks, robots execute them, and payment settles automatically through ACP escrow on Base.
          </Field>
          <Field label="Category">Embodied AI / DePIN / Agent Infrastructure</Field>
          <Field label="Status">Pre-launch &mdash; Simulator, Dashboard, and Landing Page built. Smart contracts in development for Base Sepolia deployment.</Field>
        </Section>

        {/* ── 02 Problem ──────────────────────────────────────────── */}
        <Section id="problem" number="02" title="The Problem">
          <Field label="Problem Statement">
            Virtuals agents can hire other digital agents through ACP. They cannot hire a physical robot. There is no bridge between the onchain agent economy and the physical world.
          </Field>
          <Field label="Why This Matters">
            <BulletList items={[
              "The Virtuals aGDP is entirely digital \u2014 no physical output, no real-world value creation.",
              "Robots exist that could do useful physical work (warehouse ops, delivery, inspection) but have no way to participate in the onchain economy.",
              "No protocol exists to coordinate agent-to-robot workflows with identity, permissions, and automatic payment settlement.",
              "Virtuals explicitly identifies this gap: \"coordination, identity, permissions, and payments that let robotic systems scale beyond closed deployments.\"",
            ]} />
          </Field>
        </Section>

        {/* ── 03 Solution ─────────────────────────────────────────── */}
        <Section id="solution" number="03" title="The Solution">
          <Field label="What ROVA Does">
            ROVA extends ACP into the physical world. Robots register as ACP Providers. Agents interact with them as ACP Clients. Physical delivery is verified by an onchain Evaluator. Escrow releases automatically on proof of completion.
          </Field>
          <Field label="Core Interaction">
            <div className="rounded-xl border border-border bg-surface-0 p-4 font-mono text-xs leading-relaxed space-y-1">
              <div><span className="text-text-tertiary">1.</span> <span className="text-accent">Agent</span> browses ROVA registry</div>
              <div><span className="text-text-tertiary">2.</span> <span className="text-accent">Agent</span> selects robot&apos;s Job Offering (e.g. CARRY at 1.75 USDC)</div>
              <div><span className="text-text-tertiary">3.</span> <span className="text-yellow-400">Escrow</span> locks bounty onchain</div>
              <div><span className="text-text-tertiary">4.</span> <span className="text-blue-400">Robot</span> receives job via ROVA SDK</div>
              <div><span className="text-text-tertiary">5.</span> <span className="text-blue-400">Robot</span> executes physical task</div>
              <div><span className="text-text-tertiary">6.</span> <span className="text-purple-400">Verifier</span> confirms completion (GPS + timestamp proof)</div>
              <div><span className="text-text-tertiary">7.</span> <span className="text-accent">Escrow</span> releases to robot wallet</div>
            </div>
          </Field>
          <Field label="Key Differentiator">
            From an agent&apos;s perspective, hiring a robot through ROVA looks identical to hiring a digital agent through ACP &mdash; same interface, same payment flow. Physical execution is fully abstracted.
          </Field>
        </Section>

        {/* ── 04 ACP Alignment ────────────────────────────────────── */}
        <Section id="acp" number="04" title="ACP v2 Alignment">
          <Field label="Protocol Mapping">
            <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
              <div className="grid grid-cols-3 gap-4 px-4 py-2.5 border-b border-border bg-surface-2">
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">ACP Concept</span>
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">ROVA Implementation</span>
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">Example</span>
              </div>
              {[
                ["Client (Buyer)", "Virtuals Agent", "MERCHANT-7"],
                ["Provider (Seller)", "Physical Robot", "G1-ALPHA"],
                ["Job Offering", "Robot Capability", "CARRY, NAVIGATE, INSPECT"],
                ["Job", "Onchain Task Contract", "Rack B3 \u2192 Bay 2"],
                ["Evaluator", "ROVAVerifier.sol", "GPS + timestamp proof"],
                ["Escrow", "ROVAMarket.sol", "Bounty held until verified"],
                ["Deliverable", "Completion Proof", "Sensor hash + coords"],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 px-4 py-2.5 border-b border-border last:border-0">
                  <span className="font-mono text-[11px] text-text-primary">{row[0]}</span>
                  <span className="font-mono text-[11px] text-accent">{row[1]}</span>
                  <span className="font-mono text-[11px] text-text-tertiary">{row[2]}</span>
                </div>
              ))}
            </div>
          </Field>
        </Section>

        {/* ── 05 Architecture ─────────────────────────────────────── */}
        <Section id="architecture" number="05" title="Smart Contract Architecture">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "ROVARegistry.sol",
                purpose: "Identity & Discovery",
                desc: "Robots register capabilities and publish Job Offerings. Stake ROVA tokens to list \u2014 slashed on failed delivery or SLA breach.",
              },
              {
                name: "ROVAMarket.sol",
                purpose: "Task Lifecycle & Escrow",
                desc: "ACP-compatible endpoint for task posting and job management. Holds bounty, releases on verified completion, returns on failure. ERC-4337 compatible.",
              },
              {
                name: "ROVAWallet.sol",
                purpose: "Robot Payments",
                desc: "ERC-4337 smart wallet for each robot. Programmable withdrawal rules set by fleet operator. Emergency pause capability.",
              },
              {
                name: "ROVAVerifier.sol",
                purpose: "Completion Verification",
                desc: "Validates robot proof of delivery \u2014 GPS at destination, timestamp within SLA, optional sensor hash. Triggers escrow release or penalty.",
              },
            ].map((c) => (
              <div key={c.name} className="rounded-xl border border-border bg-surface-0 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-accent">{c.name}</span>
                  <span className="text-[10px] text-text-tertiary">{c.purpose}</span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <Field label="Deployment Target">Base Sepolia (testnet) &mdash; targeting mainnet deployment post-Batches.</Field>
        </Section>

        {/* ── 06 Demo Scenario ────────────────────────────────────── */}
        <Section id="demo" number="06" title="Demo Scenario">
          <Field label="Scenario">
            A Virtuals commerce agent called MERCHANT-7 has sold a product. It needs the item physically retrieved from Rack B3 and delivered to Dispatch Bay 2.
          </Field>
          <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
            <div className="border-b border-border px-5 py-3 bg-surface-2">
              <span className="font-mono text-[10px] text-text-tertiary">LIVE DEMO FLOW</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-2">
              <div><span className="text-accent font-semibold">[MERCHANT-7]</span> <span className="text-text-secondary">POST CARRY &middot; Rack B3 {"\u2192"} Dispatch Bay 2 &middot; 2.00 USDC &middot; SLA 5min</span></div>
              <div><span className="text-text-tertiary font-semibold">[REGISTRY]</span> <span className="text-text-secondary">3 robots available: G1-ALPHA (1.75, 2min, 4.9) &middot; G1-BETA (1.90, 3min, 4.7) &middot; G1-DELTA (1.80, 2.5min, 4.8)</span></div>
              <div><span className="text-accent font-semibold">[MERCHANT-7]</span> <span className="text-text-secondary">SELECT G1-ALPHA &middot; best price + highest rep</span></div>
              <div><span className="text-yellow-400 font-semibold">[ESCROW]</span> <span className="text-text-secondary">1.75 USDC locked &middot; tx 0x3f8a...c2d1</span></div>
              <div><span className="text-blue-400 font-semibold">[G1-ALPHA]</span> <span className="text-text-secondary">Navigating {"\u2192"} Rack B3... arrived &middot; picking up... secured</span></div>
              <div><span className="text-blue-400 font-semibold">[G1-ALPHA]</span> <span className="text-text-secondary">Navigating {"\u2192"} Dispatch Bay 2... arrived &middot; delivering... complete</span></div>
              <div><span className="text-blue-400 font-semibold">[G1-ALPHA]</span> <span className="text-text-secondary">SUBMIT proof &middot; GPS (52.41, -1.51) &middot; time 3m12s &middot; hash 0x9e2b...f4a7</span></div>
              <div><span className="text-purple-400 font-semibold">[VERIFIER]</span> <span className="text-text-secondary">GPS confirmed &middot; SLA met (3m12s / 5m00s) &middot; proof valid</span></div>
              <div><span className="text-accent font-semibold">[SETTLED]</span> <span className="text-text-secondary">1.75 USDC {"\u2192"} G1-ALPHA &middot; 0.25 USDC {"\u2192"} MERCHANT-7 &middot; onchain</span></div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/simulator"
              className="rounded-lg bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              View Interactive Simulator {"\u2192"}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-surface-2 px-4 py-2 text-[13px] font-medium text-text-secondary border border-border hover:border-border-hover transition-colors"
            >
              View Fleet Dashboard {"\u2192"}
            </Link>
          </div>
        </Section>

        {/* ── 07 Why This Track ───────────────────────────────────── */}
        <Section id="fit" number="07" title="Why ROVA Fits This Track">
          <Field label="Virtuals' Stated Need">
            &ldquo;Coordination, identity, permissions, and payments that let robotic systems scale beyond closed deployments.&rdquo;
          </Field>
          <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
            {[
              ["Coordination", "ROVAMarket.sol \u2014 agent-to-robot job matching onchain"],
              ["Identity", "ROVARegistry.sol \u2014 robots registered with capabilities and reputation"],
              ["Permissions", "ROVAWallet.sol \u2014 programmable rules, emergency pause"],
              ["Payments", "ACP escrow \u2014 automatic release on verified completion"],
              ["Robot-to-agent workflows via ACP", "Native \u2014 robots are Providers, agents are Clients"],
            ].map(([req, answer], i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                <span className="text-[13px] font-semibold text-accent min-w-[200px]">{req}</span>
                <span className="text-[12px] text-text-secondary">{answer}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-accent/10 bg-accent/[0.02] px-5 py-3">
            <p className="text-sm text-text-secondary">
              ROVA is not adjacent to what Virtuals is building. It is a direct extension of ACP into the physical world &mdash; the missing coordination layer between embodied AI and the Virtuals ecosystem.
            </p>
          </div>
        </Section>

        {/* ── 08 Token ────────────────────────────────────────────── */}
        <Section id="token" number="08" title="ROVA Token">
          <Field label="Token Utility">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { fn: "Registry Staking", desc: "Robots stake ROVA to publish Job Offerings. Higher stake = higher trust = more wins. Slashed on failure." },
                { fn: "Governance", desc: "Protocol parameters \u2014 slashing %, SLA thresholds, fee rates \u2014 decided by ROVA holders." },
                { fn: "Fee Capture", desc: "0.1\u20130.3% of every settled task fee buys ROVA from market and distributes to stakers. Real yield from physical work." },
              ].map((t) => (
                <div key={t.fn} className="rounded-xl border border-border bg-surface-0 p-4">
                  <div className="text-[13px] font-semibold text-accent mb-2">{t.fn}</div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </Field>
        </Section>

        {/* ── 09 Roadmap ──────────────────────────────────────────── */}
        <Section id="roadmap" number="09" title="Roadmap & Milestones">
          <div className="rounded-xl border border-border bg-surface-0 overflow-hidden">
            {[
              ["March 7", "Simulator, Dashboard, Landing page", "COMPLETE", "text-accent"],
              ["March 8", "Application pack, Onboarding flow", "COMPLETE", "text-accent"],
              ["March 8", "Smart contracts compiled (Foundry)", "COMPLETE", "text-accent"],
              ["March 9", "Contracts deployed to Base Sepolia", "COMPLETE", "text-accent"],
              ["March 9", "Submit \u2014 Base Batches 003 Robotics Track", "TODAY", "text-yellow-400"],
            ].map(([date, milestone, status, color], i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-text-tertiary min-w-[70px]">{date}</span>
                  <span className="text-[13px] text-text-primary">{milestone}</span>
                </div>
                <span className={`font-mono text-[9px] font-semibold ${color}`}>{status}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 10 Team ─────────────────────────────────────────────── */}
        <Section id="team" number="10" title="Team">
          <Field label="Structure">Solo builder</Field>
          <Field label="Builder">
            <span className="text-accent font-semibold">GambogeSplash</span> — Full-stack engineer + smart contract developer
          </Field>
          <Field label="Background">
            Experience in prediction markets (Pythia), DeFi, and frontend engineering
          </Field>
          <Field label="GitHub">
            <a href="https://github.com/GambogeSplash" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              github.com/GambogeSplash
            </a>
          </Field>
          <Field label="Note">
            Seeking co-founders with robotics/hardware experience through Base Batches
          </Field>
        </Section>

        {/* ── 11 Links ────────────────────────────────────────────── */}
        <Section id="links" number="11" title="Links & Resources">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Landing Page", href: "/", desc: "rova.xyz \u2014 Protocol overview and waitlist" },
              { label: "Interactive Simulator", href: "/simulator", desc: "Live ACP job flow demo" },
              { label: "Fleet Dashboard", href: "/dashboard", desc: "Robot fleet management interface" },
              { label: "Interactive Demo", href: "/onboard", desc: "Guided onboarding experience" },
              { label: "GitHub", href: "https://github.com/GambogeSplash/rova", desc: "github.com/GambogeSplash/rova" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl border border-border bg-surface-0 p-4 hover:border-border-hover transition-colors block"
              >
                <div className="text-[13px] font-semibold text-accent mb-1">{link.label}</div>
                <div className="text-[12px] text-text-tertiary">{link.desc}</div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
              <div className="h-1 w-1 rounded-full bg-accent" />
            </div>
            <span className="text-[13px] text-text-tertiary">ROVA Protocol</span>
          </div>
          <p className="text-[13px] text-text-tertiary">
            Building on Base &middot; ACP v2 &middot; Embodied AI Track
          </p>
        </div>
      </div>
    </div>
  );
}
