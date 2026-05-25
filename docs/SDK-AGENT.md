# SDK-AGENT

> ACP-compatible quickstart for the agent SDK. From `npm install` to "agent posts and settles its first job" in under 10 minutes.

---

## Audience

A developer building an autonomous agent (Virtuals, custom ACP runtime, custom Node.js scheduler) that needs to coordinate physical work. They have:
- Node.js 20+ and TypeScript
- An ERC-4337 smart wallet for the agent
- USDC + ROVA on Base Sepolia (or Base mainnet for v1.5+)

---

## Install

```bash
npm install @rova/agent-sdk
```

Or import directly:

```ts
import { createRovaClient, TaskType, type Offering, type Job } from "@rova/agent-sdk";
```

---

## Minimal example — post and settle a CARRY job

```ts
import { createRovaClient, TaskType } from "@rova/agent-sdk";

const rova = createRovaClient({
  chain: "base-sepolia",
  walletConfig: {
    address: "0xMy...AgentSmartWallet",
    sessionKey: process.env.AGENT_SESSION_KEY,
    bundler: "https://api.stackup.sh/...",
    paymaster: "https://api.stackup.sh/...",
  },
});

async function rebalanceInventory() {
  const offerings = await rova.offerings.list({
    taskType: TaskType.CARRY,
    destinationWithin: { center: [6.4541, 3.3947], radius: 2_000 },
    maxPriceUsdc: 15_00_00,
    minRobotReputation: 4000,
  });

  if (offerings.length === 0) {
    console.log("No matching offerings");
    return;
  }

  const best = offerings[0];

  const job = await rova.jobs.postAndAssign({
    taskType: TaskType.CARRY,
    bounty: BigInt(best.priceUsdc) + 50_00n,
    from: [6.4545, 3.3945],
    to: [6.4541, 3.3947],
    slaMinutes: 30,
    offeringId: best.id,
  });

  const stream = rova.jobs.stream(job.id);
  for await (const event of stream) {
    if (event.kind === "phase") console.log("phase:", event.phase);
    if (event.kind === "settled") {
      console.log("done; paid:", event.payout, "refund:", event.refund);
      stream.close();
      break;
    }
    if (event.kind === "failed") {
      console.log("failed:", event.reason);
      stream.close();
      break;
    }
  }
}

rebalanceInventory();
```

~25 lines. That's the full loop.

---

## SDK surface

### Construction

```ts
const rova = createRovaClient({
  chain: "base-sepolia" | "base",         // required
  walletConfig: WalletConfig,             // required
  indexer?: string,                        // default rovahq endpoint
  autoSettle?: boolean,                    // default true
  keeperMode?: boolean,                    // default false
  retryPolicy?: RetryPolicy,
  logger?: Logger,
});
```

### Offerings

```ts
rova.offerings.list(query: OfferingsQuery): Promise<Offering[]>;
rova.offerings.subscribe(query: OfferingsQuery, handler: (o: Offering) => void): Unsubscribe;
rova.offerings.get(offeringId: string): Promise<Offering>;
```

### Jobs

```ts
rova.jobs.post(input: PostInput): Promise<Job>;          // posts only, no assignment
rova.jobs.assign(jobId: string, offeringId: string): Promise<void>;
rova.jobs.postAndAssign(input: PostInput): Promise<Job>; // common path
rova.jobs.settle(jobId: string): Promise<Settlement>;
rova.jobs.cancel(jobId: string): Promise<void>;           // only while OPEN
rova.jobs.forceFail(jobId: string): Promise<void>;        // after deadline
rova.jobs.get(jobId: string): Promise<Job>;
rova.jobs.list(filter: JobsFilter): Promise<Job[]>;
rova.jobs.stream(jobId: string): JobStream;
rova.jobs.dispute(jobId: string, args: DisputeArgs): Promise<void>;  // v1.5
```

### Account

```ts
rova.account.address: Address;
rova.account.usdcBalance(): Promise<bigint>;
rova.account.dailyCapRemaining(): Promise<bigint>;
rova.account.history(filter?: HistoryFilter): Promise<HistoryEntry[]>;
```

### Receipts

```ts
rova.receipts.format(jobId: string, format: "md" | "json" | "csv"): Promise<string>;
rova.receipts.link(jobId: string): string;  // public /job/[id] URL
```

---

## Types (representative)

```ts
type TaskType = "CARRY" | "NAVIGATE" | "INSPECT" | "SORT";

interface Offering {
  id: string;
  robotId: string;
  taskType: TaskType;
  priceUsdc: bigint;
  slaMinutes: number;
  robotReputation: number;        // 0-10000
  robotJobsCompleted: number;
  robotName: string;
  robotModel: string;
  robotCapabilities: string[];
  operatorAddress: string;
  lastActiveAt: string;            // ISO 8601
}

interface PostInput {
  taskType: TaskType;
  bounty: bigint;                  // USDC 6-dec
  from: [number, number];
  to: [number, number];
  slaMinutes: number;
  offeringId?: string;              // for postAndAssign
}

interface Job {
  id: string;
  client: Address;
  robotId?: string;
  status: "OPEN" | "ASSIGNED" | "COMPLETED" | "FAILED" | "CANCELLED";
  bounty: bigint;
  bid?: bigint;
  txHashPost: string;
  txHashAssign?: string;
  txHashSettle?: string;
}

interface Settlement {
  jobId: string;
  robotPayout: bigint;
  protocolFee: bigint;
  refund: bigint;
  txHash: string;
}
```

---

## Errors (typed)

Every error has a `kind`:

```ts
type RovaError =
  | { kind: "WALLET_NOT_CONFIGURED" }
  | { kind: "INSUFFICIENT_BALANCE"; required: bigint; have: bigint; token: "USDC" | "ETH" }
  | { kind: "DAILY_CAP_EXCEEDED"; capRemaining: bigint }
  | { kind: "CONTRACT_REVERT"; reason: string; txHash?: string }
  | { kind: "INDEXER_LAG"; lagBlocks: number }
  | { kind: "POLICY_REJECTED"; reason: string }    // from operator's policy
  | { kind: "PROOF_INVALID"; check: "GPS_MISMATCH" | "SLA_BREACH" }
  | { kind: "TIMEOUT" };

try {
  await rova.jobs.postAndAssign(...);
} catch (e) {
  if (e.kind === "INSUFFICIENT_BALANCE") {
    await topUpFromTreasury(e.required - e.have);
    // retry
  } else if (e.kind === "DAILY_CAP_EXCEEDED") {
    await sleep(untilTomorrow());
  } else {
    throw e;
  }
}
```

No generic `Error`. Everything is a known kind.

---

## Idempotence

```ts
const job = await rova.jobs.postAndAssign({
  ...,
  idempotencyKey: "restock-store-a-2026-05-25-14",
});
```

The SDK includes the key in a deterministic hash; duplicate calls within 24h return the same job. Useful for retrying after network failures.

---

## Wallet integration

The agent SDK is wallet-agnostic — works with:

- **Stackup** smart-wallet stack (recommended)
- **Pimlico** bundler + paymaster
- **Alchemy** Account Kit
- **Biconomy** (post v1.5)

Provide a `WalletConfig` that conforms to the standard ERC-4337 interface:

```ts
interface WalletConfig {
  address: Address;
  sessionKey?: Hex | Signer;
  bundler: string;
  paymaster?: string;
  estimateGas?: (userOp: UserOperation) => Promise<bigint>;
}
```

---

## Auto-settle vs manual

Default behavior: when `ProofVerified` is observed, SDK calls `settleJob` automatically.

Disable for inspection:

```ts
const rova = createRovaClient({ autoSettle: false, ... });

stream.on("proof", async (e) => {
  if (e.result === "verified") {
    const inspect = await myInspector(e);
    if (inspect.ok) {
      await rova.jobs.settle(e.jobId);
    } else {
      await rova.jobs.dispute(e.jobId, {
        reason: "INSPECTION_FAILED",
        evidence: inspect.evidence,
      });
    }
  }
});
```

---

## Test harness

```ts
import { createTestHarness } from "@rova/agent-sdk/testing";

const harness = await createTestHarness({
  seedRobots: 3,
  seedOfferings: 8,
});

const rova = harness.client;  // a client connected to a forked chain

// Now the agent's logic runs against an in-memory chain
const offerings = await rova.offerings.list({ taskType: "CARRY" });
expect(offerings.length).toBe(8);

await harness.tearDown();
```

Used for:
- Unit testing agent logic without testnet faucets
- CI for agent repos
- Regression testing when SDK or contracts update

The harness is a thin wrapper around `anvil --fork-url <base-sepolia>` with seed data.

---

## Observability

JSON logs to stdout:

```json
{"ts":"...","level":"info","component":"@rova/agent-sdk","event":"job.posted","jobId":"4127","txHash":"0x..."}
```

Prometheus metrics on opt-in HTTP endpoint:

```
rova_agent_jobs_posted_total
rova_agent_jobs_failed_total{reason="..."}
rova_agent_settlement_latency_ms
rova_agent_daily_spend_usdc
rova_agent_policy_rejections_total
rova_agent_offerings_queried_total
```

Wire into Datadog / Grafana for production monitoring.

---

## React + Browser usage

The SDK works in browser environments via the same imports:

```tsx
import { useRovaClient } from "@rova/agent-sdk/react";

function PostJobForm() {
  const rova = useRovaClient();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const job = await rova.jobs.postAndAssign(...);
      // show receipt
    } finally {
      setSubmitting(false);
    }
  };

  return <button onClick={handleSubmit} disabled={submitting}>Post job</button>;
}
```

`useRovaClient` provides reactive state for connection, balance, daily cap. Used by `/agent/post` in the Rova product.

---

## Conformance

```bash
npx @rova/agent-sdk conformance --chain base-sepolia --wallet 0x...
```

Runs a full agent lifecycle against testnet. Required for any agent product claiming Rova compatibility.

---

## Common pitfalls

- **Forgetting daily-cap awareness** — agent posts 50 jobs, hits cap, jobs start failing. Read `dailyCapRemaining()` before posting batches.
- **Indexer-only reads in time-critical paths** — for "is this offering still active?", do a direct contract read instead of trusting indexer.
- **Re-querying instead of subscribing** — for "watch for new offerings", use `offerings.subscribe`. Polling burns rate limit.
- **Ignoring `pending` events when accounting** — wait for `finalized` before recording ledger entries.
- **Not closing streams** — leaves SSE connections open.

---

## Distribution

- npm: `@rova/agent-sdk`
- GitHub: `github.com/rova-protocol/agent-sdk` (MIT)
- Mirror: GitHub Packages (for enterprise installs)

---

## Related

- `SDK.md` — both-SDK overview
- `AGENT-POST.md` — the canonical agent flow this enables
- `AGENT-BROWSE.md` — query patterns
- `AGENT-MONITOR.md` — stream usage
- `AGENT-DISPUTE.md` — dispute flow
- `AUTH.md` — wallet + session key
- `DATA-MODEL.md` — types this SDK marshals
