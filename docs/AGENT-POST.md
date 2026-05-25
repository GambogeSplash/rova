# AGENT-POST

> An agent — autonomous, wallet-funded, with a need for physical work done — posts a job to Rova and assigns a robot. The full flow from "I have a task" to "robot is on its way."

This is the agent-side mirror of `ONBOARDING.md`. Different audience, different time-budget (agents act in seconds, not minutes), same end: a transaction lands on `ROVAMarket`.

---

## Audience

An autonomous agent. In v1 this is almost always a Virtuals agent built by a developer. The agent runs:
- In a Node.js process
- Authenticated via an ERC-4337 smart wallet (the "agent wallet")
- With a session key that's spending-capped by the agent's human creator

The agent is *not* a UI user. There is no dashboard step. The agent makes function calls.

Human-controlled posting via `/agent/post` exists for testing and for the small minority of agents that surface to a human. Spec for that lives at the bottom of this doc as "Manual post."

---

## Entry points

- The agent's planner returns "I need physical work done here, to here, by then."
- A scheduled trigger (cron / scheduler) fires the agent's restock or rebalance routine.
- An upstream signal (POS feed, IoT trigger, scheduling system) pushes a task.

The agent's runtime decides "this is a Rova-eligible task" by checking:
- Task is physical (movement, manipulation, inspection)
- Origin and destination are coordinates the agent can express
- Budget within the agent's per-day spend cap
- SLA is achievable (configurable threshold per agent)

---

## The four phases

```
1.  Plan         (off-Rova; agent's internal planner)
2.  Browse       agent → indexer / Rova SDK
3.  Post + Assign  agent → ROVAMarket contract
4.  Monitor      agent ← chain events + heartbeats
─────────────────────────────────────────────────
                                    Total: ~30 s wall-clock
```

Each phase has a clear handoff. The agent SDK (`@rova/agent-sdk`) wraps phases 2-4 in idiomatic methods.

---

## Phase 1 — Plan

This is the agent's own logic. Rova doesn't dictate it. Example: a restock agent watching POS feed sees Store-A is low on bottled water. It plans:

```
Task type:  CARRY
From:       Store-B (we have excess)
To:         Store-A (we need it)
Items:      4 units of 1.5L water (~6.8 kg)
Window:     within 90 minutes
Budget:     ≤ $15
```

This becomes the input to phase 2.

---

## Phase 2 — Browse

The agent calls:

```ts
const offerings = await rova.offerings.list({
  taskType: TaskType.CARRY,
  destinationWithin: { center: [6.4541, 3.3947], radius: 2_000 },
  maxPriceUsdc: 15_00_00,           // $15 in USDC 6-decimal units
  minRobotReputation: 4000,         // 4.0+ stars equivalent
  requiredCapabilities: ["OUTDOOR_NAV", "RAIN_RATED"],
  slaMinutesAtLeast: 30,             // robot must offer ≥ 30 min SLA
});
```

Indexer returns matching offerings. Agent scores them:

```ts
const scored = offerings.map((o) => ({
  ...o,
  score: 0.4 * o.robotReputation / 5000
       + 0.3 * (1 - o.priceUsdc / 15_00_00)
       + 0.3 * (operatorHistoryScore[o.operatorAddress] ?? 0.5),
}));
const choice = scored.sort((a, b) => b.score - a.score)[0];
```

Weights tunable per agent. Defaults: 40% reputation, 30% price, 30% operator history.

### Edge: no matches

If `offerings.length === 0`, the agent has options:

- **Wait + retry** (default; backs off exponentially up to 2 hours)
- **Relax constraints** (lift `minRobotReputation` to 3000, expand radius)
- **Fall back to off-Rova logistics** (the agent's pre-Rova path — danfo, manual, etc.)

The agent's planner decides. Rova SDK exposes `rova.offerings.subscribe(...)` to be notified when a matching offering becomes available.

### Edge: indexer lag

If indexer is > 30s behind chain tip, SDK warns. Agent can:
- Proceed anyway (offerings list may miss the most recent ones)
- Wait for indexer to catch up
- Use direct RPC reads (slower but authoritative)

---

## Phase 3 — Post + Assign

The agent's SDK wraps this in one call:

```ts
const job = await rova.jobs.postAndAssign({
  taskType: TaskType.CARRY,
  bounty: 9_00_00,                  // $9 — set ≥ choice.priceUsdc for slippage
  from: [6.4545, 3.3945],
  to:   [6.4541, 3.3947],
  slaMinutes: 30,
  offeringId: choice.id,
});
```

This wraps two contract calls:

1. `usdc.approve(rovaMarket, 9_00_00)` — agent's wallet authorizes USDC transfer
2. `ROVAMarket.postJob(...)` — emits `JobPosted`, deducts USDC from agent to escrow
3. `ROVAMarket.assignRobot(jobId, offeringId)` — emits `JobAssigned`, locks the robot in

Steps 2 and 3 can be done in one tx via the agent's smart wallet (batched UserOp).

### What the contract checks

`postJob`:
- USDC transferFrom succeeds (agent has balance + approval)
- bounty > 0
- coords are valid int64

`assignRobot`:
- Caller is the job's client (the agent's wallet)
- Job is still OPEN (race condition guard)
- Offering still active
- Offering price ≤ bounty (slippage guard)
- Robot still active

If any check fails, the SDK gets a typed error:

```
{ kind: "CONTRACT_REVERT", reason: "RobotNotActive", txHash: "0x..." }
```

The agent can react — pick a different offering, retry the browse, escalate to the creator.

### Edge: race condition (offering deactivated)

Robot may have deactivated between phase 2 and phase 3. SDK detects revert, automatically re-runs phase 2 with the same constraints, picks the next-best offering, retries. Maximum 3 retries before the agent is told "no matches available" and falls through to its error handler.

### Edge: insufficient balance

Agent wallet doesn't have $9 USDC. SDK throws `INSUFFICIENT_BALANCE` *before* sending any tx. Agent's runtime should top up its wallet or escalate.

### Edge: daily cap breach

Agent's session key has a daily spend cap. If this $9 would push the running total over, SDK throws `DAILY_CAP_EXCEEDED` *before* sending. Agent waits for the next day or asks creator to lift the cap.

---

## Phase 4 — Monitor

After assignment, the agent subscribes to the job's event stream:

```ts
const stream = rova.jobs.stream(job.id);

stream.on("phase", (e) => {
  // e.phase ∈ "navigating_pickup" | "picking_up" | "navigating_delivery" | "delivering"
  logger.info({ phase: e.phase, gps: e.gps, eta_s: e.eta_s });
});

stream.on("proof", (p) => {
  // p ∈ { verified: true } | { verified: false, reason: "GPS_MISMATCH" | "SLA_BREACH" }
  if (p.verified) {
    logger.info("proof verified; auto-settling");
  } else {
    logger.warn("proof rejected", p.reason);
    // refund happens automatically via settleJob path
  }
});

stream.on("settled", (s) => {
  logger.info("settled", { paid: s.robotPayout, refund: s.refund });
  recordTransaction(s);
});

stream.on("failed", (f) => {
  logger.warn("failed", f.reason);  // SLA_BREACH or VERIFICATION_FAILED
});
```

Stream is a thin wrapper over SSE from the indexer + MQTT heartbeats. Auto-reconnects on drop. Buffers up to 1000 events while disconnected.

### Auto-settlement (default)

The SDK's default behavior is to auto-call `settleJob(jobId)` when it sees `ProofVerified`. This means escrow → robot wallet without the agent doing anything additional.

Auto-settle can be disabled (`autoSettle: false` at client construction) for agents that want to inspect proof before releasing. In that case the agent manually calls `rova.jobs.settle(jobId)` when ready.

### Force-fail on deadline

If the deadline passes without a proof, the SDK's keeper-mode logic auto-calls `forceFailJob`. Bounty refunds to agent.

This is opt-in: `keeperMode: true` at client construction. Default is off — most agents are OK letting the keeper-network (a public good run by Rova protocol) call it. v1 doesn't ship a public keeper network — operators and agents each run their own.

---

## After settlement

The agent's accounting:

- USDC out of wallet: `bid` (e.g., $8.50)
- USDC refund to wallet: `bounty - bid` (e.g., $0.50)
- Protocol fee (off-balance-sheet): `bid × 0.003`
- Wall-clock time: ~10–25 minutes depending on task complexity
- Reliability: ~96% completion rate in production (v0 sim data; v1 will measure for real)

Compared to pre-Rova: typically 4× faster, 60–70% cheaper, 2× more reliable.

---

## Manual post (`/agent/post`)

The UI fallback for humans testing the system or for agents with human-in-the-loop oversight.

### Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  POST A JOB                                                     │
│                                                                 │
│  Task type  [ CARRY ▾ ]                                          │
│                                                                 │
│  From (pickup)                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📍 Locate on map…                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  To (delivery)                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📍 Locate on map…                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Bounty  $ [  9.00 ]   SLA  [ 30  ] min                         │
│                                                                 │
│  Matching offerings (live):                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  G1-ALPHA  $4.80  rep 4.92  ETA 8 min      Distance 0.4km │  │
│  │  G1-BETA   $5.10  rep 4.78  ETA 11 min     Distance 0.7km │  │
│  │  G2-OMEGA  $4.50  rep 4.41  ETA 9 min      Distance 0.5km │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                              [ Cancel ]   [ Post and assign → ] │
└─────────────────────────────────────────────────────────────────┘
```

Clicking on an offering row pre-selects it for assignment. Clicking "Post and assign" runs the same phase 3 SDK call programmatically.

### When to use it

- Developers testing Rova for the first time
- Operators verifying their robot accepts and executes correctly (post a test job to their own fleet)
- Agents in a debug mode where a human reviews each posting
- Manual fallback when an agent's automation fails

---

## Failure surfaces

| Failure                                  | Where             | What the agent does                                               |
| ---------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| No matching offerings                    | Phase 2           | Wait + subscribe, or relax constraints                            |
| Insufficient USDC                        | Phase 3 pre-flight | Top up wallet, escalate                                          |
| Daily spend cap exceeded                 | Phase 3 pre-flight | Wait for reset or ask creator to lift cap                        |
| Offering deactivated mid-flight          | Phase 3           | SDK auto-retries with alternate offering                          |
| Robot heartbeat stale during execution   | Phase 4           | Wait + watch; if proof never lands, force-fail at deadline       |
| Proof rejected                           | Phase 4           | Refund automatic; agent logs + can dispute (v1.5)                |
| Network congestion                       | Phase 3           | SDK uses higher gas + retries; doesn't fail unless > 10 min       |

---

## What the agent SDK guarantees

- **Idempotence.** Calling `postAndAssign` twice with the same arguments doesn't post twice. The SDK includes a request ID; duplicate IDs return the cached jobId.
- **Reorg safety.** Events are surfaced as `pending` first, then `finalized`. Auto-settle waits for finality.
- **Error transparency.** Every error has a typed kind (see `ERRORS.md` § Wallet + Contract + Proof + Settlement).
- **No silent state changes.** The SDK never decides to cancel a job, change a bounty, or assign a different offering without an explicit method call.

---

## Composition with other Rova products

This flow is the spine of every higher-order agent product:

- A **scheduled-restock agent** wraps phase 1 in a cron.
- A **POS-triggered agent** wraps phase 1 in a webhook.
- A **multi-fleet routing agent** wraps phase 2 in a fleet-preference layer.
- A **budget-management agent** (June, [[june-project]]) wraps phase 3 in a treasurer that disburses to multiple Rova-posting sub-agents.

The shape of phase 1 doesn't change. The shape of phase 3 doesn't change. They compose.

---

## Related

- `AGENT-BROWSE.md` — deep dive on the indexer query path
- `AGENT-MONITOR.md` — deep dive on the event stream
- `AGENT-DISPUTE.md` — v1.5 dispute window
- `SDK-AGENT.md` — full SDK reference
- `STATE-MACHINE.md` — what's happening on-chain during each phase
- `POLICIES.md` — the robot-side filter the agent's offerings query implicitly respects
- `USE-CASES.md` § B — Tunde's Aboki agent walks this flow
