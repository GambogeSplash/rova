"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { JOBS, SETTLEMENTS, getRobotById } from "@/lib/mock-data";
import {
  fmtAddress,
  fmtUSDC,
  fmtFullTime,
  fmtDuration,
  basescanUrl,
  seedRandom,
} from "@/lib/format";
import {
  Eyebrow,
  StatusPill,
  MonoNum,
  DataRow,
  Dot,
  AmberLink,
} from "@/components/Primitives";
import {
  RovaMark,
  AgentIcon,
  RobotIcon,
  OperatorIcon,
  ReceiptIcon,
  PinIcon,
  CheckIcon,
} from "@/components/Icons";

/* ROVA · /job/[id] — public receipt viewer
   The artifact every other surface deep-links to. Everything onchain. */

export default function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const decoded = decodeURIComponent(id);
  const job =
    JOBS.find((j) => j.id === decoded) ||
    JOBS.find((j) => j.id.toLowerCase() === decoded.toLowerCase()) ||
    JOBS[2]; // fallback to a settled job

  const robot = job.robotId ? getRobotById(job.robotId) : null;
  const settlement =
    SETTLEMENTS.find((s) => s.jobId === job.id) ||
    SETTLEMENTS[0];

  /* Derive deterministic mock data per job ID. */
  const rng = seedRandom(job.id);
  const gpsTrace = generateGpsTrace(rng);
  const sensorTimeline = generateSensorTimeline(rng);
  const txEvents = generateTxEvents(job, settlement, rng);

  const isSettled =
    job.status === "completed" || job.phase === "settled";
  const tone = isSettled
    ? "ok"
    : job.status === "failed"
    ? "fail"
    : job.status === "open"
    ? "live"
    : "warn";

  return (
    <main className="min-h-screen bg-paper text-bean">
      {/* ─── Top bar ─── */}
      <header className="border-b border-line-soft bg-paper sticky top-0 z-30">
        <div className="mx-auto max-w-[1240px] flex items-center justify-between px-5 sm:px-8 h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <RovaMark size={18} />
            <span className="font-sans text-[15px] font-semibold tracking-[-0.01em]">
              ROVA
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate hidden sm:inline">
              · public receipt
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href={basescanUrl(job.txHash || settlement.txHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
            >
              View on Basescan →
            </a>
            <button className="bg-bean text-paper px-4 py-2 font-sans text-[13px] font-medium hover:bg-bean-soft transition-colors btn-press">
              Share receipt
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 py-10 lg:py-14">
        {/* ─── Job header block ─── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        >
          <Eyebrow tone="slate">Job receipt</Eyebrow>
          <div className="mt-6 flex items-start justify-between flex-wrap gap-8">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="font-sans text-[clamp(2.4rem,5vw,3.6rem)] leading-none tracking-[-0.025em] font-semibold">
                  {job.id}
                </h1>
                <StatusPill tone={tone}>
                  {isSettled
                    ? "Settled"
                    : job.status === "failed"
                    ? "Failed"
                    : job.status === "open"
                    ? "Open"
                    : "In progress"}
                </StatusPill>
              </div>
              <div className="mt-3 flex items-center gap-3 font-mono text-[12px] text-slate uppercase tracking-[0.14em]">
                <span>{job.schema}</span>
                <span>·</span>
                <span>{fmtFullTime(job.createdAt)}</span>
                {job.completedAt && (
                  <>
                    <span>·</span>
                    <span>
                      {fmtDuration(
                        new Date(job.completedAt).getTime() -
                          new Date(job.createdAt).getTime()
                      )}{" "}
                      elapsed
                    </span>
                  </>
                )}
              </div>
            </div>

            {isSettled && (
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                  Robot paid
                </div>
                <div className="mt-2 font-mono text-[44px] leading-none font-semibold tabular text-forest">
                  {fmtUSDC(settlement.robotPayment)}
                  <span className="text-slate text-[20px] ml-2">USDC</span>
                </div>
                <div className="mt-2 font-mono text-[11px] text-slate">
                  + {fmtUSDC(settlement.protocolFee)} protocol fee
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* ─── Spec + Participants ─── */}
        <section className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr,1fr] lg:gap-16">
          {/* Spec */}
          <div>
            <Eyebrow>Task spec</Eyebrow>
            <h2 className="mt-5 font-sans text-[24px] font-semibold tracking-[-0.02em]">
              {job.taskType} · {job.from} → {job.to}
            </h2>

            <div className="mt-8 border border-line-soft">
              <DataRow label="Capability" value={job.taskType} mono />
              <DataRow label="Pickup" value={job.from} />
              <DataRow label="Delivery" value={job.to} />
              <DataRow
                label="Pickup coords"
                value={`[${job.fromCoords[0]}, ${job.fromCoords[1]}]`}
                mono
              />
              <DataRow
                label="Delivery coords"
                value={`[${job.toCoords[0]}, ${job.toCoords[1]}]`}
                mono
              />
              <DataRow label="Bounty" value={`${fmtUSDC(job.bounty)} USDC`} mono />
              {job.bid !== null && (
                <DataRow
                  label="Accepted bid"
                  value={`${fmtUSDC(job.bid)} USDC`}
                  mono
                />
              )}
              <DataRow label="SLA" value={`${job.slaMinutes} minutes`} mono />
              <DataRow label="Schema" value={job.schema} mono />
            </div>
          </div>

          {/* Participants */}
          <div>
            <Eyebrow>Participants</Eyebrow>
            <div className="mt-5 space-y-3">
              <ParticipantCard
                role="Client"
                title={job.client}
                subtitle="Virtuals agent"
                address={job.clientAddress}
                Icon={AgentIcon}
              />
              {robot && (
                <ParticipantCard
                  role="Provider"
                  title={robot.name}
                  subtitle={`${robot.model} · rep ${robot.reputation.toFixed(2)}`}
                  address={robot.wallet}
                  Icon={RobotIcon}
                />
              )}
              <ParticipantCard
                role="Operator"
                title="depot.lagos.eth"
                subtitle="Fleet lead · 6 robots"
                address="0x742d3F1a"
                Icon={OperatorIcon}
              />
            </div>
          </div>
        </section>

        {/* ─── GPS trace ─── */}
        {isSettled && (
          <section className="mt-20">
            <Eyebrow>GPS trace</Eyebrow>
            <h2 className="mt-5 font-sans text-[28px] font-semibold tracking-[-0.02em]">
              Where the robot went.
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.55] text-bean-soft">
              {gpsTrace.length} pings streamed from the robot over{" "}
              {fmtDuration(
                new Date(job.completedAt!).getTime() -
                  new Date(job.createdAt).getTime()
              )}
              . Final ping is the proof submission point.
            </p>

            <div className="mt-8 border border-line-soft bg-cream-soft p-6 md:p-10">
              <GpsTraceMap
                trace={gpsTrace}
                from={job.from}
                to={job.to}
                isFailed={job.status === "failed"}
              />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-line-soft border border-line-soft">
                <MiniStat label="Pings" value={String(gpsTrace.length)} />
                <MiniStat label="Distance" value="86 m" />
                <MiniStat label="Top speed" value="1.4 m/s" />
                <MiniStat label="Drift" value="±0.3 m" />
              </div>
            </div>
          </section>
        )}

        {/* ─── Sensor timeline ─── */}
        {isSettled && (
          <section className="mt-20">
            <Eyebrow>Sensor timeline</Eyebrow>
            <h2 className="mt-5 font-sans text-[28px] font-semibold tracking-[-0.02em]">
              What the robot felt.
            </h2>
            <div className="mt-8 border border-line-soft bg-paper">
              <SensorTimeline events={sensorTimeline} />
            </div>
          </section>
        )}

        {/* ─── Onchain events ─── */}
        <section className="mt-20">
          <Eyebrow>Onchain events</Eyebrow>
          <h2 className="mt-5 font-sans text-[28px] font-semibold tracking-[-0.02em]">
            Every step on Base Sepolia.
          </h2>

          <div className="mt-8 border border-line-soft">
            <div className="grid grid-cols-[24px,140px,1fr,180px,24px] gap-3 border-b border-line-soft bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
              <span />
              <span>Event</span>
              <span>Detail</span>
              <span>Tx hash</span>
              <span />
            </div>
            {txEvents.map((e, i) => (
              <div
                key={i}
                className="grid grid-cols-[24px,140px,1fr,180px,24px] gap-3 px-5 py-4 border-b border-line-soft last:border-b-0 hover:bg-cream-soft transition-colors items-center"
              >
                <span className="flex items-center justify-center">
                  {e.ok ? (
                    <CheckIcon size={14} className="text-forest" />
                  ) : (
                    <Dot tone="warn" />
                  )}
                </span>
                <span className="font-mono text-[12px] text-bean uppercase tracking-[0.12em]">
                  {e.event}
                </span>
                <span className="font-sans text-[13.5px] text-bean-soft">
                  {e.detail}
                </span>
                <a
                  href={basescanUrl(e.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[12px] text-amber hover:text-amber-pressed tabular link-hover"
                >
                  {fmtAddress(e.hash, 8, 6)}
                </a>
                <span className="font-mono text-[10px] text-slate tabular">
                  {e.time}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Settlement breakdown ─── */}
        {isSettled && (
          <section className="mt-20">
            <Eyebrow>Settlement</Eyebrow>
            <h2 className="mt-5 font-sans text-[28px] font-semibold tracking-[-0.02em]">
              How the bounty split.
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-px bg-line-soft md:grid-cols-4 border border-line-soft">
              <BreakdownCell
                label="Bounty posted"
                value={fmtUSDC(job.bounty)}
                unit="USDC"
              />
              <BreakdownCell
                label="Refund to client"
                value={fmtUSDC(settlement.refund)}
                unit="USDC"
                hint="bounty - bid"
              />
              <BreakdownCell
                label="Protocol fee"
                value={fmtUSDC(settlement.protocolFee)}
                unit="USDC"
                hint="0.3%"
              />
              <BreakdownCell
                label="To robot wallet"
                value={fmtUSDC(settlement.robotPayment)}
                unit="USDC"
                tone="forest"
              />
            </div>

            <div className="mt-4 font-mono text-[11px] text-slate">
              Recipient: {robot?.wallet} · Settled on {settlement.chain} ·{" "}
              <a
                href={basescanUrl(settlement.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-amber hover:text-amber-pressed link-hover"
              >
                {fmtAddress(settlement.txHash, 8, 6)}
              </a>
            </div>
          </section>
        )}

        {/* ─── Footer rail ─── */}
        <footer className="mt-24 border-t border-line-soft pt-8 flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <ReceiptIcon size={14} className="text-slate" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
              Public receipt · This URL is permanent
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
            >
              Operator dashboard
            </Link>
            <Link
              href="/simulator"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate hover:text-bean transition-colors"
            >
              Simulator
            </Link>
            <AmberLink href={basescanUrl(job.txHash || settlement.txHash)}>
              Basescan →
            </AmberLink>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ─── Subcomponents ─────────────────────────────────────── */

function ParticipantCard({
  role,
  title,
  subtitle,
  address,
  Icon,
}: {
  role: string;
  title: string;
  subtitle: string;
  address: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="border border-line-soft p-5 hover:bg-cream-soft transition-colors">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
        {role}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <Icon size={20} className="text-bean mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-sans text-[16px] font-semibold tracking-[-0.01em] text-bean truncate">
            {title}
          </div>
          <div className="mt-1 font-sans text-[12.5px] text-slate truncate">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-line-soft font-mono text-[11px] tabular text-bean-soft">
        {fmtAddress(address, 10, 6)}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-4 py-4">
      <div className="font-mono text-[20px] font-semibold tracking-[-0.02em] tabular text-bean leading-none">
        {value}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
        {label}
      </div>
    </div>
  );
}

function BreakdownCell({
  label,
  value,
  unit,
  hint,
  tone = "bean",
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  tone?: "bean" | "forest";
}) {
  return (
    <div className="bg-paper p-6 md:p-8">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
        {label}
      </div>
      <div
        className={`mt-3 font-mono text-[28px] font-semibold tracking-[-0.02em] tabular ${
          tone === "forest" ? "text-forest" : "text-bean"
        }`}
      >
        {value}
        <span className="text-slate text-[14px] ml-1.5">{unit}</span>
      </div>
      {hint && (
        <div className="mt-2 font-mono text-[10px] text-slate">{hint}</div>
      )}
    </div>
  );
}

/* ─── GPS Trace Map ─── */
function GpsTraceMap({
  trace,
  from,
  to,
  isFailed,
}: {
  trace: Array<{ x: number; y: number; t: number }>;
  from: string;
  to: string;
  isFailed: boolean;
}) {
  const pathD = trace
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const finalPoint = trace[trace.length - 1];

  return (
    <svg
      viewBox="0 0 480 280"
      className="w-full h-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {/* Warehouse outline */}
      <rect x="10" y="10" width="460" height="260" stroke="#270903" />
      {/* Aisle lines */}
      <path d="M10 100 L470 100 M10 190 L470 190" stroke="#e8dcc9" />
      {/* Shelves */}
      {[50, 130, 210, 290, 370].map((x) => (
        <rect
          key={`a-${x}`}
          x={x}
          y="30"
          width="50"
          height="50"
          stroke="#270903"
          fill="#fcebde"
        />
      ))}
      {[50, 130, 210, 290, 370].map((x) => (
        <rect
          key={`b-${x}`}
          x={x}
          y="120"
          width="50"
          height="50"
          stroke="#270903"
          fill="#fcebde"
        />
      ))}
      {/* Dispatch bays */}
      {[210, 230, 250].map((y) => (
        <rect
          key={`bay-${y}`}
          x="380"
          y={y}
          width="80"
          height="14"
          stroke="#270903"
        />
      ))}
      <text
        x="420"
        y="218"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        textAnchor="middle"
        fill="#758696"
      >
        DISPATCH
      </text>

      {/* From marker */}
      <circle
        cx={trace[0].x}
        cy={trace[0].y}
        r="6"
        fill="none"
        stroke="#b67237"
        strokeWidth="1.5"
      />
      <circle cx={trace[0].x} cy={trace[0].y} r="2" fill="#b67237" />
      <text
        x={trace[0].x + 12}
        y={trace[0].y + 4}
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        fill="#270903"
      >
        {from.toUpperCase()}
      </text>

      {/* Path */}
      <path
        d={pathD}
        stroke={isFailed ? "#b54a1f" : "#b67237"}
        strokeWidth="1.4"
        strokeDasharray="3 2"
      />

      {/* Ping dots along path */}
      {trace.map((p, i) =>
        i % 4 === 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#b67237" />
        ) : null
      )}

      {/* Final ping — proof submission */}
      <circle
        cx={finalPoint.x}
        cy={finalPoint.y}
        r="7"
        fill="none"
        stroke="#3e7448"
        strokeWidth="1.5"
      />
      <circle cx={finalPoint.x} cy={finalPoint.y} r="3" fill="#3e7448" />
      <text
        x={finalPoint.x + 12}
        y={finalPoint.y + 4}
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        fill="#270903"
      >
        ✓ PROOF · {to.toUpperCase()}
      </text>
    </svg>
  );
}

/* ─── Sensor Timeline ─── */
function SensorTimeline({
  events,
}: {
  events: Array<{ t: number; label: string; kind: string }>;
}) {
  const total = events.length;
  return (
    <div className="px-6 py-6">
      <div className="relative h-2 bg-cream-soft border-y border-line-soft">
        <div className="absolute inset-0 bg-amber/30" style={{ width: "100%" }} />
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-start gap-3 border border-line-soft px-4 py-3"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber pt-0.5 w-12 shrink-0">
              {e.kind}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-sans text-[13px] text-bean">{e.label}</div>
              <div className="mt-1 font-mono text-[10px] text-slate tabular">
                t+{e.t.toFixed(1)}s
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
        {total} events captured · 120 ms sampling
      </div>
    </div>
  );
}

/* ─── Mock data generators ─────────────────────────────── */

function generateGpsTrace(rng: () => number) {
  // From rack (around x=125, y=55) to dispatch (around x=420, y=215)
  const points: Array<{ x: number; y: number; t: number }> = [];
  const startX = 75 + rng() * 30;
  const startY = 55 + rng() * 30;
  const endX = 420 + rng() * 20;
  const endY = 218 + rng() * 8;

  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Curved path: go right first, then down
    const easedT = t * t * (3 - 2 * t);
    const wobbleX = (rng() - 0.5) * 6;
    const wobbleY = (rng() - 0.5) * 4;
    points.push({
      x: startX + (endX - startX) * easedT + wobbleX,
      y: startY + (endY - startY) * easedT + wobbleY,
      t: t * 86,
    });
  }
  return points;
}

function generateSensorTimeline(rng: () => number) {
  return [
    { t: 0.0, kind: "IMU", label: "Boot · IMU calibrated" },
    { t: 0.9, kind: "BAT", label: "Battery 87% · estimated 6h runtime" },
    { t: 2.1, kind: "CAM", label: "Stereo vision online · 60fps" },
    { t: 3.4, kind: "NAV", label: "Path planner accepted target" },
    { t: 11.2, kind: "IMU", label: "Heading change · 47° right turn" },
    { t: 24.7 + rng() * 5, kind: "CAM", label: "Object detected · pallet 7 confirmed" },
    { t: 31.5, kind: "ARM", label: "Manipulator engaged · grip stable" },
    { t: 33.8, kind: "BAT", label: "Battery 85% · payload mass 4.2 kg" },
    { t: 52.3 + rng() * 3, kind: "NAV", label: "Approaching dispatch zone" },
    { t: 78.1, kind: "ARM", label: "Manipulator released · drop confirmed" },
    { t: 82.4, kind: "GPS", label: "Final GPS ping · within geofence" },
    { t: 84.0, kind: "PRF", label: "Proof packet signed and submitted" },
  ];
}

function generateTxEvents(
  job: ReturnType<typeof JOBS.find>,
  settlement: ReturnType<typeof SETTLEMENTS.find>,
  rng: () => number
) {
  if (!job) return [];
  const baseHash = (settlement?.txHash || "0x000000").replace("…", "");
  const mk = (suffix: string) =>
    `${baseHash.slice(0, 4)}${Math.floor(rng() * 0xffff)
      .toString(16)
      .padStart(4, "0")}${suffix}${Math.floor(rng() * 0xffff)
      .toString(16)
      .padStart(4, "0")}`;
  return [
    {
      event: "Posted",
      detail: "ROVAMarket.postJob() · bounty locked",
      hash: mk("ab"),
      time: "00:00",
      ok: true,
    },
    {
      event: "Accepted",
      detail: `ROVARegistry.accept() · ${job.robotName || "—"} signed attestation`,
      hash: mk("cd"),
      time: "+1.2s",
      ok: true,
    },
    {
      event: "Locked",
      detail: "ROVAMarket.escrow() · USDC locked in contract",
      hash: mk("ef"),
      time: "+1.4s",
      ok: true,
    },
    {
      event: "Proof",
      detail: "ROVAVerifier.submitProof() · GPS + sensor hash",
      hash: mk("gh"),
      time: "+84.0s",
      ok: true,
    },
    {
      event: "Verified",
      detail: "ROVAVerifier.verify() · SLA passed",
      hash: mk("ij"),
      time: "+85.1s",
      ok: true,
    },
    {
      event: "Settled",
      detail: `ROVAMarket.settle() · ${fmtUSDC(
        settlement?.robotPayment || 0
      )} USDC → robot wallet`,
      hash: settlement?.txHash || mk("kl"),
      time: "+85.3s",
      ok: true,
    },
  ];
}
