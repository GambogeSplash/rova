# AGENT-MONITOR

> Once a job is assigned, the agent subscribes to its event stream. Heartbeats from the robot, on-chain events from the contract, settlement when proof verifies. The agent's window into a running job.

---

## Frame

Monitoring is asynchronous. The agent's `postAndAssign` returned, the chain has the assignment, and now somewhere a robot is moving. The agent's runtime needs to react to:

1. Heartbeats from the robot (off-chain, frequent, fine-grained)
2. Chain events (on-chain, sparse, authoritative)

Both arrive through the same SDK stream — same event types, same handler shape.

---

## API

```ts
const stream = rova.jobs.stream(jobId);

stream.on("assigned", (e) => { /* JobAssigned, immediate confirmation */ });
stream.on("phase", (e) => { /* heartbeat phase update */ });
stream.on("position", (e) => { /* heartbeat with GPS */ });
stream.on("proof", (e) => { /* ProofSubmitted + verify result */ });
stream.on("settled", (e) => { /* JobCompleted */ });
stream.on("failed", (e) => { /* JobFailed */ });
stream.on("disconnect", () => { /* SSE/MQTT lost */ });
stream.on("reconnect", () => { /* SSE/MQTT back */ });

// Async iteration also supported
for await (const event of stream) {
  // ...
}

stream.close();
```

---

## Event shapes

```ts
type StreamEvent =
  | { kind: "assigned"; jobId: string; robotId: string; bid: bigint; deadline: Date; txHash: string }
  | { kind: "phase"; jobId: string; phase: JobPhase; at: Date }
  | { kind: "position"; jobId: string; gps: [number, number]; battery: number; at: Date }
  | { kind: "proof";
       jobId: string;
       lat: number; lng: number; sensorHash: string;
       result: "verified" | { rejected: "GPS_MISMATCH" | "SLA_BREACH" };
       txHash: string }
  | { kind: "settled"; jobId: string; payout: bigint; fee: bigint; refund: bigint; txHash: string }
  | { kind: "failed"; jobId: string; reason: "VERIFICATION_FAILED" | "SLA_BREACH" | "CANCELLED"; txHash: string }
```

All events include `jobId` so they can be routed in a multi-job environment. All include the underlying tx hash for chain auditing where applicable.

---

## Where the events come from

| Event       | Source                                    | Latency             |
| ----------- | ----------------------------------------- | ------------------- |
| `assigned`  | `JobAssigned` event from indexer SSE      | ~3-5s after tx mined |
| `phase`     | MQTT heartbeat from robot                 | ~10s tick           |
| `position`  | MQTT heartbeat from robot                 | ~10s tick           |
| `proof`     | `ProofSubmitted` + `ProofVerified` / `ProofRejected` from indexer | ~3-5s |
| `settled`   | `JobCompleted` from indexer SSE           | ~3-5s |
| `failed`    | `JobFailed` from indexer SSE              | ~3-5s |

The SDK unifies these into one event stream. The agent doesn't have to think about which transport.

---

## Auto-settle (default)

```ts
const rova = createRovaClient({
  autoSettle: true,  // default
  ...
});
```

When `autoSettle: true`, the SDK sees `ProofVerified` and immediately calls `settleJob(jobId)` on its own. The agent doesn't have to.

Two reasons to turn it off:
- The agent wants to inspect proof before releasing (rare; usually overkill)
- The agent runs in a non-tx-signing mode (read-only agent that delegates to a treasurer like June)

If `autoSettle: false`, the SDK still emits `proof` events but doesn't call `settleJob`. The agent must call `rova.jobs.settle(jobId)` manually.

---

## Force-fail (keeper mode)

```ts
const rova = createRovaClient({
  keeperMode: true,
  ...
});
```

When `keeperMode: true`, the SDK calls `forceFailJob(jobId)` when the deadline passes without a proof. Bounty refunds to the agent.

Default is off because:
- Anyone can call `forceFailJob`; there's no race or exclusivity
- An agent might prefer to wait + retry rather than fail (e.g., temporarily congested mempool)
- Public keeper bots will do it for free once they exist

For v1 + v1.5, agents that care about timely refunds should enable `keeperMode`.

---

## Multi-job streams

For agents running many jobs simultaneously, the per-job stream is one option. The "fleet stream" is another:

```ts
const fleetStream = rova.agent.streamMyJobs();

fleetStream.on("event", (e) => {
  // e is any StreamEvent for any of my jobs
  switch (e.kind) {
    case "settled": ... break;
    case "failed": ... break;
    // ...
  }
});
```

One SSE connection covering all the agent's in-flight jobs. Lower overhead at scale.

---

## Backpressure + buffering

The SDK buffers up to 1000 events per stream. If the consumer (the agent's handler) is slower than the producer (the indexer / MQTT), the buffer grows.

At 80% buffer (800 events queued), the SDK logs a warning. At 100%, it starts dropping oldest events with `bufferOverflow: true` flagged.

Practical implication: handlers should be fast. If your handler does `await db.expensiveQuery()`, you may want to push events to your own queue and process out-of-band.

---

## Reconnection

SSE and MQTT both auto-reconnect with exponential backoff:

```
1s → 2s → 4s → 8s → 16s → 30s (cap)
```

On reconnect, the stream emits `reconnect` and replays any events the indexer or MQTT broker has buffered for the agent (24h window for both).

For long-running agents, this means a brief network blip is invisible — events are replayed in order.

For agents that have been disconnected > 24h, replay misses events older than the window. The agent should reconcile by querying `rova.jobs.list({ client: myAddress, settledAfter: lastSeen })`.

---

## Event ordering

Events on a single stream are **time-ordered** — events for a single job arrive in the order they happened.

Between events in the same block: ordered by transaction index, then log index.

Between heartbeat and chain event in the same wall-clock second: ordered by SDK timestamp at receipt (not block timestamp). Heartbeats may slightly lead or lag chain events.

For determinism, the agent should not assume chain events fire before heartbeats of the same phase. It can assume `phase: settled` heartbeat appears AFTER `settled` chain event (the SDK guarantees this by reordering at receipt).

---

## Pending vs finalized events

Indexer fires events twice (see `INDEXER.md` § Reorg handling):

- `pending` — within 12-block confirmation window
- `finalized` — confirmed

The SDK exposes both via a `tier` field on every event:

```ts
stream.on("settled", (e) => {
  if (e.tier === "pending") {
    showOptimisticUI();
  } else if (e.tier === "finalized") {
    updateAccountingLedger();
  }
});
```

Agents that need certainty (accounting, downstream actions) should wait for `finalized`. Agents that want responsiveness (UI updates) can use `pending`.

The default is to emit both. Set `tier: "finalized"` in client config to skip pending events.

---

## Heartbeat freshness

If a robot's heartbeat stops mid-job, the SDK emits a synthetic event:

```ts
stream.on("heartbeat_stale", (e) => {
  // e.staleness_s: number — how long since last heartbeat
});
```

Triggered at 30s, 60s, 120s thresholds (each one fires once).

Agent's recourse:
- Wait (heartbeat may resume)
- Add to "concerning robot" tracker for future filtering
- Cancel? No — can't cancel an ASSIGNED job. Wait for SLA breach.

---

## Cleanup

Streams must be closed when no longer needed:

```ts
stream.close();
```

Forgotten streams hold an SSE connection + buffer. The SDK auto-closes streams when the parent client closes, but per-job stream lifetimes should be explicit.

For `streamMyJobs()` fleet streams, close on agent shutdown.

---

## Edge cases

- **Stream for a non-existent jobId** → emits `error` event with `kind: "NOT_FOUND"`, then closes
- **Stream for a job that's already settled** → emits a synthetic `settled` event with historic data, then closes
- **Indexer down** → falls back to direct RPC subscriptions for chain events; heartbeats unavailable
- **Robot wallet wrong** → impossible at this point (assignment already happened); just monitor
- **Multiple agents subscribe to the same job** → all of them get events independently; indexer handles fan-out

---

## Telemetry

```
monitor.stream.opened              (jobId, mode: single | fleet)
monitor.stream.event_received      (jobId, kind, latency_ms)
monitor.stream.reconnect           (jobId, downtime_ms)
monitor.stream.buffer_overflow     (jobId, dropped_count)
monitor.stream.closed              (jobId)
monitor.auto_settle.triggered      (jobId, lag_ms)
monitor.force_fail.triggered       (jobId)
```

---

## Related

- `AGENT-POST.md` § Phase 4 — where the stream starts
- `AGENT-DISPUTE.md` — what to do after `settled` if outcome is wrong
- `SDK-AGENT.md` — the canonical SDK reference
- `INDEXER.md` — the SSE backend
- `STATE-MACHINE.md` — what each event means in the lifecycle
- `ERRORS.md` § U-02 — disconnect handling
