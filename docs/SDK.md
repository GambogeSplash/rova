# SDK

> Two SDK surfaces — one for agents, one for robots. Different runtimes, different concerns, same trust model: the wallet is the identity, the contract is the truth, the SDK is the convenience layer.

This is the system overview. Quickstart specs live in `SDK-AGENT.md` and `SDK-ROBOT.md`.

---

## Two SDKs, by audience

| SDK              | Runtime              | Audience                                          | Distribution               |
| ---------------- | -------------------- | ------------------------------------------------- | -------------------------- |
| `@rova/agent-sdk`  | Node.js (TypeScript) | Virtuals agent builders, autonomous agent runtimes | npm                        |
| `@rova/robot-sdk`  | Python 3.11+         | Robot integrators, ROS2 stacks                     | pip + Docker image         |

Two languages because the audiences live in different ecosystems. Forcing one would alienate half.

### Why TypeScript for the agent SDK

Virtuals agents and ACP integrations live in the JS/TS ecosystem. Node is the LCD runtime for autonomous agents that interact with contracts. Type system catches the most common contract-call mistakes at compile time.

### Why Python for the robot SDK

ROS2 is Python-first in the userspace. Onboard robot compute is typically Linux ARM with Python pre-installed. Camera/sensor SDKs (RealSense, Pollen, Unitree) have Python bindings. Type-hinted with `mypy --strict`; not type-naive Python.

---

## Shared design rules (both SDKs)

These constraints apply to both:

### 1. The contract is the truth

The SDK never caches contract state beyond a single function call. Every authoritative read goes to the chain or to the indexer (with explicit acknowledgement that the indexer is eventually consistent). The SDK does not hold a local mirror of "what the contract said last time."

### 2. The wallet is the identity

The SDK never invents an identity. There are no API keys, no developer tokens, no `rova-api-key` headers. Everything is signed by the wallet the SDK is configured with.

### 3. Read paths are free, write paths are explicit

Read methods (`getRobots`, `getJobs`, `getProof`) return data with no side effects. Write methods (`postJob`, `submitProof`, `assignRobot`) require an explicit `.send()` or `.execute()` call and emit an event the caller subscribes to for confirmation.

### 4. Errors are typed

No `throw new Error("something went wrong")`. Every error is a discriminated union or exception class with a known shape:

```ts
type RovaError =
  | { kind: "WALLET_NOT_CONNECTED" }
  | { kind: "INSUFFICIENT_BALANCE", required: bigint, have: bigint }
  | { kind: "CONTRACT_REVERT", reason: string, txHash?: string }
  | { kind: "INDEXER_LAG", lagBlocks: number }
  | { kind: "POLICY_REJECTED", reason: PolicyRejectReason }
  | { kind: "PROOF_INVALID", check: "GPS_MISMATCH" | "SLA_BREACH" | "ALREADY_SUBMITTED" }
```

The SDK guarantees that every error you receive is one of these known kinds. No generic `Error`.

### 5. Events are first-class

Both SDKs expose an event emitter for every flow they participate in. Polling is supported but discouraged.

---

## `@rova/agent-sdk` — the agent surface

### What it does

- Connect to a Virtuals agent wallet
- Browse active offerings from the indexer
- Score and select offerings against the agent's task constraints
- Post jobs (`ROVAMarket.postJob`)
- Assign robots (`ROVAMarket.assignRobot`)
- Monitor execution (subscribes to chain events + robot heartbeats)
- Settle jobs automatically on `ProofVerified`
- Dispute jobs (v1.5)
- Track spend against per-day cap

### Surface (representative)

```ts
import { createRovaClient, TaskType } from "@rova/agent-sdk";

const rova = createRovaClient({
  wallet: agentSmartWallet,        // ERC-4337 client
  chain: "base-sepolia",
  indexer: "https://indexer.rova.xyz",
});

// 1. Browse
const offerings = await rova.offerings.list({
  taskType: TaskType.CARRY,
  destinationWithin: { center: [6.4541, 3.3947], radius: 2_000 },
  maxPriceUsdc: 15_00_00,         // $15 in USDC 6-dec units
  minRobotReputation: 4000,
});

// 2. Post + assign in one call
const job = await rova.jobs.post({
  taskType: TaskType.CARRY,
  bounty: 9_00_00,
  from: [6.4541, 3.3947],
  to:   [6.4520, 3.3940],
  slaMinutes: 30,
});
await rova.jobs.assign(job.id, offerings[0].id);

// 3. Monitor
const stream = rova.jobs.stream(job.id);
stream.on("phase", (e) => console.log(e.phase));
stream.on("proof", (p) => console.log("verified:", p.verified));
stream.on("settled", (s) => console.log("paid:", s.robotPayout));

// 4. Auto-settle on ProofVerified (default behavior)
//    Override by passing { autoSettle: false } when creating client.
```

### Bundled features

- **Spending cap awareness.** The SDK reads the session-key cap on every `postJob` and refuses to overshoot — failing fast in JS rather than reverting on-chain.
- **Indexer fallback.** If the indexer is slow (`> 2 blocks behind tip`), the SDK warns. If the indexer is unreachable, it falls back to direct RPC reads.
- **Receipt formatter.** `formatReceipt(jobId)` returns a printable markdown receipt for any settled job.
- **Test harness.** `@rova/agent-sdk/testing` exposes a forked-chain harness with seeded robots and offerings — agents can be unit-tested without a live testnet.

---

## `@rova/robot-sdk` — the robot surface

### What it does

- Provision the robot's ERC-4337 wallet (one-time, at install)
- Hold and rotate the session key
- Maintain the policy DSL document
- Listen for incoming offers (via indexer SSE or direct RPC subscription)
- Evaluate offers against the policy
- Publish heartbeats while active
- Compute sensor hashes per task type
- Submit proofs
- Surface fault states to the operator dashboard
- Expose a local HTTP endpoint for operator debug + override

### Surface (representative)

```python
from rova_robot_sdk import Robot, Policy, TaskType, SensorFrame

policy = Policy.from_template("cautious-warehouse").with_overrides(
    accepted_task_types={TaskType.CARRY, TaskType.SORT},
    price_floors={TaskType.CARRY: 4_50_00},
    geofence=GeoFence(lat=(6.40, 6.45), lng=(3.39, 3.40)),
)

robot = Robot(
    robot_id=23,
    wallet_address="0x71C7...4e2F",
    session_key_path="/etc/rova/session.key",
    policy=policy,
    chain="base-sepolia",
)

@robot.on_offer
async def evaluate(offer):
    # Policy check is automatic; this hook fires for additional logic.
    if offer.bounty < 5_00_00:
        return Decision.REJECT
    return Decision.ACCEPT

@robot.on_assigned
async def execute(job):
    await navigate_to(job.from_coords)
    await pickup(job.task_type)
    await navigate_to(job.to_coords)
    await deliver(job.task_type)

    frame = SensorFrame(
        task=job.task_type,
        weight_delta_at_pickup=1400,
        weight_delta_at_dropoff=-1400,
        pickup_image_hash=last_pickup_image.sha256(),
        dropoff_image_hash=last_dropoff_image.sha256(),
        final_position_gps=current_gps(),
        duration_s=job.elapsed_seconds(),
    )
    await robot.submit_proof(job.id, frame)

robot.run()
```

### Bundled features

- **ROS2 adapter.** `from rova_robot_sdk.ros2 import RosBridge` — translates ROS2 topics to Rova SDK events.
- **Sensor hash schemas.** Per-task-type sensor frame schemas with `compute_hash()` built in (`CARRY`, `NAVIGATE`, `INSPECT`, `SORT`).
- **Battery-aware policy.** Robot SDK injects a `battery_floor` constraint (default 30%) that policy can lift.
- **CLI for ops.** `rova-robot status`, `rova-robot rotate-key`, `rova-robot policy edit`, `rova-robot publish-offerings`.

---

## Versioning

Both SDKs follow semver. The "contract version" is independent and tracked separately:

```
@rova/agent-sdk@1.4.2     ← SDK version
contracts: 0.1.0          ← contract semver
```

The SDK declares which contract versions it supports. Talking to an unsupported contract is a startup-time error, not a runtime surprise.

Breaking changes:
- **In the contract:** require a coordinated SDK release that supports both old and new behind a config flag, then deprecate.
- **In the SDK API:** semver-major; a migration guide in the changelog.

---

## Observability

Both SDKs emit structured logs in JSON to stdout:

```json
{
  "ts": "2026-05-25T14:32:18.421Z",
  "level": "info",
  "component": "@rova/agent-sdk",
  "event": "job.posted",
  "jobId": "4127",
  "txHash": "0x4d1f...e8c3",
  "bounty": "9000000",
  "robotId": "23"
}
```

The SDKs export Prometheus-format metrics on an opt-in HTTP endpoint:

```
rova_jobs_posted_total{client=...}
rova_jobs_failed_total{client=...,reason=...}
rova_settlement_latency_ms{client=...}
rova_policy_rejections_total{reason=...}
rova_heartbeats_published_total
rova_proofs_submitted_total{result=...}
```

Operators wire these into Grafana for fleet health. Agents wire them into their existing monitoring.

---

## Distribution

### Agent SDK
- npm: `@rova/agent-sdk`
- GitHub: `github.com/rova-protocol/agent-sdk`
- Mirror on GitHub Packages for enterprise installs

### Robot SDK
- pip: `rova-robot-sdk`
- Docker image: `rova/robot-sdk:1.0` (ARM64 + AMD64)
- Tarball install: `curl https://install.rova.xyz/robot | sh`

Both are MIT licensed. Source-available so operators / agent builders can audit the policy-evaluation paths.

---

## Conformance tests

Both SDKs ship a conformance test suite that runs against any deployment:

```
rova-agent-sdk-conformance --chain base-sepolia
rova-robot-sdk-conformance --chain base-sepolia
```

Tests:
- Wallet connection
- Indexer reach
- Contract method roundtrips
- Event subscription latency
- Policy evaluation correctness
- Sensor hash determinism

Passing the suite is required for any third-party deployment claiming Rova compatibility.

---

## What's *not* in the SDKs

To keep them small:

- **No state persistence** beyond config + policy. Agents and robots store their own runtime state.
- **No retry policy beyond default exponential backoff** for network calls. Application-level retries are the caller's call.
- **No UI components.** SDKs are headless. The dashboard is a separate codebase.
- **No payment integration beyond USDC + ROVA.** Other tokens are a v2 concern.
- **No multi-chain.** Base Sepolia in v1, Base mainnet in v1.5, others in v2.

The dashboard does some things the SDKs do (browse offerings, post a job manually) — duplicated on purpose so an Operator without a Virtuals agent can still test the system.

---

## Related

- `SDK-AGENT.md` — agent SDK quickstart and reference
- `SDK-ROBOT.md` — robot SDK quickstart and reference
- `AUTH.md` — how SDKs use wallets / session keys
- `DATA-MODEL.md` — what types SDKs marshal
- `STATE-MACHINE.md` — what happens between SDK calls
- `INDEXER.md` — the read-side dependency
