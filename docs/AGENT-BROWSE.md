# AGENT-BROWSE

> How an agent discovers what's available. The first SDK call in any Rova-using agent. The query language, the scoring, the gotchas.

---

## Frame

Browse is read-only and free. It hits the indexer, not the chain. Agents call it dozens of times a day, often in tight loops.

The query has to be cheap, the response has to be sortable, and the freshness has to be good enough that an agent isn't picking from stale offerings that no longer exist.

---

## The query

```ts
const offerings = await rova.offerings.list({
  // What
  taskType?: TaskType | TaskType[],     // CARRY, NAVIGATE, INSPECT, SORT
  requiredCapabilities?: string[],      // INDOOR_NAV, RTK_GPS, RAIN_RATED, etc.

  // Where
  destinationWithin?: { center: [lat, lng], radius: meters },
  originWithin?: { center: [lat, lng], radius: meters },

  // Price
  maxPriceUsdc?: bigint,                 // upper bound on bid
  minPriceUsdc?: bigint,                 // lower bound (sanity check)

  // Robot quality
  minRobotReputation?: number,           // 0-10000 scale
  minRobotJobsCompleted?: number,        // experience filter
  operatorAllowlist?: Address[],         // specific operators only
  operatorBlocklist?: Address[],         // exclude operators

  // Timing
  slaMinutesAtLeast?: number,            // offering's SLA ≥ this
  postedAfter?: Date,                    // recent offerings only
  activeOnly?: boolean,                  // default true

  // Pagination
  limit?: number,                        // default 50, max 200
  cursor?: string,                       // opaque cursor from prior call
}): Promise<Offering[]>;
```

Every field is optional. Common minimal query:

```ts
const offerings = await rova.offerings.list({
  taskType: TaskType.CARRY,
  destinationWithin: { center: [6.4541, 3.3947], radius: 2_000 },
});
```

Returns up to 50 active CARRY offerings whose destinations are within 2 km of the given point.

---

## Indexer-side query

The query maps to SQL:

```sql
SELECT o.*, r.reputation, r.jobs_completed, r.owner, r.model, r.capabilities
FROM offerings o
JOIN robots r ON r.robot_id = o.robot_id
WHERE o.active = true
  AND r.active = true
  AND o.task_type = 'CARRY'
  AND r.reputation >= 4000
  AND distance(o.destination, ?) < 2000
  AND o.price_usdc <= 15_00_00
ORDER BY o.priority_score DESC, o.published_at DESC
LIMIT 50;
```

`distance()` uses PostGIS. The indexer materializes a `destination_geo` GiST index for spatial queries.

`priority_score` is a precomputed view combining reputation, recent activity, and operator history — keeps sort order stable without per-query computation.

---

## Response shape

```ts
interface Offering {
  // Identity
  id: string;                           // offering ID (uint256 hex-encoded)
  robotId: string;                      // robot ID

  // Pricing
  priceUsdc: bigint;                    // 6-dec USDC
  slaMinutes: number;

  // Spatial
  origin: [number, number] | null;      // null = robot's last known location
  destinationRadius: number;            // how far they're willing to deliver

  // Robot context
  robotName: string;
  robotModel: string;
  robotReputation: number;              // 0-10000
  robotJobsCompleted: number;
  robotJobsFailed: number;
  robotCapabilities: string[];

  // Operator context
  operatorAddress: string;
  operatorReputation?: number;          // derived from all robots' avg

  // Metadata
  publishedAt: string;                  // ISO 8601
  lastActiveAt: string;                 // last heartbeat or settlement
  estimatedDistance?: number;           // m, only if origin known
  estimatedDurationS?: number;          // s, derived from robot's past avg
}
```

The SDK normalizes types: `priceUsdc` always `bigint`, dates always ISO 8601 strings, no nullable fields silently dropped.

---

## Scoring (client-side)

The indexer returns sortable raw data. **Scoring is the agent's responsibility.** No "best match" magic.

Reference scoring:

```ts
function score(o: Offering, agent: AgentContext): number {
  const repFactor = o.robotReputation / 5000;                          // 0..2, capped
  const priceFactor = 1 - (Number(o.priceUsdc) / Number(agent.budget));// closer to 1 = cheaper
  const histFactor = agent.operatorHistory[o.operatorAddress] ?? 0.5;  // 0..1
  const recencyFactor = Math.max(0, 1 - (Date.now() - new Date(o.lastActiveAt).getTime()) / (24 * 3600 * 1000));

  return 0.35 * repFactor + 0.25 * priceFactor + 0.25 * histFactor + 0.15 * recencyFactor;
}
```

Agents tune these weights. Some agents prefer cheap robots even at lower reputation; some only work with operators they've succeeded with before; some optimize for speed.

The SDK ships a `defaultScorer` for agents that don't want to write their own.

---

## Subscription mode

For agents that need to know when new offerings appear:

```ts
const unsubscribe = rova.offerings.subscribe(
  {
    taskType: TaskType.CARRY,
    destinationWithin: { center: [...], radius: 2_000 },
    minRobotReputation: 4000,
  },
  (offering) => {
    if (score(offering) > 0.7) {
      postJob(offering);
    }
  }
);
```

Backed by SSE. The indexer pushes `OfferingPublished` events that match the filter. New offerings only — already-active matches don't replay.

Use case: a long-running agent monitoring for a niche capability (e.g., RAIN_RATED + OUTDOOR_NAV) that's rare in the market.

---

## Common pitfalls

### 1. Querying without taskType
Returns everything. Slow + noisy. Always pin `taskType` even if the agent supports multiple — issue separate queries.

### 2. Trusting `estimatedDistance` for hot decisions
It's a hint, not a contract. The robot may take a different route. Don't size your bid based on it.

### 3. Re-querying in a tight loop
The indexer rate-limits anonymous reads to 60 req/min, authenticated to 600 req/min. Subscriptions are the right tool for "watch continuously."

### 4. Ignoring `lastActiveAt`
A robot active 6 hours ago likely isn't taking offers right now. Include `lastActiveAt > 30min ago` as a heuristic filter for fresh offerings.

### 5. Stale offerings
The indexer marks `active: false` when `OfferingDeactivated` fires, but there's up to 36s of finality lag. An offering that's <36s deactivated might still appear. The contract revert (`InvalidOffering`) is the safety net.

---

## What the response does NOT include

- The robot's current GPS position (privacy + would expose operator's geofence)
- The robot's current job (race condition — by the time the response lands, the robot may be assigned)
- The robot's full sensor capabilities (capabilities array is a coarse tag set; deep sensor specs are not advertised)
- The operator's identity beyond wallet address (no real names, no avatars in v1)

If an agent needs the robot's current position to estimate travel time, it queries the heartbeat MQTT topic directly — opt-in per robot.

---

## Caching

The SDK does NOT cache offerings between calls. Every `list()` hits the indexer fresh.

The indexer does cache its own queries (Postgres + Redis) for 5 seconds. So two identical queries within 5s return the same data.

Implication for agents: don't rely on "I just queried, so this is fresh." It's fresh-ish. If the agent has been deliberating for more than a few seconds before assigning, re-query.

---

## Authentication

Browse is **public** — no SIWE session required. Anyone can hit `/api/v1/offerings` and see the public marketplace.

Hidden filters (e.g., a private operator-allowlist) require the agent to authenticate. Authenticated reads also raise the rate limit from 60 to 600/min.

---

## Composition with monitoring

After picking an offering and posting a job (see `AGENT-POST.md`), the agent subscribes to that job's stream (see `AGENT-MONITOR.md`). The browse → score → post → monitor → settle pipeline is the agent's core loop.

---

## Telemetry

The SDK emits per-query metrics:

```
agent.offerings.queried           (filter_dimensions, result_count, latency_ms)
agent.offerings.subscribed         (filter_dimensions)
agent.offerings.received_via_sse  (offeringId, time_since_publish_ms)
agent.offerings.score_distribution (p50, p95, max)
```

Used to detect if an agent is over-querying or if scoring is too restrictive (always returning low scores = no jobs ever posted = something's wrong).

---

## Related

- `AGENT-POST.md` — what happens after picking an offering
- `AGENT-MONITOR.md` — watching execution
- `SDK-AGENT.md` — full SDK surface
- `INDEXER.md` — the read-side API this hits
- `DATA-MODEL.md` § offerings table
- `POLICIES.md` — what the robot side filters with (implicit on the response)
