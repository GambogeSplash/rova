# DATA-MODEL

> Every entity in Rova, where it lives (on-chain / indexer / off-chain), how it's keyed, what it references. The schema you build queries against.

---

## Three tiers of state

Rova state lives in three places. They are not interchangeable. Knowing which tier holds a piece of data is half the engineering work.

| Tier            | What lives here                                                | Who writes it             | Who reads it                  | Authoritative?                |
| --------------- | -------------------------------------------------------------- | ------------------------- | ----------------------------- | ----------------------------- |
| **On-chain**    | Identity, escrow, proofs, settlements, stakes, fees            | Contract calls            | Contracts + indexer + anyone  | Yes — single source of truth  |
| **Indexer**     | Materialized views, event-derived aggregates, history caches   | Indexer (off-chain worker) | UI, agent SDKs, API consumers | No — reflects on-chain state  |
| **Off-chain**   | Policies, robot heartbeats, sensor pre-images, user prefs, notes | Robot SDK + Operator UI   | Operator UI + SDK             | No — convenience only         |

Rule: if losing it would cost real money, it goes on-chain. If losing it would lose convenience but not value, it goes off-chain.

---

## On-chain entities

Four contracts. Their data:

### `ROVARegistry` — robots and offerings

```solidity
enum TaskType { CARRY, NAVIGATE, INSPECT, SORT }

struct Robot {
  address owner;          // fleet operator's EOA or smart wallet
  address wallet;         // ERC-4337 wallet receiving payments
  string  name;           // "G1-ALPHA"
  string  model;          // "Unitree G1"
  uint256 stake;          // ROVA staked (1e18)
  uint256 reputation;     // scaled 0–10000 (5000 = 5.0)
  uint256 jobsCompleted;
  uint256 jobsFailed;
  bool    active;
  uint256 registeredAt;   // block.timestamp at registration
}

struct JobOffering {
  uint256 robotId;
  TaskType taskType;
  uint256 priceUsdc;      // 6 decimals
  uint256 slaMinutes;
  bool    active;
}

mapping(uint256 => Robot)       robots;        // robotId → Robot
mapping(uint256 => JobOffering) offerings;     // offeringId → Offering
mapping(address => uint256[])   ownerRobots;   // owner → robotIds[]
uint256 nextRobotId;
uint256 nextOfferingId;
```

### `ROVAMarket` — jobs and escrow

```solidity
enum JobStatus { OPEN, ASSIGNED, COMPLETED, FAILED, CANCELLED }

struct Job {
  address client;             // agent wallet
  uint256 offeringId;
  uint256 robotId;
  TaskType taskType;
  uint256 bounty;             // USDC locked (6 dec)
  uint256 bid;                // robot's offering price at assignment time
  uint256 slaMinutes;
  uint256 createdAt;
  uint256 deadline;
  JobStatus status;
}

struct Coordinates {
  int64 fromLatE7;
  int64 fromLngE7;
  int64 toLatE7;
  int64 toLngE7;
}

mapping(uint256 => Job)         jobs;          // jobId → Job
mapping(uint256 => Coordinates) jobCoords;     // jobId → coords
mapping(address => uint256[])   clientJobs;    // client → jobIds[]
mapping(uint256 => uint256[])   robotJobs;     // robotId → jobIds[]
uint256 nextJobId;
uint256 protocolFeeBps;       // default 30 (0.3%)
uint256 accumulatedFees;
```

### `ROVAVerifier` — proofs

```solidity
struct Proof {
  uint256 jobId;
  int64   latitudeE7;
  int64   longitudeE7;
  uint256 timestamp;
  bytes32 sensorHash;
  bool    verified;
  bool    rejected;
}

mapping(uint256 => Proof)         proofs;            // jobId → Proof
mapping(uint256 => int64[2])      jobDestinations;   // jobId → [latE7, lngE7]
mapping(uint256 => uint256)       jobDeadlines;
uint256 gpsTolerance;     // E7 units; default 1000 (~10 m)
```

### `ROVAWallet` — ERC-4337 robot wallet

```solidity
// Standard ERC-4337 SimpleAccount derivative
address public owner;             // operator EOA, can rotate session keys
mapping(address => bool) public sessionKeys;
uint256 public nonce;
```

### Keys

| Entity         | Key             | Pattern                                |
| -------------- | --------------- | -------------------------------------- |
| Robot          | `uint256`       | Sequential from `0`                    |
| JobOffering    | `uint256`       | Sequential from `0`                    |
| Job            | `uint256`       | Sequential from `0`                    |
| Proof          | `jobId`         | 1:1 with Job — there is at most one proof per job |
| Operator       | `address`       | Owner's wallet                         |
| Agent          | `address`       | Client's wallet                        |
| Robot wallet   | `address`       | ERC-4337 contract address              |

There is no global "operator id" — operators are identified solely by their wallet address. Same for agents.

---

## Indexer entities

The indexer subscribes to contract events, materializes them into query-friendly tables, and serves an HTTP/SSE API. It is **stateless reflection** of on-chain state — wipe and replay should produce identical output.

### Tables (Postgres)

```sql
robots          (robot_id, owner, wallet, name, model, stake, reputation, jobs_completed, jobs_failed, active, registered_at)
offerings       (offering_id, robot_id, task_type, price_usdc, sla_minutes, active, published_at)
jobs            (job_id, client, robot_id, task_type, bounty, bid, sla_minutes, status,
                 created_at, assigned_at, deadline, completed_at, from_lat_e7, from_lng_e7, to_lat_e7, to_lng_e7, tx_hash_post, tx_hash_assign, tx_hash_settle)
proofs          (job_id, lat_e7, lng_e7, timestamp, sensor_hash, verified, rejected, reason, tx_hash)
settlements     (job_id, robot_id, client, robot_payout, protocol_fee, refund, tx_hash, block, chain)
slashes         (robot_id, job_id, amount, reason, tx_hash, block)
events_log      (block, log_index, event_name, args_json, processed_at)
```

### Materialized views

```sql
robot_earnings_daily       (robot_id, date, gross_usdc, net_usdc, completed_count, failed_count)
operator_earnings_daily    (owner, date, gross_usdc, net_usdc, completed_count, failed_count)
agent_spend_daily          (client, date, posted_usdc, settled_usdc, refunded_usdc, dispute_count)
fleet_health               (owner, online_count, offline_count, avg_reputation, avg_completion_time_s)
task_type_market           (task_type, avg_price, median_price, p95_price, last_24h_completed_count)
```

These are refreshed every 60 seconds by a cron worker. The UI hits them, not the raw `jobs` table, for any aggregate.

### Indexer API surface

REST + SSE. No GraphQL (overhead not worth it at this scale).

```
GET  /api/v1/robots                       Paginated list
GET  /api/v1/robots/:id                   Single robot detail
GET  /api/v1/robots/:id/jobs              Robot's job history
GET  /api/v1/offerings                    Active offerings, filterable by taskType/destination/maxPrice
GET  /api/v1/jobs/:id                     Job detail w/ proof + settlement
GET  /api/v1/jobs?client=0x…              Client's posted jobs
GET  /api/v1/jobs?owner=0x…               Jobs assigned to operator's fleet
GET  /api/v1/operators/:address           Operator profile + aggregates
GET  /api/v1/agents/:address              Agent profile + aggregates

SSE  /api/v1/stream/jobs                  Live job events (filtered by query string)
SSE  /api/v1/stream/robots/:id            Live events for one robot
```

Pagination uses `?cursor=` (opaque base64 of last-seen block + logIndex), not offsets. Stable across writes.

---

## Off-chain entities

State that lives in the SDK or operator UI, never on-chain:

### Policies (`POLICIES.md`)

Per-robot JSON document. Stored:
- Locally in the SDK's encrypted state file (`~/.rova/policies/{robotId}.json`)
- Optionally backed up to the operator's Postgres (`operator_policies` table) if they enable cloud sync

Never on-chain. Policy changes don't trigger any contract calls.

### Sensor pre-images

When a robot submits a proof, the on-chain `sensorHash` commits to a sensor frame. The pre-image (the actual sensor data) is:
- Stored locally on the robot's onboard storage for 90 days
- Optionally uploaded to S3 / IPFS by operators with cloud sync enabled
- Required to be producible during a v1.5 dispute

The hash is the cryptographic link. The data is the dispute leverage.

### Robot heartbeats

Robots publish a heartbeat to an MQTT topic (`rova/heartbeat/{robotId}`) every 10 seconds while active. Heartbeat contents:

```json
{
  "robotId": 23,
  "phase": "navigating_pickup",
  "jobId": 4127,
  "gps": [6.6021000, 3.3415000],
  "battery": 0.87,
  "wifi_dbm": -52,
  "policy_version": 1,
  "uptime_s": 18421,
  "ts": 1717023840
}
```

Heartbeats are ephemeral — the indexer ingests them into a Redis sorted set with a 24-hour TTL. The Operator dashboard reads from Redis to render the live fleet map.

### User preferences

Per-user, per-role:
- Sidebar collapsed/expanded
- Default jobs filter
- Notification settings
- Time zone
- Currency display

Stored in the user's wallet-derived encrypted blob via SIWE session, OR in localStorage as a fallback.

### Notes

Per-robot, per-operator. Free-form text. Stored in operator's database.

---

## Cross-references

Some questions need cross-tier joins:

### "Show me G1-ALPHA's earnings this week"
- Indexer query: `robot_earnings_daily WHERE robot_id = 23 AND date >= ...`

### "Was this job verified?"
- On-chain: `verifier.isVerified(jobId)` — authoritative
- Indexer: `proofs WHERE job_id = 4127` — fast cached view

### "Does my robot accept this offer?"
- Off-chain: Robot SDK runs policy DSL evaluation locally
- No on-chain check — policy isn't on-chain

### "What's a robot's stake?"
- On-chain: `registry.robots(robotId).stake` — authoritative
- Indexer: `robots.stake` — eventual consistency, ~1 block delay

---

## Decimals and units

Money: USDC has 6 decimals on-chain. The indexer stores `bounty_usdc` as integer cents (or sometimes as `decimal(18,6)` — pick one and stick). The UI renders `$1.7448` from `1744800` (6 dec).

Reputation: scaled 0–10000 on-chain (`5000 = 5.0`). Indexer stores raw int. UI renders `4.92` from `4920`.

GPS: int64 with E7 precision on-chain (52.412 → 524120000). Indexer stores `_e7 BIGINT`. UI renders `52.4120°N`.

Time: `uint256` seconds since epoch on-chain. Indexer stores `TIMESTAMPTZ`. UI renders human (`2 min ago`) and exact (`14:32:18 UTC`).

Battery: `0.0–1.0` floating in the off-chain heartbeat. UI renders `87 %`.

ROVA stake: 18 decimals on-chain (standard ERC-20). Indexer stores `decimal(36,18)`. UI renders `100 ROVA` from `100000000000000000000`.

---

## Migration philosophy

Contract storage layout is immutable per address. We use an OpenZeppelin TransparentUpgradeable proxy pattern:

- Contracts deployed initially as logic + proxy
- Upgrades preserve storage layout (append-only struct fields, no field-type changes)
- A storage-breaking change requires migration: deploy new contract, snapshot old state, replay events

Indexer migrations are normal Postgres migrations — non-breaking are forward-compat; breaking ones wipe and replay events.

Off-chain state has no migration story — it's per-user and the SDK enforces version compatibility.

---

## Backup and recovery

- **On-chain:** the chain is the backup. Re-sync from genesis or a snapshot block.
- **Indexer:** nightly Postgres dump to S3. Recovery: `pg_restore` + replay events since the dump block.
- **Off-chain policies:** Operator's responsibility. Cloud sync (Postgres-backed) is opt-in.
- **Sensor pre-images:** Robot SDK auto-deletes after 90 days unless flagged as evidence in a dispute. Operators handling regulated workloads should pin to S3 with their own retention.

---

## Related

- `ARCH/CONTRACTS.md` — contract architecture and upgrade flow
- `INDEXER.md` — indexer worker design + reorg handling
- `STATE-MACHINE.md` — transitions that mutate this state
- `AUTH.md` — wallet hierarchy that owns this data
- `PROOF.md` — what's in `Proof` and what's not
