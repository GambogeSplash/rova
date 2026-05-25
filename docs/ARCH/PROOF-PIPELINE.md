# ARCH/PROOF-PIPELINE

> The path a proof takes from robot sensor to operator dashboard. Six hops, three transports, two storage tiers, one chain event.

---

## Frame

When a robot finishes a job, "proof" isn't a single thing — it's a chain of signals that turns physical work into on-chain truth, then into operator-readable UI.

The pipeline:

```
1. Sensor reads        →  robot SDK on-board
2. Sensor frame        →  in-memory struct
3. Sensor hash         →  keccak256(serialize(frame))
4. UserOp signed       →  session key signs
5. Tx mined            →  bundler → Base
6. Auto-verify         →  ROVAVerifier._verify in same tx
7. Indexer ingests     →  Postgres + SSE fan-out
8. UI renders          →  job receipt, dashboard tile, mobile push
```

Each hop has a different transport, latency, and failure mode. Engineers maintaining the system need to know which hop is which when something goes wrong.

---

## Hop 1 — Sensor reads (on-robot)

**Transport:** ROS2 topics / direct hardware drivers
**Latency:** 1–50 ms per sensor
**Failure modes:** Sensor returns NaN, sensor disconnected, sensor frozen

The robot's `@on_assigned` handler calls hardware drivers:

```python
gps = await gnss.read()          # ~10 ms
weight = load_cell.read()        # ~5 ms
image = await camera.capture()   # ~30 ms
```

Each read is non-blocking; the SDK doesn't dictate ordering. The handler decides what to capture.

**What can go wrong:**
- GPS reads zero (signal jammed, building interior) — SDK should pause/retry
- Sensor disconnected — driver throws, handler raises AbortJob
- Stale data (sensor frozen at last reading) — harder to detect; tested via secondary checks

---

## Hop 2 — Sensor frame assembly

**Transport:** In-memory Python dataclass
**Latency:** < 1 ms

The handler returns a `SensorFrame`:

```python
return SensorFrame(
    task=TaskType.CARRY,
    weight_delta_at_pickup=1400,
    weight_delta_at_dropoff=-1400,
    pickup_image_hash=image1_sha,
    dropoff_image_hash=image2_sha,
    final_position_gps=gps,
    duration_s=519,
)
```

The frame is the **commitment** to what the robot saw. Once frozen at this step, it can't be modified — only the hash is sent on-chain, but the bytes are retained locally for dispute.

**What can go wrong:**
- Missing required field for the task type → SDK rejects, raises
- Frame too large (> 10 KB) → SDK rejects (anti-bloat protection)

---

## Hop 3 — Sensor hash

**Transport:** In-process keccak256
**Latency:** < 1 ms

```python
serialized = canonical_serialize(frame)   # deterministic JSON-like bytes
sensor_hash = keccak256(serialized)
```

Determinism is the load-bearing property here. Two runs of the same frame produce the same bytes → same hash. Otherwise dispute resolution fails.

**Canonical serialization rules:**
- Keys sorted alphabetically
- All integers represented as fixed-width big-endian bytes
- All hashes in lowercase hex without 0x prefix
- Strings UTF-8 with no whitespace normalization
- No nested floats — GPS is two int64 fields, not float pair
- Field separator is null byte, never comma/colon

The serializer is in `rova_robot_sdk/serialize.py`. Tested for determinism via property tests (1M random frames must hash identically across runs).

---

## Hop 4 — UserOp signing

**Transport:** ERC-4337 UserOperation, signed by session key
**Latency:** ~5 ms (signing) + bundler processing time

The SDK constructs:

```ts
UserOp = {
  sender: robotWalletAddress,
  nonce: await wallet.getNonce(),
  initCode: "0x",                  // wallet already exists
  callData: encodeFunctionData("submitProof", [jobId, lat, lng, sensorHash]),
  callGasLimit: 200_000,
  verificationGasLimit: 100_000,
  preVerificationGas: 50_000,
  maxFeePerGas: ...,
  maxPriorityFeePerGas: ...,
  paymasterAndData: rovaPaymaster + ...,
  signature: "0x",
}

hash = computeUserOpHash(UserOp, entryPoint, chainId)
UserOp.signature = sessionKey.sign(hash)
```

Submitted to a bundler (Stackup, Pimlico, or Alchemy depending on operator config).

**What can go wrong:**
- Session key expired → SDK detects pre-flight, requests rotation
- Paymaster out of funds → Bundler rejects; SDK falls back to direct gas
- UserOp malformed → Bundler rejects with code; SDK logs + alerts

---

## Hop 5 — Tx mined on Base

**Transport:** Base Sepolia (or mainnet)
**Latency:** 2–6 s for a Base block

The bundler aggregates the UserOp with others; submits a bundle tx; gets included in next block.

`ProofSubmitted(jobId, lat, lng, sensorHash)` event fires.

**What can go wrong:**
- Bundle delayed (paymaster reorg) — wait + retry
- Tx mined but past deadline (late) — verifier rejects with `SLA_BREACH`
- Network congestion (Base outage) — wait + retry with higher gas

---

## Hop 6 — Auto-verify

**Transport:** Same tx as `submitProof` — internal contract call
**Latency:** ~10ms (gas-wise, equivalent to one block of inclusion)

Inside the same transaction, `_verify` runs:

```solidity
function _verify(uint256 jobId) internal {
    Proof storage p = proofs[jobId];
    int64[2] storage dest = jobDestinations[jobId];
    uint256 deadline = jobDeadlines[jobId];

    if (p.timestamp > deadline) {
        p.rejected = true;
        emit ProofRejected(jobId, "SLA_BREACH");
        return;
    }
    int64 latDiff = abs(p.latitudeE7 - dest[0]);
    int64 lngDiff = abs(p.longitudeE7 - dest[1]);
    if (uint64(latDiff) > gpsTolerance || uint64(lngDiff) > gpsTolerance) {
        p.rejected = true;
        emit ProofRejected(jobId, "GPS_MISMATCH");
        return;
    }
    p.verified = true;
    emit ProofVerified(jobId);
}
```

Two events possible in this hop:
- `ProofVerified(jobId)` — success path
- `ProofRejected(jobId, reason)` — failure path

Both fire in the same transaction as `ProofSubmitted`.

**What can go wrong:**
- GPS measurement off (jammed, dropped) → REJECTED, escrow refunds
- Timestamp past deadline → REJECTED, slash
- (No code path that "hangs" — verifier is deterministic)

---

## Hop 7 — Indexer ingests

**Transport:** Indexer worker subscribes to filtered log events; updates Postgres + Redis + SSE
**Latency:** ~36 seconds finalization window (12 blocks × 3s), faster for pending tier

The indexer's event reducer (see `INDEXER.md`):

```ts
on("ProofSubmitted", (event) => {
  INSERT INTO proofs (job_id, lat_e7, lng_e7, sensor_hash, ...)
});

on("ProofVerified", (event) => {
  UPDATE proofs SET verified = true WHERE job_id = ?
  PUBLISH to SSE topic: jobs/${jobId}/proof
});

on("ProofRejected", (event) => {
  UPDATE proofs SET rejected = true, reason = ? WHERE job_id = ?
  PUBLISH to SSE topic: jobs/${jobId}/proof
});
```

Two tiers of emit:
- `pending` — emitted ~3s after tx inclusion
- `finalized` — emitted at +12 blocks

**What can go wrong:**
- Indexer behind tip > 30s → UI shows stale warning
- Reorg of the proof tx → indexer drops pending event, re-fetches
- Indexer down → UI falls back to direct RPC

---

## Hop 8 — UI render

**Transport:** SSE from indexer → React state → DOM
**Latency:** ~50–200 ms from SSE arrival to DOM update

Multiple surfaces consume the proof event:

```
Operator dashboard      Tile 5 (Active jobs) → row updates to "proof_submitted" → "settled"
Operator dashboard      Tile 3 (Alerts) → if rejected, new alert appears
Operator mobile         Push notification if rejected (alert priority)
Agent dashboard         Job stream → handler called with `proof` event
Agent SDK                Auto-settle called on `proof.verified`
Public /job/[id]        Receipt section updates from "pending" to verified state
```

All driven by the same SSE event. The UI's job is: respond to the event quickly, render the new state cleanly, defer non-critical updates (charts, aggregates) to the next animation frame.

**What can go wrong:**
- SSE connection dropped → reconnect; replay missed events from 24h buffer
- DOM update slow (heavy table re-render) → use React's `startTransition`
- Browser tab backgrounded > 1h → mark stale, on focus re-subscribe

---

## End-to-end latency budget

For a successful proof, end-to-end:

| Hop                  | p50    | p95    | p99    |
| -------------------- | ------ | ------ | ------ |
| 1. Sensor read       | 30 ms  | 80 ms  | 200 ms |
| 2. Frame assembly    | 1 ms   | 5 ms   | 10 ms  |
| 3. Hash              | 1 ms   | 2 ms   | 5 ms   |
| 4. UserOp signing    | 5 ms   | 20 ms  | 100 ms |
| 5. Tx mined          | 4 s    | 8 s    | 15 s   |
| 6. Auto-verify       | (inline with #5) | | |
| 7. Indexer ingests   | +3 s   | +5 s   | +10 s  |
| 8. UI render         | +200 ms| +500 ms| +1 s   |
| **Total (pending)**  | **~7 s** | **~15 s** | **~25 s** |
| **Total (finalized)**| **~40 s** | **~50 s** | **~60 s** |

Pending tier is what the operator sees first. Finalized is what they bank on.

---

## Failure-mode mapping

Each hop has a failure surface in `ERRORS.md`:

| Hop | Failure | Doc reference |
| --- | ------- | ------------- |
| 1   | Sensor failure | `ERRORS.md` § P-04, J-02 |
| 4   | UserOp rejected by bundler | `ERRORS.md` § S-03 |
| 5   | Tx mined late | `ERRORS.md` § P-02 |
| 6   | GPS mismatch | `ERRORS.md` § P-01 |
| 6   | SLA breach | `ERRORS.md` § P-02 |
| 7   | Indexer lag | `ERRORS.md` § I-01 |
| 8   | Stale tab | `ERRORS.md` § U-01 |

Operators reading the alert log see the failure type; engineers reading the alert log see which hop in the pipeline broke.

---

## Why this matters

The pipeline is the spec for "what does proof actually verify?" When a customer asks "is this real?", the answer is:

> "The robot signs a GPS reading + timestamp + sensor hash with its session key, posts it to Base in one UserOp, the verifier contract does two integer comparisons in-tx and emits PASS/FAIL. Settlement runs in the next tx. The whole pipeline is on-chain from hop 4 onward — no oracle, no off-chain trust, no API to attack."

Knowing the pipeline lets us answer "what would have to break for proof to be wrong?" — and address each link.

---

## Related

- `PROOF.md` — the substrate doc (what proof is)
- `ROBOT-EXECUTE.md` — the robot side of hops 1–4
- `STATE-MACHINE.md` — what's happening on-chain at hops 5–6
- `INDEXER.md` — hop 7 detail
- `DASHBOARD.md` — hop 8 surface
- `ERRORS.md` — failure-mode catalog
