# STATE-MACHINE

> The task lifecycle. Every job is a walk through this graph. Every dispute is an argument about which node the job is in. Every UI screen is a view of a subset of the graph.

---

## Two state machines, not one

Rova has two state machines stacked on top of each other:

1. **Contract state** — what `ROVAMarket.jobs[jobId].status` is. Five values. Authoritative.
2. **UI phase** — what the user sees in dashboards and receipts. Ten values. Derived, finer-grained, includes off-chain transitions.

This is not redundancy. The contract state is what the *protocol* enforces. The UI phase is what *experience* requires. Conflating them produces either an under-specified UI ("Assigned" for ten different real-world situations) or a brittle contract (storing UX states like `picking_up` on-chain wastes gas and locks the protocol to one task shape).

The mapping between them is one-to-many (one contract state, many UI phases) and lossy in one direction only: you can always derive `contract_state` from `ui_phase`, but you can't always derive `ui_phase` from `contract_state` alone — you need event history.

---

## Contract states (authoritative)

```solidity
enum JobStatus { OPEN, ASSIGNED, COMPLETED, FAILED, CANCELLED }
```

```
OPEN ──assignRobot──> ASSIGNED ──settleJob (verified)──> COMPLETED
  │                       │
  │                       ├─settleJob (rejected)────────> FAILED
  │                       │
  │                       └─forceFailJob (SLA breach)───> FAILED
  │
  └─cancelJob (only by client, only while OPEN)────────> CANCELLED
```

| State       | What it means                                         | Funds location          | Who can transition out                  |
| ----------- | ----------------------------------------------------- | ----------------------- | --------------------------------------- |
| `OPEN`      | Posted, bounty in escrow, no robot assigned yet       | `ROVAMarket` contract   | Client (assign or cancel)               |
| `ASSIGNED`  | Robot picked, deadline locked, awaiting proof         | `ROVAMarket` contract   | Anyone (settle if verified; force-fail if past deadline) |
| `COMPLETED` | Verified proof, escrow released                       | Robot wallet (paid) + Client (refund of surplus) | Terminal                                |
| `FAILED`    | Proof rejected or SLA breached                        | Client (full refund); robot stake slashed | Terminal                                |
| `CANCELLED` | Client withdrew before assignment                     | Client (full refund)    | Terminal                                |

Three terminal states (`COMPLETED`, `FAILED`, `CANCELLED`). Two active states (`OPEN`, `ASSIGNED`). No state has more than two outbound transitions.

---

## UI phases (derived)

```typescript
type JobPhase =
  | "posted"
  | "matching"
  | "escrow_locked"
  | "navigating_pickup"
  | "picking_up"
  | "navigating_delivery"
  | "delivering"
  | "proof_submitted"
  | "verifying"
  | "settled";
```

Each phase maps to a contract state:

| UI Phase             | Contract State | What's happening                                              |
| -------------------- | -------------- | ------------------------------------------------------------- |
| `posted`             | `OPEN`         | `JobPosted` emitted; offer visible in registry                |
| `matching`           | `OPEN`         | Agent or auto-matcher is selecting from offerings (off-chain) |
| `escrow_locked`      | `ASSIGNED`     | `JobAssigned` emitted; robot acknowledged                     |
| `navigating_pickup`  | `ASSIGNED`     | Robot SDK reports `phase: NAVIGATING_PICKUP` off-chain        |
| `picking_up`         | `ASSIGNED`     | Robot at pickup, performing the pick                          |
| `navigating_delivery`| `ASSIGNED`     | Robot moving toward destination                               |
| `delivering`         | `ASSIGNED`     | Robot at destination, performing dropoff                      |
| `proof_submitted`    | `ASSIGNED`     | `ProofSubmitted` emitted, verifier hasn't yet decided         |
| `verifying`          | `ASSIGNED`     | Auto-verify running (one block — usually invisible)           |
| `settled`            | `COMPLETED`    | `JobCompleted` emitted; payment landed                        |

The terminal `FAILED` and `CANCELLED` contract states have their own UI phases not in the success path: `failed` and `cancelled`. They're terminal in both machines.

**Six of the ten phases (`navigating_pickup` through `delivering`) are off-chain.** They're derived from a heartbeat the robot SDK publishes to an off-chain indexer/MQTT topic — they never touch the contract. This is intentional: every 10-second status update would cost the operator more in gas than the job earns. The contract knows three things about an active job: it's assigned, here's the deadline, here's whether a proof has landed yet. Everything else is the SDK's job.

---

## The full happy path, in events

Time runs top to bottom. ⛓ = on-chain event. 📡 = off-chain SDK signal.

```
T+0:00  ⛓ JobPosted(jobId, client, taskType, bounty)
        UI: posted

T+0:03  📡 SDK heartbeat: "offerings being evaluated against policy"
        UI: matching

T+0:08  ⛓ JobAssigned(jobId, robotId, bid)
        ⛓ JobDestinationSet(jobId, destLat, destLng, deadline)
        UI: escrow_locked

T+0:12  📡 SDK heartbeat: robotId 5 enters phase NAVIGATING_PICKUP
        UI: navigating_pickup

T+2:30  📡 SDK heartbeat: phase PICKING_UP, GPS now at pickup coords
        UI: picking_up

T+3:10  📡 SDK heartbeat: phase NAVIGATING_DELIVERY, load_cell delta = +1.4 kg
        UI: navigating_delivery

T+8:45  📡 SDK heartbeat: phase DELIVERING, GPS now at dest coords
        UI: delivering

T+9:20  ⛓ ProofSubmitted(jobId, latE7, lngE7, sensorHash)
        UI: proof_submitted

T+9:20  ⛓ ProofVerified(jobId)  -- same tx as ProofSubmitted (auto-verify)
        UI: verifying  (often invisible — one frame)

T+9:35  ⛓ JobCompleted(jobId, robotId, payout)
        UI: settled
```

Total wall-clock time: ~10 minutes for a typical warehouse CARRY job.
On-chain transactions: **4** (post, assign, submitProof+verify in same tx, settle).
Off-chain heartbeats: **5** (matching, navigating, picking up, navigating delivery, delivering).

---

## Per-transition specification

For each transition: who triggers it, what contract method, what events fire, what side effects.

### `OPEN → OPEN` (matching, off-chain only)

- **Triggered by:** Client agent's matcher selecting a Job Offering, or the registry UI's auto-matcher
- **Contract:** None (no transition; this is the same OPEN state)
- **Side effects:** Off-chain only — SDK publishes `OfferEvaluated` heartbeats
- **Timeout:** None — a job can sit OPEN indefinitely until the client cancels or assigns
- **Failure modes:** No matching robot found → client can lower expectations or cancel

### `OPEN → ASSIGNED`

- **Triggered by:** Client
- **Contract method:** `ROVAMarket.assignRobot(jobId, offeringId)`
- **Preconditions:** `msg.sender == job.client`, `job.status == OPEN`, `offering.active`, `offering.priceUsdc <= job.bounty`, `registry.isRobotActive(offering.robotId)`
- **State changes:** `job.offeringId`, `job.robotId`, `job.bid`, `job.deadline = block.timestamp + slaMinutes*60`, `job.status = ASSIGNED`; `verifier.setJobDestination` called
- **Events:** `JobAssigned(jobId, robotId, bid)` + `JobDestinationSet(jobId, lat, lng, deadline)`
- **Failure modes:**
  - `NotClient` — wrong caller
  - `JobNotOpen` — race condition; someone else already assigned (shouldn't happen — only client can assign)
  - `InvalidOffering` — offering was deactivated since being browsed
  - `InsufficientBounty` — robot raised its price between browse and assign
  - `RobotNotActive` — robot was deactivated since being browsed

### `ASSIGNED → COMPLETED` (the happy path)

- **Triggered by:** Anyone (typically client agent, sometimes the robot SDK, sometimes a keeper bot)
- **Contract method:** `ROVAMarket.settleJob(jobId)`
- **Preconditions:** `job.status == ASSIGNED`, `verifier.isVerified(jobId)` returns true
- **State changes:** `job.status = COMPLETED`; USDC moves: `bid - fee` to robot wallet, `bounty - bid` refund to client; `protocolFee` accrues; `registry.recordCompletion(robotId)` bumps reputation
- **Events:** `JobCompleted(jobId, robotId, payout)`
- **Failure modes:**
  - `JobNotAssigned` — wrong state
  - `VerificationPending` — no proof yet (and not past deadline)
- **Note:** If proof has been rejected (`isRejected = true`), this transition does NOT happen — instead it falls through to `_failJob` (see below).

### `ASSIGNED → FAILED` (via rejected proof)

- **Triggered by:** Anyone
- **Contract method:** `ROVAMarket.settleJob(jobId)` — same method as success, branches inside
- **Preconditions:** `verifier.isRejected(jobId)` returns true
- **State changes:** `job.status = FAILED`; full bounty refunded to client; `registry.slash(robotId, bid / 10)` slashes 10% of bid from robot's ROVA stake
- **Events:** `JobFailed(jobId, robotId, "VERIFICATION_FAILED")` + `StakeSlashed(robotId, amount)`

### `ASSIGNED → FAILED` (via SLA breach)

- **Triggered by:** Anyone
- **Contract method:** `ROVAMarket.forceFailJob(jobId)`
- **Preconditions:** `job.status == ASSIGNED`, `block.timestamp > job.deadline`
- **Behavior:** First re-checks `verifier.isVerified(jobId)` — if a late proof somehow landed and was verified, the job *still completes* (defensive: don't punish a robot whose proof tx was delayed in the mempool). Otherwise transitions to FAILED with reason `"SLA_BREACH"`.
- **Events:** `JobFailed(jobId, robotId, "SLA_BREACH")` + `StakeSlashed(robotId, amount)` (only if not late-verified)

### `OPEN → CANCELLED`

- **Triggered by:** Client only
- **Contract method:** `ROVAMarket.cancelJob(jobId)`
- **Preconditions:** `msg.sender == job.client`, `job.status == OPEN`
- **State changes:** `job.status = CANCELLED`; full bounty refunded
- **Events:** `JobCancelled(jobId)`
- **Note:** **Cannot cancel after assignment.** Once a robot accepts, the client has committed. If the client wants to abort an `ASSIGNED` job, they wait for SLA breach. This is intentional — a free-cancel-after-assign would let clients waste a robot's time.

---

## Timing constraints

The contract pins three timing-related variables:

```solidity
job.createdAt = block.timestamp              // when posted
job.deadline  = createdAt + slaMinutes * 60  // by when proof must verify
```

There is no per-state timeout. The state machine sits in `OPEN` until cancelled or assigned. It sits in `ASSIGNED` until verified, rejected, or past-deadline force-failed. There is no auto-expiry — every transition requires a caller.

This has one important implication: **the `force_fail` path requires someone to actually call it.** If a robot disappears mid-job and no one calls `forceFailJob`, the bounty sits in escrow forever. In practice the client's wallet is incentivized to call it (they get their bounty back), but the protocol does not force the issue.

A v2 enhancement is a keeper bot run by the protocol that auto-calls `forceFailJob` on any `ASSIGNED` job ≥ 1 hour past its deadline. v1 leaves it to the client.

---

## Race conditions worth knowing

### 1. Robot deactivates between browse and assign

**Scenario:** Client agent finds offering 17, robot's owner deactivates the robot, client calls `assignRobot(jobId, 17)`.
**Outcome:** Contract reverts with `RobotNotActive`. Client retries with a different offering.
**Cost:** One reverted transaction. Acceptable.

### 2. Two clients try to assign different jobs to the same offering

**Scenario:** Two clients both pick offering 17, both submit `assignRobot` in the same block.
**Outcome:** Both succeed. The robot now has two assigned jobs. The robot's policy enforces `maxConcurrentJobs` — if set to 1, the robot SDK *refuses to execute* the second job and lets it SLA-breach. The first client gets the work; the second gets their bounty back at SLA timeout (minus the inconvenience).
**Mitigation:** Robot SDK should publish `OfferingHeld(offeringId)` heartbeat the moment it begins working on a job, which agent matchers respect off-chain. The contract is intentionally lenient here.

### 3. Proof lands after `forceFailJob` was called

**Scenario:** Job past deadline. Anyone calls `forceFailJob`. In the same block, the robot's `submitProof` tx also lands.
**Outcome:** Tx ordering determines. If `submitProof` lands first, auto-verify might rule it good → `forceFailJob` re-checks `isVerified` and completes the job (robot wins). If `forceFailJob` lands first, job is FAILED → `submitProof` will then revert with `ProofAlreadySubmitted` semantics (technically the proof is `submitted` but to a non-active job; the verifier doesn't currently check job state — this is a minor v1.5 fix).

### 4. Client cancels after agent matcher already committed but before `assignRobot`

**Scenario:** Off-chain matcher told the robot SDK "you're getting job 5", robot SDK already moving to pickup, client cancels.
**Outcome:** Cancel succeeds (job is still OPEN on-chain). Robot reaches pickup with no escrow. Robot SDK detects via heartbeat that `JobAssigned` never fired and the job is `CANCELLED`, aborts.
**Cost:** Robot wasted some battery and time. This is the inherent risk of pre-assignment movement. SDK policy can suppress pre-movement (`don't move until JobAssigned`) at the cost of latency.

---

## What the UI should show at each state

| Phase                 | Operator dashboard               | Agent dashboard                   | Robot UI            |
| --------------------- | -------------------------------- | --------------------------------- | ------------------- |
| `posted`              | (not relevant — agent's job)     | "Waiting for matches"             | (not relevant)      |
| `matching`            | Inbound offers preview           | "Evaluating N offerings"          | Considering offer   |
| `escrow_locked`       | New assignment alert             | "Robot assigned — ETA M:SS"       | Job acquired        |
| `navigating_pickup`   | Live position on fleet map       | Live position + ETA               | Active nav screen   |
| `picking_up`          | "Picking up" indicator           | Pickup confirmation pending       | Manipulation screen |
| `navigating_delivery` | Live position                    | Live position + load delta        | Active nav          |
| `delivering`          | "Delivering" indicator           | Dropoff pending                   | Manipulation        |
| `proof_submitted`     | Proof preview                    | "Awaiting verification"           | "Proof sent"        |
| `verifying`           | (usually invisible)              | (usually invisible)               | (usually invisible) |
| `settled`             | "+$X.XX" in earnings card        | Receipt link + dispute window     | "+$X.XX earned"     |
| `failed`              | Reason + slash amount            | Refund landed + reason            | "Job failed: reason"|
| `cancelled`           | (typically not shown — pre-assign)| Refund landed                     | (not relevant)      |

The Operator and Robot don't see the `posted` or `matching` phases because they pre-date the robot being involved. The Agent doesn't see internal Operator-side phases like "robot is currently in maintenance window."

---

## Invariants

Three invariants the contract enforces and the UI should trust:

1. **Escrow conservation.** At every point in the lifecycle, the total USDC accounted for equals the original bounty. `OPEN`: contract holds `bounty`. `ASSIGNED`: contract holds `bounty`. `COMPLETED`: robot has `bid - fee`, client has `bounty - bid`, protocol has `fee`. `FAILED`/`CANCELLED`: client has `bounty`.
2. **One terminal state per job.** Once `status ∈ {COMPLETED, FAILED, CANCELLED}`, no further transitions occur. The state is final.
3. **No phantom jobs.** Every `jobId < nextJobId` exists in the `jobs` mapping with a defined `status`. The protocol does not delete jobs.

A UI built on these invariants doesn't need to defensively recheck them on every poll. Subscribe to the events, trust the state.

---

## Related

- `PROOF.md` — what happens inside the `proof_submitted → verifying` window
- `POLICIES.md` — what off-chain SDK logic runs between `OPEN → ASSIGNED` and during `navigating/picking_up/delivering`
- `FLOWS.md` — full inventory of flows that walk this state machine
- `JOB-APPROVAL.md` — the Operator's manual-approve path (when `autoAccept: false`)
- `DISPUTE-RESOLUTION.md` — the v1.5 path that adds a state after `COMPLETED`
- `ARCH/PROOF-PIPELINE.md` — the off-chain indexer's role in deriving UI phases from on-chain events
