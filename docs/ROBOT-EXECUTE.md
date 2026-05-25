# ROBOT-EXECUTE

> A robot, running the Rova SDK, executes one job from offer-arrival to proof-submitted. The full physical-world loop with the on-chain handshake at each side.

This is the third hero flow. The robot side of every successful Rova transaction.

---

## Audience

A physical robot running the Rova robot SDK (`@rova/robot-sdk`, Python). The robot:
- Has an ERC-4337 smart wallet provisioned at install (one-time setup; see `ROBOT-IDENTITY.md`)
- Has a session key authorized to call `submitProof`, `publishOffering`, `publishHeartbeat`
- Has a policy document loaded from disk
- Has motion + perception capabilities exposed via ROS2 (or custom HAL)
- Has at least one GNSS / RTK module producing GPS coords at ≥ 5 Hz

The robot is not a UI user. There are no buttons. Everything below happens autonomously in the SDK loop.

---

## Entry points

- The SDK is running and subscribed to `OfferReceived` events on the indexer + chain
- An `OfferReceived` event fires for an offering the robot owns
- The SDK calls the user's `@on_offer` handler

Pre-condition: the robot's offering is live in `ROVARegistry`, marked `active: true`, and the policy says the SDK is willing to take this kind of work.

---

## The six phases (robot perspective)

```
1.  Evaluate offer        ~4 ms        (policy DSL evaluation, in-process)
2.  Acknowledge           ~3 s         (heartbeat: OfferingHeld)
3.  Wait for assignment   variable     (until JobAssigned fires on-chain)
4.  Execute motion        ~5–15 min    (the actual physical work)
5.  Compute proof         ~50 ms       (sensor frame assembly + keccak256)
6.  Submit proof          ~10 s        (one ERC-4337 UserOp, two blocks for finality)
```

Most of the work is in phase 4. The protocol overhead is phases 1–3 + 5–6 = under 15 seconds of wall-clock outside of the physical task itself.

---

## Phase 1 — Evaluate offer

When the indexer SSE stream pushes an `OfferReceived` event for one of this robot's offerings, the SDK runs the policy DSL in-process.

### Mechanics

```python
def evaluate_offer(offer: Offer, policy: Policy) -> Decision:
    # Fast rejects first (cheap checks)
    if policy.emergency_paused:
        return Decision.reject("EMERGENCY_PAUSED")
    if offer.task_type not in policy.accepted_task_types:
        return Decision.reject("TASK_TYPE_NOT_ACCEPTED")
    if offer.client in policy.blacklist:
        return Decision.reject("BLACKLISTED_CLIENT")
    if offer.client_reputation < policy.reputation_threshold:
        return Decision.reject("REP_BELOW_THRESHOLD")
    # Economic checks
    if offer.bid < policy.price_floors.get(offer.task_type, 0):
        return Decision.reject("PRICE_FLOOR")
    if offer.bid > policy.price_ceilings.get(offer.task_type, float("inf")):
        return Decision.reject("PRICE_CEILING")
    # Spatial / temporal
    if policy.geofence.enabled and not policy.geofence.contains(offer.destination):
        return Decision.reject("GEOFENCE")
    if not policy.in_time_window(now()):
        return Decision.reject("TIME_WINDOW")
    # Capability + concurrency
    if not policy.required_capabilities.issubset(robot.capabilities):
        return Decision.reject("MISSING_CAPABILITY")
    if active_job_count() >= policy.max_concurrent_jobs:
        return Decision.reject("MAX_CONCURRENT")
    # User-defined hook
    if user_handler := offer_handler:
        result = await user_handler(offer)
        if result == Decision.REJECT:
            return Decision.reject("USER_REJECT")
    return Decision.ACCEPT if policy.auto_accept else Decision.ESCALATE
```

Each reject reason is logged as a structured event. The Operator dashboard surfaces these as policy-rejection signals.

### Edge: user hook async + slow

The user-defined `@on_offer` hook is awaited. If it takes > 500 ms, the SDK logs a warning. > 2 s and the SDK abandons the offer with `USER_HOOK_TIMEOUT` — agents have moved on by then.

### Edge: ESCALATE (manual approval)

When `auto_accept: false`, the SDK doesn't reject — it publishes an `OfferingPendingApproval` event to the Operator dashboard and waits up to `(offer.sla_minutes * 0.5) minutes` for human approval. Past that, it auto-rejects with `APPROVAL_TIMEOUT`.

---

## Phase 2 — Acknowledge

If `Decision.ACCEPT`, the SDK publishes a heartbeat:

```python
robot.heartbeat.publish({
    "robotId": 23,
    "phase": "matching",
    "offeringId": 17834,
    "claimedAt": now(),
})
```

This is an off-chain signal to other agents: "I'm taken; don't pick me." It's advisory — the contract doesn't know about it — but agents respect it because picking a robot that just claimed gives a worse-than-50/50 chance of winning the race.

The SDK then waits for the `JobAssigned` event on-chain matching `(jobId, robotId=23)`. Phase 3.

### Edge: heartbeat publish fails

MQTT down or auth fails. SDK logs a warning. The robot still waits for `JobAssigned` — other agents may still pick a different offering and miss this one entirely, but the contract is the source of truth.

---

## Phase 3 — Wait for assignment

The SDK listens on the chain (or indexer SSE) for `JobAssigned(jobId, robotId, bid)` matching this robot.

Three things can happen:

### A. Agent assigns

`JobAssigned` fires within ~5 seconds. SDK reads `jobs(jobId)` to get coords, deadline. Moves to phase 4.

### B. Agent never assigns

Most common reason: the agent picked a different offering. SDK times out after `offer.sla_minutes * 0.25` (default = 7.5 minutes for a 30-minute SLA) and clears the "matching" state. Robot becomes available for next offer.

### C. Different agent races and wins

The race condition in `STATE-MACHINE.md` § Race 2 — two agents both call `assignRobot`. Contract only lets one succeed. SDK detects which agent won, proceeds with that job.

In v1 this is rare because `OfferingHeld` is well-respected. v2 may add an on-chain temporary lock.

---

## Phase 4 — Execute motion

The user-defined `@on_assigned` handler fires. The SDK is hands-off here — the user's code drives the robot.

### Required behaviors

Three things the user's handler MUST do (the SDK enforces by check + alert):

1. **Move to pickup coords.** SDK monitors GPS via heartbeat. If position doesn't approach pickup within reasonable time, SDK alerts the operator.
2. **Move to delivery coords.** Same.
3. **Maintain heartbeat.** SDK publishes a heartbeat every 10s in the background. If user's handler hangs / blocks the event loop, SDK alerts.

### Recommended behaviors

The user's handler SHOULD:

- Update `phase` in the heartbeat at meaningful transitions (`navigating_pickup` → `picking_up` → `navigating_delivery` → `delivering`)
- Record sensor data needed for proof (load cell, image, IMU)
- Handle local errors (gripper failure, path blocked, low battery) by either retrying or aborting

### Example skeleton

```python
@robot.on_assigned
async def execute(job: Job):
    # 1. Navigate to pickup
    robot.heartbeat.set_phase("navigating_pickup")
    await navigate_to(job.from_coords)

    # 2. Pickup
    robot.heartbeat.set_phase("picking_up")
    pickup_frame = await capture_sensor_frame()
    await gripper.engage()
    if not pickup_frame.weight_delta > 100:  # 100g threshold
        raise AbortJob("PICKUP_FAILED")

    # 3. Navigate to dropoff
    robot.heartbeat.set_phase("navigating_delivery")
    await navigate_to(job.to_coords)

    # 4. Deliver
    robot.heartbeat.set_phase("delivering")
    dropoff_frame = await capture_sensor_frame()
    await gripper.release()
    if not dropoff_frame.weight_delta < -100:
        raise AbortJob("DELIVERY_FAILED")

    # 5. SDK handles phases 5 + 6 automatically when the handler returns
    return SensorFrame.combine(pickup_frame, dropoff_frame, gps=current_gps())
```

### Edge: physical abort mid-job

The user raises `AbortJob(reason)`. SDK:
- Publishes a heartbeat with phase `aborted`
- Does NOT submit a proof
- Lets the job SLA-breach (the agent will refund + the stake will slash)

The operator dashboard surfaces "G1-ALPHA aborted JOB-X for reason Y. Stake will be slashed when SLA breaches in N min."

### Edge: deadline approaching

The SDK calculates `(deadline - now)` continuously. At < 25% of SLA remaining, it pings the user handler with a `DeadlineWarning` event. The user can ignore it, abort early to save stake (the slash is fixed at 10% of bid regardless), or push harder.

---

## Phase 5 — Compute proof

When the user's `@on_assigned` handler returns a `SensorFrame`, the SDK:

```python
def compute_proof(job_id: int, frame: SensorFrame, gps: tuple[float, float]) -> Proof:
    lat_e7 = int(gps[0] * 10_000_000)
    lng_e7 = int(gps[1] * 10_000_000)
    sensor_hash = keccak256(serialize(frame))
    return Proof(
        job_id=job_id,
        lat_e7=lat_e7,
        lng_e7=lng_e7,
        sensor_hash=sensor_hash,
    )
```

Determinism rules from `PROOF.md`:
- `serialize(frame)` is canonical (sorted keys, fixed encoding) so the hash is reproducible during dispute
- `gps` is taken at the moment of computing the proof (typically `delivering` phase end)
- `sensor_hash` includes the per-task-type required fields per the task type's schema

---

## Phase 6 — Submit proof

The SDK signs and submits one UserOperation via the session key:

```
UserOp:
  sender:    robot wallet (0x71C7...4e2F)
  nonce:     fetched from wallet
  callData:  ROVAVerifier.submitProof(job_id, lat_e7, lng_e7, sensor_hash)
  paymaster: rovaPaymaster
  signature: ecdsa.sign(session_key, userOpHash)
```

Submitted to a bundler. Bundler aggregates with other UserOps, includes in next Base block (~3s).

### Auto-verify

`submitProof` auto-calls `_verify` inside the contract (see `PROOF.md` § verification logic):
- SLA check: `block.timestamp ≤ deadline`
- GPS check: `|lat_diff| ≤ gpsTolerance AND |lng_diff| ≤ gpsTolerance`

`ProofVerified` event fires in same tx, OR `ProofRejected(reason)` fires.

### Edge: bundler rejected

Paymaster low on funds, malformed UserOp, etc. SDK detects, logs, and falls back to:
1. Retry with own gas (if operator's robot wallet has ETH)
2. Surface to operator as `S-03` (see `ERRORS.md`)

### Edge: late submission (timing race)

SDK submits within the SLA window per its own clock, but tx is mined after deadline. Verifier's SLA check uses `block.timestamp` — robot loses.

Mitigations:
- SDK targets submission at SLA - 30s minimum (configurable buffer)
- SDK monitors mempool latency and warns if blocks are slow
- Operator can configure aggressive completion targets in the policy (e.g., complete in ≤ SLA × 0.7)

---

## What the robot sees after settle

The SDK observes (via event subscription):

```
ProofVerified(jobId, ...)
JobCompleted(jobId, robotId, payout)
```

Local accounting:

```python
robot.earnings.today += payout       # e.g., 4.7860 USDC
robot.jobs_completed += 1
robot.reputation = await chain.read("registry.robots", robot_id).reputation  # newly bumped
```

The SDK publishes a final `phase: settled` heartbeat. Robot returns to idle (or docks for charging, per its own logic).

---

## Failure surfaces (robot side)

| Failure                                  | Phase | Recovery                                                          |
| ---------------------------------------- | ----- | ----------------------------------------------------------------- |
| Policy rejects offer                     | 1     | Normal; no action                                                 |
| MQTT heartbeat publish fails             | 2     | Log; continue (chain is the truth)                                |
| `JobAssigned` never fires                | 3     | Time out; release "matching" state; resume                        |
| Agent races and wins                     | 3     | SDK detects via JobAssigned mismatch; release; resume             |
| User handler raises AbortJob             | 4     | Heartbeat `aborted`; no proof; SLA breach + slash                 |
| Battery critical mid-motion              | 4     | SDK + user choose: abort cleanly OR push through                  |
| GPS lock lost                            | 4     | SDK + user choose: pause + retry OR abort                         |
| Sensor failure                           | 4-5   | User handler raises; no proof; slash                              |
| `submitProof` reverts (already submitted) | 6   | SDK reads chain state, syncs; sees prior proof, marks job done    |
| Bundler rejects UserOp                   | 6     | Fall back to direct gas (if wallet funded), else operator alert   |
| Late submission (tx mined past deadline) | 6     | Proof rejected; slash; reputation drops                           |

---

## What the operator sees during a robot's job

The operator's dashboard shows G1-ALPHA's job in real time:

```
G1-ALPHA · JOB-7c2a · CARRY · $4.80 · 0:09:42 / 0:30:00 SLA

[●] navigating_delivery       GPS: 52.4137, -1.5108
                              battery: 86%   distance to dest: 4.2 m
```

When proof submits and verifies, the row updates:

```
G1-ALPHA · JOB-7c2a · CARRY · $4.80 · 0:14:35 / 0:30:00 SLA

[✓] settled                   payout: $4.786   fee: $0.014
```

Settled jobs roll into the day's earnings card. Failed jobs surface as a triage row in the Alerts panel.

---

## Telemetry

SDK emits per-phase events:

```
robot.offer.evaluated          (decision, reason)
robot.offering.held            (offeringId)
robot.job.assigned             (jobId, bounty, bid)
robot.execution.started        (jobId)
robot.phase.changed            (jobId, from, to)
robot.execution.finished       (jobId, duration_s)
robot.proof.computed           (jobId, sensor_hash_truncated)
robot.proof.submitted          (jobId, tx_hash)
robot.proof.result             (jobId, verified, reason)
robot.settled                  (jobId, payout)
robot.aborted                  (jobId, reason)
```

These power the Operator dashboard's per-robot health view and the fleet-wide aggregates in `OPS/MONITORING.md`.

---

## Composition with simulation

The robot SDK exposes a simulation mode for local testing:

```python
robot = Robot(...).with_simulation(
    use_synthetic_gps=True,
    use_synthetic_sensors=True,
    skip_chain=True,  # no real contract calls
)
```

In sim mode the SDK:
- Generates plausible GPS coords
- Auto-completes the user's handler with a successful sensor frame
- Replays the full lifecycle locally without touching the chain

Used by:
- Operators integrating a new robot model
- Rova-side QA / regression testing
- The browser simulator at `/simulator` (a TypeScript port of the same lifecycle)

---

## Related

- `PROOF.md` — what's inside the proof submitted in phase 6
- `POLICIES.md` — the rule set evaluated in phase 1
- `STATE-MACHINE.md` — the on-chain transitions phases 3 + 6 cause
- `ROBOT-IDENTITY.md` — the one-time setup that precedes this flow
- `SDK-ROBOT.md` — full SDK reference
- `ARCH/PROOF-PIPELINE.md` — the path from `submitProof` to operator UI
- `USE-CASES.md` § C — G1-ALPHA walks this flow in production
