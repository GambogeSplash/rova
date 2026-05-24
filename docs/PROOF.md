# PROOF

> Rova's load-bearing primitive. The reason a Virtuals agent can spend money on a robot it has never seen and a warehouse operator can let a robot it doesn't own enter its building.

---

## What proof is

A **proof** is a structured claim, signed by a robot, that a physical task completed at a specific place and time, with a specific sensor record. Rova does not assume the robot is honest. It assumes the *substrate* — GPS coordinates, blockchain timestamps, hashed sensor data, the verifier contract — is honest, and reduces every dispute to a check against that substrate.

Concretely a proof is four fields:

| Field          | Type              | Source                          | What it asserts                                        |
| -------------- | ----------------- | ------------------------------- | ------------------------------------------------------ |
| `jobId`        | `uint256`         | Robot SDK                       | This proof corresponds to a specific posted job        |
| `latitudeE7`   | `int64`           | Robot's onboard GNSS / RTK GPS  | Robot's position when the task closed                  |
| `longitudeE7`  | `int64`           | Robot's onboard GNSS / RTK GPS  | Robot's position when the task closed                  |
| `timestamp`    | `uint256`         | `block.timestamp` at submission | When the verifier saw the claim                        |
| `sensorHash`   | `bytes32`         | Robot SDK (keccak256)           | Commitment to the sensor record taken at task close    |

Submitted in one transaction to `ROVAVerifier.submitProof(jobId, latE7, lngE7, sensorHash)`. Auto-verification runs in the same transaction.

---

## Why this shape

A proof has to do three jobs at once:

1. **Be cheap to verify on-chain.** A naive design (upload video to IPFS, ask oracle) costs dollars per task and minutes of latency. Rova's verifier runs two integer comparisons and emits one event. Gas cost: ~50k. Latency: one block.
2. **Be hard to forge cheaply.** A robot that wants to falsify completion has to either (a) spoof GPS at a specific location it isn't at, or (b) replay a hash from a previous successful task. (a) requires expensive RF hardware. (b) is detected because `sensorHash` is committed *before* the destination is set, and the destination + deadline are public, so the same hash can't satisfy two different jobs unless the robot is physically at both places.
3. **Stay debuggable when it fails.** Every rejection is `ProofRejected(jobId, reason)` with a typed reason string: `GPS_MISMATCH`, `SLA_BREACH`, `ALREADY_SUBMITTED`. No "verification failed, contact support" black box.

GPS at E7 precision (10⁻⁷ degree, ≈1.1 cm at the equator) is more than enough resolution for warehouse-scale work. The default tolerance band is **1000 E7 units (≈10 m)**, which absorbs consumer-grade GNSS error (5–8 m) while still rejecting "I'm in the next building" claims.

---

## The two checks the verifier runs

```solidity
function _verify(uint256 jobId) internal {
    Proof storage p = proofs[jobId];
    int64[2] storage dest = jobDestinations[jobId];
    uint256 deadline = jobDeadlines[jobId];

    // 1. SLA check
    if (p.timestamp > deadline) {
        p.rejected = true;
        emit ProofRejected(jobId, "SLA_BREACH");
        return;
    }

    // 2. GPS proximity check
    int64 latDiff = p.latitudeE7 - dest[0];
    int64 lngDiff = p.longitudeE7 - dest[1];
    if (latDiff < 0) latDiff = -latDiff;
    if (lngDiff < 0) lngDiff = -lngDiff;

    if (uint64(latDiff) > gpsTolerance || uint64(lngDiff) > gpsTolerance) {
        p.rejected = true;
        emit ProofRejected(jobId, "GPS_MISMATCH");
        return;
    }

    p.verified = true;
    emit ProofVerified(jobId);
}
```

That is the whole verifier. Two integer comparisons. Auto-verify. The `sensorHash` is *recorded* but not used in the auto-verify path — it exists for off-chain dispute review (see [Dispute path](#dispute-path) below).

---

## Tolerance bands

`gpsTolerance` is admin-settable but defaults to **1000 E7 units**. The constant matters because it's the only knob between "robots get paid for being close enough" and "robots get paid for being in the wrong building."

| Tolerance (E7 units) | Approx. real-world radius | Use case                                                     |
| -------------------- | ------------------------- | ------------------------------------------------------------ |
| 100                  | ~1 m                      | Indoor robot with RTK base station; high-precision pick      |
| 1,000 *(default)*    | ~10 m                     | Mixed indoor/outdoor consumer GNSS; warehouse-scale work     |
| 10,000               | ~100 m                    | Last-mile delivery without precision GPS                     |
| 100,000              | ~1 km                     | Long-haul confirmation; not recommended for paid work        |

Tightening the tolerance is the Operator's responsibility — it's set per-deployment, not per-job, because GPS quality is a function of the physical environment, not the task.

**Why not per-job?** Per-job tolerance lets a malicious agent post a job with a 100 km tolerance and accept a proof from anywhere. Per-deployment tolerance pins the precision to the *environment* the verifier was configured for, which is exactly what an attacker can't trivially change.

---

## The sensor hash

`sensorHash` is `keccak256` of a robot-side record of what happened. Common contents:

- Final-frame camera image hash (raw RGB → keccak256)
- Load-cell reading at pickup and at dropoff (weight delta proves "carried something")
- Inspection sensor output (temperature, RFID scan, photoeye state)
- IMU integration over the last 30 s (proves "moved as expected")

Rova v1 does **not** verify the sensor hash on-chain. It records it. The reason is structural:

- The verifier doesn't know what schema the sensors used.
- Different task types have different sensor profiles (CARRY needs weight; INSPECT needs camera; NAVIGATE needs IMU).
- Forcing a single schema would lock Rova to one robot platform.

What the recorded hash gives you:

- **Dispute leverage.** A client who suspects fraud can demand the robot publish the pre-image. If the pre-image hashes to the recorded `sensorHash`, the client now has the raw sensor data to inspect. If it doesn't, the robot has admitted to lying.
- **Slashing evidence.** In a future v2 ROVA-token slashing flow, the recorded hash is what governance reviews to decide whether to slash the robot's stake.
- **Audit trail.** Insurance, regulators, and large enterprise clients can require sensor records — Rova has the commitment on-chain, the data off-chain, and a cryptographic link between them.

---

## What a robot does, end to end

```
1. Robot finishes the physical motion (task closes per its onboard logic)
2. Robot SDK reads:
     - current GPS (lat, lng) from GNSS module
     - current timestamp
     - sensor frame appropriate to task type
3. SDK computes:
     - latE7, lngE7  (multiply by 1e7, cast int64)
     - sensorHash = keccak256(serialize(sensor_frame))
4. SDK signs and submits:
     ROVAVerifier.submitProof(jobId, latE7, lngE7, sensorHash)
5. Verifier auto-runs the two checks → emits ProofVerified or ProofRejected
6. Anyone (typically the client agent, sometimes the robot SDK itself) calls
     ROVAMarket.settleJob(jobId)
7. If verified: escrow → robot wallet (minus 0.3% protocol fee), surplus → client
   If rejected: escrow → client, 10% of bid slashed from robot's stake
```

Total transactions on the robot side: **one**. Total wait time after task close: **two blocks** (one for `submitProof` to land + auto-verify, one for `settleJob` to settle).

---

## Failure modes and what they look like

### 1. Robot at the wrong location

**Symptom:** `ProofRejected(jobId, "GPS_MISMATCH")` emitted.
**Cause:** Robot finished motion but GPS reading is outside the tolerance band of `jobDestinations[jobId]`.
**Resolution:** No payout, no slash (yet — slash happens at `settleJob` if no successful proof lands). Robot SDK should surface this to the operator as a triage event.

### 2. Robot too late

**Symptom:** `ProofRejected(jobId, "SLA_BREACH")` emitted at `submitProof` time.
**Cause:** `block.timestamp > jobDeadlines[jobId]`.
**Resolution:** Same as GPS_MISMATCH. The robot is now in a "submitted but rejected" state — it can't resubmit. Operator may dispute via the [Dispute path](#dispute-path).

### 3. Robot never finished (no proof at all)

**Symptom:** No `ProofSubmitted` event before `block.timestamp > deadline`.
**Cause:** Robot crashed, lost connectivity, ran out of battery, was physically removed.
**Resolution:** Anyone can call `ROVAMarket.forceFailJob(jobId)` after the deadline. Bounty refunds to client; robot stake slashed 10% of bid.

### 4. GPS signal degraded

**Symptom:** Robot believes it's at the destination but reported coords drift outside tolerance.
**Cause:** Multipath, urban canyon, indoor GNSS unreliability, satellite geometry.
**Mitigation:**
- Tight-tolerance deployments require RTK or differential GPS.
- Indoor deployments should use a fixed `gpsTolerance` calibrated to the environment.
- The Operator's policy can include `requireRtkLock: true` (off-chain SDK check, not contract-level).

### 5. Sensor failure

**Symptom:** Robot can't compute `sensorHash` because the sensor returned an invalid frame.
**Mitigation:** SDK should refuse to submit rather than submit a zero hash. A zero `sensorHash` is technically a valid proof in v1 (contract doesn't reject) — this is a known v1 limitation, fixed in v2 by enforcing per-task-type sensor schemas.

### 6. Replay attack across jobs

**Symptom:** Robot tries to submit the same `sensorHash` for two different jobs.
**Defense:** The hash itself isn't enforced as unique — the *combination* of (jobId, GPS, timestamp) is what's recorded. A replay only succeeds if both jobs share the same destination, deadline, and the robot is physically there twice. The verifier doesn't care about replay; the *economics* do, because two successful proofs require two physical executions.

### 7. Spoofed GPS

**Symptom:** Robot submits valid-looking coords without being there.
**Defense (v1):** None at the protocol level. This is the residual trust assumption — Rova v1 trusts the robot's GNSS module.
**Defense (v2 planned):**
- Multi-signal triangulation (require IMU integration to match GPS path)
- Anchored verification (Operator-installed beacon publishes signed coords; proof must include the beacon signature)
- Camera-based pose attestation (off-chain ML verifies the camera frame is plausibly at the claimed location, posts attestation hash)

GPS spoofing is the load-bearing risk for any onchain proof-of-physical-work system. Rova v1's answer is: pair the protocol with policy. An Operator running expensive jobs should require beacons or RTK before listing a robot — this is what `POLICIES.md` enforces.

---

## Dispute path

If the client is unsatisfied with a verified proof (`ProofVerified` emitted, escrow released, but the client believes the robot lied):

1. Client calls a future `ROVAMarket.disputeJob(jobId)` (v1.5 — not yet in contract).
2. Robot is required to publish the `sensorHash` pre-image within 24 hours.
3. If pre-image doesn't hash to recorded value → automatic 50% slash + full client refund (slash size = governance-set parameter).
4. If pre-image hashes correctly → operator + admin review the raw sensor data. Decision is recorded on-chain as a `DisputeResolved(jobId, ruling)` event.

v1 disputes are off-protocol — clients flag the operator directly; the operator decides. v1.5 adds the on-chain dispute window above.

---

## What proof is *not*

It's worth being explicit about the boundaries:

- **It does not prove correctness.** A proof says "robot was at destination on time with this sensor frame." It does not say "the package was the right one" or "the destination was the right destination" or "the inspection passed." Higher-level correctness is the agent client's responsibility — set the right destination, choose the right robot, dispute when the sensor record disagrees.
- **It does not prove identity beyond the robot's wallet.** The wallet that calls `submitProof` is the wallet that gets paid. If a robot is compromised, the proof is still valid on-chain; the attacker just gets the money. This is why robot wallets are ERC-4337 with operator-controlled session keys (see `AUTH.md`).
- **It does not prove the robot's behavior was safe.** A robot can complete a task and leave a mess. Safety is the operator's policy concern, not the verifier's.

The verifier's job is narrow on purpose: *the robot's wallet claims it was here, at this time, with this sensor record, and the substrate agrees*. Everything else hangs off that.

---

## Why this is the moat

A naive marketplace for robot labor would use either (a) an oracle network (expensive, slow, centralized trust), (b) optimistic settlement with a fraud-proof window (latency, capital lockup), or (c) off-chain attestation by a centralized trust party (fragile, regulatory exposure).

Rova's verifier is **synchronous, on-chain, integer-only, and runs in one transaction**. It accepts that GPS spoofing is a residual risk and pushes that risk to Operator policy where it belongs. The result:

- Settlement happens in seconds, not minutes.
- A robot that completes a task gets paid in the next block.
- Disputes are not the protocol's problem — they're an off-chain process anchored by on-chain commitments.
- New robot platforms can plug in by implementing the SDK's `computeSensorHash(taskType, frame) → bytes32` function. Nothing else changes.

That last bullet is the moat. Every robotics company that wants to monetize idle capacity can do it through Rova in roughly an afternoon of SDK integration, because the verifier doesn't care what kind of robot you are, only whether the wallet that's paid was at the destination on time.

---

## v2 evolution

These are the proof-system changes already scoped for v2:

| Change                                  | Why                                                       | Impact                                                       |
| --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Beacon-anchored coords                  | Defeats GPS spoofing for indoor and adversarial settings  | Operator deploys signed beacons; proof must include beacon attestation |
| Per-task-type sensor schemas            | Forces non-zero sensor hashes; enables structured dispute | Adds a `schemaId` field to proof; verifier rejects unknown schemas |
| Multi-prover proofs                     | Two robots co-witness a high-value task                   | `submitCoProof` with multisig threshold over robot wallets   |
| Camera attestation network              | ML model verifies camera frame is plausibly at GPS coords | Optional `attestationHash` field; tier of robots that pass through it earn premium |
| ZK proof of sensor integrity            | Robot proves sensor wasn't tampered with                  | TEE-attested sensor pipeline → ZK proof posted alongside `submitProof` |

v1 ships with the simple verifier. v2 layers on additional checks *without breaking v1 proofs* — every v2 enhancement is an additional event field, never a replacement for the GPS-and-time core.

---

## Related

- `STATE-MACHINE.md` — how a proof fits in the full task lifecycle
- `POLICIES.md` — how Operators encode "what kind of proof do I trust" as policy
- `ARCH/PROOF-PIPELINE.md` — robot → indexer → verifier → settlement signal path
- `ARCH/ROBOT-SDK-SECURITY.md` — key management for proof signing
- `COMPONENTS/PROOF-RECEIPT.md` — how a proof is rendered in the UI (passing and failing variants)
