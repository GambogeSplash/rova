# INDEXER

> The off-chain worker that reads contract events, materializes them into queryable tables, and serves the UI + SDKs. Not a database — a *reflection* of the chain that survives wipe-and-replay.

---

## Why an indexer

Reading every contract state directly is unworkable:
- Browsing 1,000 active offerings requires 1,000 RPC calls
- Filtering jobs by status requires iterating from `jobId=0` upward
- Pagination over a `mapping(uint256 => Job)` doesn't exist on EVM

The indexer solves this by:
- Subscribing to contract events
- Maintaining a Postgres schema with proper indexes
- Serving REST + SSE endpoints that the UI / SDK consume

The indexer is **never authoritative**. It's a cache. If a query returns stale data, the on-chain answer wins.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Base Sepolia RPC + WebSocket (Alchemy / QuickNode primary,     │
│   Infura fallback)                                              │
└──────────────────────┬─────────────────────────────────────────┘
                       │  newHeads + filtered logs subscription
                       ▼
            ┌─────────────────────────┐
            │  Indexer worker         │
            │  (Node.js, viem)         │
            │   ── event reducer       │
            │   ── reorg handler       │
            │   ── materialization     │
            └──────────┬──────────────┘
                       │  upsert / refresh
                       ▼
              ┌─────────────────┐
              │  Postgres 15    │
              │  + Redis 7      │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  HTTP API (Hono)│
              │  + SSE          │
              └─────────────────┘
```

Single-region in v1 (deployed on Fly.io alongside the marketing site). Multi-region replicas in v1.5 for read scaling.

---

## What the indexer subscribes to

All events from the four Rova contracts. Filter:

```
addresses: [ROVARegistry, ROVAMarket, ROVAVerifier]
topics:    [
  RobotRegistered, RobotDeactivated, OfferingPublished, OfferingDeactivated, StakeAdded, StakeSlashed, ReputationUpdated,
  JobPosted, JobAssigned, JobCompleted, JobFailed, JobCancelled, FeesWithdrawn,
  ProofSubmitted, ProofVerified, ProofRejected, JobDestinationSet,
]
```

The `ROVAWallet` contract is *not* indexed by the protocol indexer — robot wallet events are local to the Operator's infrastructure. Operators run their own per-wallet indexer if they want fine-grained UserOp tracking.

---

## The event reducer

For each event, the reducer applies a deterministic mutation to the Postgres state:

| Event              | Mutation                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `RobotRegistered`  | INSERT INTO `robots`                                                       |
| `RobotDeactivated` | UPDATE `robots.active = false`                                             |
| `OfferingPublished`| INSERT INTO `offerings`                                                    |
| `OfferingDeactivated` | UPDATE `offerings.active = false`                                       |
| `JobPosted`        | INSERT INTO `jobs` (status=`OPEN`)                                        |
| `JobAssigned`      | UPDATE `jobs.status = ASSIGNED`, deadline, robot_id, bid                  |
| `ProofSubmitted`   | INSERT INTO `proofs`                                                       |
| `ProofVerified`    | UPDATE `proofs.verified = true`                                            |
| `ProofRejected`    | UPDATE `proofs.rejected = true`, reason                                    |
| `JobCompleted`     | UPDATE `jobs.status = COMPLETED`; INSERT INTO `settlements`                |
| `JobFailed`        | UPDATE `jobs.status = FAILED`                                              |
| `StakeSlashed`     | INSERT INTO `slashes`; UPDATE `robots.stake`                                |
| `ReputationUpdated`| UPDATE `robots.reputation`                                                 |
| `JobCancelled`     | UPDATE `jobs.status = CANCELLED`                                           |

Reducers are **pure** — given an empty database and the full event log, replaying produces the same state. This is the property that makes wipe-and-replay safe.

---

## Reorg handling

Base has fast reorgs (usually within 1–2 blocks of head). The indexer:

1. Stays **N=12 blocks behind chain tip** for materialization. Events deeper than 12 blocks are treated as final.
2. Maintains a **shadow buffer** of unfinalized events (blocks tip−12 → tip). Materialization waits for finality.
3. On a reorg: detect via `newHead.parentHash !== last.hash`. Drop the shadow buffer, re-fetch from the common ancestor, replay.

This means the indexer lags the chain by ~36 seconds (Base block time ~3s × 12). For UI purposes this is invisible — the UI gets the events the *moment* they finalize.

For SSE streams that need lower latency (live dashboard alerts), the indexer emits two event tiers:
- `pending` — emitted as soon as the event lands, before finality
- `finalized` — emitted after 12-block confirmation

The UI is responsible for distinguishing visually (a pending JobAssigned might un-show if reorged).

---

## Read-side: tables

See `DATA-MODEL.md` for full table definitions. Indexer creates and maintains:

- Primary entity tables: `robots`, `offerings`, `jobs`, `proofs`, `settlements`, `slashes`
- Event log: `events_log` (block, log_index, event_name, args_json) — append-only, the system of record
- Materialized views: `robot_earnings_daily`, `operator_earnings_daily`, `agent_spend_daily`, `fleet_health`, `task_type_market`

Materialized views refresh every 60 seconds via cron worker. Stale-by-60s is acceptable for dashboard aggregates; live data hits primary tables directly.

---

## Read-side: API

REST endpoints under `/api/v1/*`. Authenticated reads use the SIWE session cookie; public reads (job receipts) don't need auth.

```
GET  /api/v1/robots
GET  /api/v1/robots/:id
GET  /api/v1/robots/:id/jobs
GET  /api/v1/offerings              # filterable
GET  /api/v1/jobs                   # filterable
GET  /api/v1/jobs/:id
GET  /api/v1/operators/:address
GET  /api/v1/operators/:address/earnings?days=30
GET  /api/v1/agents/:address
GET  /api/v1/agents/:address/spend?days=30

SSE  /api/v1/stream/jobs?owner=...        # operator's fleet jobs
SSE  /api/v1/stream/robots/:id            # one robot's events
SSE  /api/v1/stream/agents/:address       # one agent's jobs
```

### Pagination

Cursor-based. The cursor is an opaque base64-encoded `(block, log_index)` tuple. Stable under writes; can be passed back days later and still resume correctly.

### Filtering

Query parameters map to SQL `WHERE`:

```
GET /api/v1/jobs?status=failed&taskType=CARRY&owner=0xabc...&days=7
```

The indexer validates filter parameters against a known whitelist — arbitrary filter strings are rejected.

### Rate limits

- Anonymous: 60 req/min per IP
- SIWE-authenticated: 600 req/min per address
- SSE: 10 concurrent streams per address

429 with `Retry-After` header. Hard limit (no burst), so clients should obey or be throttled to zero.

---

## Heartbeats (Redis path)

Robot heartbeats don't go through the chain. They come through a separate Redis-backed path:

```
Robot SDK  →  MQTT topic  →  Redis sorted set  →  SSE stream  →  UI
            (rova/heartbeat/{robotId})
```

Redis sorted set scored by `ts`. TTL 24 hours. Operators see the last 24h of heartbeats; older positional data is dropped (privacy + storage).

The MQTT broker (HiveMQ or self-hosted Mosquitto) handles fanout. Operators with strict data-residency requirements can self-host.

---

## Failure modes

| Symptom                              | Cause                                  | Behavior                                                              |
| ------------------------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| Indexer crashes mid-block            | OOM, panic, etc.                       | systemd restart; resume from last persisted block in `events_log`     |
| Postgres unavailable                 | Network partition, db restart          | Indexer halts ingestion; returns 503 on all `/api/*`                  |
| Primary RPC unreachable              | Alchemy outage                         | Fall over to fallback RPC (Infura). Log incident, page on-call.       |
| Reorg deeper than 12 blocks          | Chain-level event (extremely rare)      | Drop everything since the common ancestor, replay from there.         |
| Materialized view refresh slow       | Postgres autovacuum running             | Stale aggregates < 5 min are acceptable; > 5 min triggers alert       |
| MQTT broker down                     | Heartbeat broker outage                 | UI shows "robot heartbeat stale > Ns"; chain state still correct       |

The indexer publishes its own health to a metrics endpoint:

```
indexer_blocks_behind_tip
indexer_events_processed_per_block
indexer_postgres_write_latency_ms
indexer_redis_write_latency_ms
indexer_uptime_s
```

Alerts trigger if `blocks_behind_tip > 30` for > 5 min, or `processed_per_block` drops to 0.

---

## Determinism

The reducer is byte-for-byte deterministic given the same event log + database starting state. This is enforced by:

- No `now()` in mutations — every timestamp comes from the event's block timestamp
- No random IDs — all keys come from event args
- No external HTTP calls in reducers — pure functions of input
- No floating-point arithmetic — money math is integer, GPS is int64

Determinism is what lets the indexer's output be reproducible by any third party with the same RPC access and the same reducer code. **No oracle trust on indexer output.**

---

## Self-hostable

The indexer is shipped as a Docker image:

```
docker run -p 4000:4000 \
  -e POSTGRES_URL=... \
  -e REDIS_URL=... \
  -e RPC_URL=... \
  -e MQTT_URL=... \
  rova/indexer:1.0
```

Operators with strict data-sovereignty needs (regulated industries, gov contracts) run their own indexer against the same on-chain data. They lose the protocol's hosted SSE convenience but keep all read-side data on-prem.

---

## v2 evolution

- **Multi-chain** — index Base mainnet + Optimism + Arbitrum from the same worker; route by chain id in API
- **GraphQL** — alongside REST, for clients that want flexible joins (deferred to v2 because most v1 needs are simple)
- **Webhook delivery** — push events to operator-registered URLs instead of (or alongside) SSE
- **Historical snapshots** — daily Parquet exports to S3 for analytics teams
- **Slashed-event archival** — special long-term storage for slashing events because they have dispute-relevance years later

---

## Related

- `DATA-MODEL.md` — table definitions
- `ARCH/PROOF-PIPELINE.md` — how proof events flow through indexer to UI
- `STATE-MACHINE.md` — the events the reducer is producing tables from
- `OPS/MONITORING.md` — what an Operator watches on their own indexer if self-hosted
- `OPS/DEPLOY.md` — how to run the indexer in production
