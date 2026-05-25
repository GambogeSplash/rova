# ROADMAP

> The version arc, v0 → v6. What's in each, why this order, what we explicitly defer.

---

## Frame

Rova versions ship in capability tiers, not calendar quarters. A version is "done" when its load-bearing flows close end-to-end, not when a date arrives. The release cadence is bounded by **closing one Loop at a time** — Substrate → Surface → Settlement → Scale.

Each major version takes ~6–8 weeks of focused build. v0 → v1 is what's in the docs canon. v2 onward is hypothesis.

---

## v0 — Demo (current)

**State:** in flight. ~70% built. Live at https://rova-ashy.vercel.app.

**Goal:** Make the protocol legible. Visitors can walk the full lifecycle in browser without ever touching a real chain.

**Shipped:**
- 4 contracts deployed to Base Sepolia (`ROVARegistry`, `ROVAMarket`, `ROVAVerifier`, `ROVAWallet`)
- 8 routes: `/`, `/about`, `/apply`, `/onboard`, `/dashboard` (mocked), `/agent`, `/robot`, `/simulator`
- `/job/[id]` public receipt viewer
- `/simulator` end-to-end protocol demo with inject-faults toolbox, camera modes, multi-agent storm, inspector panel
- Spec moat: PROOF, POLICIES, STATE-MACHINE, USE-CASES, FLOWS + Wave A system docs

**Out of scope for v0:**
- Real robot integration
- Mainnet deployment
- Indexer beyond mock data
- Authentication beyond demo personas

---

## v1 — One Loop, end-to-end (next)

**Goal:** Close the full real-money Loop. One Operator, one Agent, one Robot, on Base Sepolia, with real USDC, real proof verification, real settlement.

**Critical flows (must close):**
- ONBOARDING (Operator first install — 4 steps)
- ROBOT-REGISTER (mint robot wallet, stake ROVA, publish offerings)
- AGENT-POST (post job + assign robot)
- ROBOT-EXECUTE (accept assignment, simulate execution, submit proof)
- DASHBOARD (operator's Today — incoming offers, settlements, fleet health)
- SETTLEMENT-LEDGER (where the money lands)
- ERRORS (every failure mode handled)

**What "closes the Loop" means:**
A real human (the founder) can install the Operator dashboard, register one robot (which is initially software-simulated, not a physical Unitree), have a Virtuals agent post a job, watch it match, watch proof submit, watch USDC settle to the robot's ERC-4337 wallet. End-to-end without manual intervention.

**Out of scope for v1:**
- Disputes (off-protocol in v1; on-protocol in v1.5)
- Mobile companion
- Real robot hardware (still simulated by SDK)
- Multi-warehouse Operators
- Mainnet
- ROVA token live (stake represented but not actually slashable for real value)

**Estimated effort:** 5–6 weeks. ~50 spec docs already written; remaining ~25 docs + implementation against them.

---

## v1.5 — Disputes, mobile, real robot

**Goal:** Take v1 out of the lab. Real Unitree G1 executing real jobs, with the dispute path closed and a mobile companion for Operators.

**New flows:**
- DISPUTE-RESOLUTION (on-protocol — 24h sensor pre-image window, operator/admin decision)
- AGENT-DISPUTE (the inverse — agent challenges a verified proof)
- MOBILE (phone-sized Operator triage)
- SIMULATOR-TO-REAL (deep-link from sim into real onboarding)
- Real Unitree G1 firmware integration via the ROS2 SDK

**Critical hardware milestone:** One Unitree G1 in a real warehouse, completing real CARRY jobs, with onboard proof submission. This is the demo that unlocks operator pilot conversations.

**Out of scope for v1.5:**
- Multi-warehouse fleets (still single-site)
- Token live with real slashing economics
- Cross-chain settlement
- Reachy or non-Unitree robots

**Estimated effort:** 4 weeks after v1 lands. Mostly hardware integration + dispute UX.

---

## v2 — Mainnet, ROVA token, multi-warehouse

**Goal:** Real money, real stake economics, real fleet operators with multiple sites.

**New surfaces:**
- Mainnet deployment (Base mainnet)
- ROVA token live: real staking, real slashing, real governance
- Multi-warehouse Operator surface (`ARCH/MULTI-WAREHOUSE.md`)
- Operator team multi-sig with role splits (ops-eng vs ops-finance)
- ROBOT-STAKE flow (top up, withdraw after deactivation)
- SDK-CI-CD (deploy SDK update across a fleet without taking robots offline)
- Per-task spending caps for agents
- Webhook delivery from indexer
- GraphQL API surface

**Token economics:**
- Distribution + vesting (`BIZ/TOKEN-ECONOMICS.md`)
- Governance scope: protocol fees, gpsTolerance default, dispute parameters
- Slashing parameters: % of bid, reputation impact, recovery path

**Out of scope for v2:**
- Cross-chain (Base only)
- Reachy / non-Unitree mainstream
- Insurance products
- Enterprise SLAs

**Estimated effort:** 8 weeks after v1.5. The token launch alone is 3–4 weeks of focused work.

---

## v3 — Reachy, beacons, anti-spoofing

**Goal:** Defeat the residual trust assumption (GPS spoofing). Add hardware diversity. Make the proof primitive resistant to adversarial robots.

**New primitives:**
- Beacon-anchored coordinates (operator-deployed beacons sign attestations the proof must include)
- Per-task-type sensor schemas (`PROOF.md` § v2 evolution)
- Reachy integration (Pollen Robotics + Hugging Face stack)
- Camera-attestation network (optional ML model verifies camera frame is plausibly at the GPS coords)
- Multi-prover proofs (two robots co-witness a high-value task)

**Why now:** v2 puts real money on the line. v3 hardens the proof primitive against the attacks that real money will attract.

**Estimated effort:** 8–12 weeks. Lots of cross-team coordination with hardware partners.

---

## v4 — Cross-chain, insurance

**Goal:** Settle across chains. Add a built-in insurance layer for high-value jobs.

**New surfaces:**
- Optimism + Arbitrum deployments (still primarily settling on Base)
- Cross-chain agent identity (agent on Optimism posts job that settles on Base — via [[wormhole-project]] or LayerZero)
- Insurance pool funded by protocol fees — covers SLA breaches up to a per-job cap
- Insurance UI on operator dashboard

**Out of scope for v4:**
- Non-EVM chains (Sui / Aptos / Solana are v5+)
- Enterprise tier (v5)

---

## v5 — Enterprise, non-EVM

**Goal:** Land enterprise customers (10+ robot fleets, regulated industries) and open up non-EVM chains.

**New surfaces:**
- Enterprise tier: SLA, support contracts, on-prem indexer support, custom retention
- Sui edition (companion to [[kano-sui-project]])
- Solana edition (if there's demand)
- Compliance tooling (audit log export, sensor pre-image archival policy controls)
- Per-region data residency

---

## v6 — Robot economic agents

**Goal:** Robots that don't just earn — they *manage themselves*. Robots running their own agent that re-prices offerings based on demand, schedules charging, etc.

**Premise:** A Rova robot already has an ERC-4337 wallet, a session-key system, and the ability to publish offerings. Layering an agent on top of that — an agent whose only job is to be a single robot's autonomous business manager — is the natural endpoint of the architecture.

**Open questions:**
- Who owns the robot-agent's reasoning model?
- How does the robot-agent's policy reconcile with the human Operator's?
- What's the trust model when the robot-agent acts against the Operator's preferences?

This is more vision than plan. v6 is a hypothesis.

---

## What's *never* on the roadmap

To be explicit:

- **A consumer marketplace.** Rova is infrastructure. Consumers interact with Rova through agents and warehouses, not directly.
- **A general-purpose escrow protocol.** The escrow contract is shaped specifically for proof-of-physical-work. We don't generalize it to other escrow uses.
- **Fiat onramps.** USDC in/out is the contract surface. Operator and agent fiat onboarding is outside Rova's stack.
- **A robot-to-robot communication protocol.** Robots coordinate via the chain (escrow + proof) — not via direct peer messaging.
- **A custodial product.** Rova does not hold keys for users. Self-custody only.

If any of these become urgent, we ship them as a separate product, not as a Rova feature.

---

## Dependencies between versions

```
v0 demo                  ← current
  │
  ▼
v1 one Loop end-to-end   ← critical: this is the existence proof
  │
  ▼
v1.5 disputes + real bot ← critical: this is the credibility proof
  │
  ├─→ v2 mainnet + token
  │     │
  │     ▼
  │   v3 beacons + Reachy
  │     │
  │     ▼
  │   v4 cross-chain + insurance
  │     │
  │     ▼
  │   v5 enterprise + non-EVM
  │     │
  │     ▼
  │   v6 robot agents
  │
  └─→ Parallel: COMPOSE/CHAUM (delegation tree integration) — independent of mainnet
```

v1 → v1.5 are sequential. v2 onwards can branch — for example, v3 beacon work doesn't strictly require v2 token launch.

---

## How we decide what's in vs out

A feature lands on the roadmap when it satisfies all four:

1. **It removes a load-bearing risk.** Not "would be nice." A risk that, left unaddressed, sinks adoption.
2. **It has a named user.** A real Operator or Agent who'd use it. Not "we think someone might."
3. **It compounds.** Building it makes future features easier, not harder.
4. **We can ship it without breaking what exists.** Either non-breaking, or with a clean migration story.

Features that fail any of these stay in the wishlist (`WISHLIST.md`, not part of the canon set).

---

## Related

- `FLOWS.md` — the per-flow inventory, with version tags
- `USE-CASES.md` — the named personas v1 targets
- `BIZ/PRICING.md` — what's monetized when
- `BIZ/TOKEN-ECONOMICS.md` — v2 token detail
- `ARCH/MULTI-WAREHOUSE.md` — v2 architecture work
