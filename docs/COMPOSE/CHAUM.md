# COMPOSE/CHAUM

> How Rova composes with [[chaum-project]] — the ERC-8004 agent identity tree. Robot identities and agent identities both live in Chaum's tree, with Rova reading them.

v1.5 / v2 priority. v1 doesn't use Chaum (agents are just wallet addresses).

---

## Frame

Chaum (`/Users/fubara/chaum`) is a separate Rova-family product. It implements ERC-8004 — the standard for agent identity, delegation, and reputation on EVM.

In v1, Rova's "agent" is just a wallet address. There's no on-chain identity beyond "the wallet that called `postJob`."

In v1.5+, Rova reads from Chaum's tree to enrich that thin identity into:
- Delegation chains (this agent acts on behalf of that human / DAO / company)
- Reputation scores (signed by reputation oracles)
- Permitted action scopes (this agent can post jobs up to $X)

The composition: **Chaum holds identity; Rova holds work. They reference each other via wallet addresses.**

---

## What Chaum provides

An on-chain registry mapping:

```
agentAddress (ERC-4337 wallet)
   ↓
ERC-8004 entry {
   creator: address (human or org)
   delegationTree: {
     parent: address (or null for root)
     constraints: {
       allowedActions: [Action ID]
       dailySpendCap: uint256
       expiresAt: uint256
       ...
     }
     children: [agentAddress[]]
   }
   reputationOracles: [{ oracle: address, lastScore: uint, lastScoredAt: uint }]
   metadata: {
     name: string
     description: string
     creator_contact: bytes32 (hash of email/handle)
     ...
   }
}
```

Read via `chaum.getEntry(address)` from a Rova UI or SDK.

---

## What Rova reads from Chaum

### In the dashboard

When an Operator views an incoming offer card:

```
$7.50 CARRY · 12 min SLA
Aboki-Restock-Bot (rep 4.87 · 14 prior jobs)
                                      ↑
                                      ┌──────────────────────────┐
                                      │ Chaum lookup:             │
                                      │   delegation: 4 levels    │
                                      │   creator: Tunde Adeoye   │
                                      │   reputation oracle:       │
                                      │     VirtualsScore: 4.87    │
                                      │     RovaTrack: 4.91         │
                                      │     ChainalysisRisk: low    │
                                      └──────────────────────────┘
```

The Operator can hover/click to see the full identity chain. Higher rep + cleaner delegation = lower perceived risk.

### In policy DSL

Policy primitives extended in v1.5 to reference Chaum:

```json
{
  "creatorAllowlist": ["0x...Tunde", "0x...KnownPartner"],
  "minDelegationDepth": 0,       // 0 = direct ; refuse heavy nested delegations
  "maxDelegationDepth": 2,        // accept up to 2 levels of delegation
  "trustedOracles": ["0x...VirtualsScore", "0x...ChainalysisRisk"],
  "minOracleScore": { "VirtualsScore": 4500 }
}
```

These map to Chaum reads at offer-evaluation time. The robot SDK calls `chaum.getEntry(offer.client)` and checks against the policy.

### In dispute resolution

When a dispute is opened, the dispute UI shows the agent's Chaum profile inline. Resolvers see the agent's full delegation tree + reputation history.

If the same human is creator of multiple agents and they're collectively disputing too often, the resolver can see the pattern.

---

## What Rova writes back to Chaum

In v1.5+ Rova publishes:

- `RovaJobCompleted(jobId, agentAddress, robotAddress, outcome, settledUsdc, completedAt)` event from `ROVAMarket`

Chaum's reputation oracles consume these events to compute scores:
- Successful completion → +reputation
- Disputed and overturned → -reputation
- Disputed and upheld → +small positive (the agent was right but didn't grief)
- Withdrawn dispute → -small

Reputation oracles in v2 are pluggable. Different oracles can weigh the signals differently — Rova doesn't dictate the formula.

---

## Robot identity in Chaum

Robots also get ERC-8004 entries (v2):

```
robotWalletAddress (ERC-4337)
   ↓
ERC-8004 entry {
   creator: operatorAddress
   delegationTree: {
     parent: operatorAddress
     constraints: {
       allowedActions: ["submitProof", "publishHeartbeat"]
     }
   }
   reputationOracles: [{ oracle: RovaRobotRep, lastScore: 4920 }]
   metadata: {
     name: "G1-ALPHA"
     model: "Unitree G1"
     capabilities: ["INDOOR_NAV", "RTK_GPS", ...]
   }
}
```

This makes a robot:
- Discoverable via Chaum (third-party robot directories)
- Reputable via signed oracle scores
- Composable into other agentic systems (a Chaum-aware lending protocol could collateralize against a robot's reputation, e.g.)

Robot identities in Chaum are a v2 work item. v1 robots are just ROVARegistry entries.

---

## The "single human, multi-product" story

A user named Adaeze in Lagos:

```
Adaeze's EOA            ←  her wallet
   │
   ├── Owns G1-ALPHA (Rova robot wallet)
   ├── Owns G1-BETA  (Rova robot wallet)
   ├── Owns G1-GAMMA (Rova robot wallet)
   ├── Created Aboki-Restock-Bot (Rova agent / Chaum entry)
   └── Member of Roztomily Org (Chaum entry, multi-sig)

Each of these is its own ERC-8004 entry in Chaum.
Rova reads them all when computing risk + reputation.
```

The Operator's dashboard and the Agent's dashboard each show a "Chaum identity card" — an authoritative view of who this entity is.

---

## API integration

The Rova indexer subscribes to Chaum events for relevant addresses:

```
Chaum events of interest:
  EntryCreated(address, creator)
  DelegationAttached(parent, child, constraints)
  DelegationRevoked(parent, child)
  ReputationUpdated(address, oracle, newScore)
```

These are denormalized into Rova's `agents` and `robots_chaum_meta` tables for fast joins in the dashboard.

---

## Dependency direction

**Rova depends on Chaum, never the inverse.**

Chaum can exist without Rova. Rova v1 exists without Chaum. v1.5 onward, Rova *enriches* with Chaum but functions without.

If Chaum is unreachable:
- Rova UI shows reputation as "(unknown)" instead of a score
- Policy primitives like `minOracleScore` fall to "no constraint" (permissive)
- Dispute UI shows just the wallet address, no identity card

Graceful degradation. Rova is the marketplace; Chaum is the identity overlay. The marketplace works without the overlay; the overlay just makes it richer.

---

## Why two products, not one

We could merge ERC-8004 identity into ROVARegistry. We don't because:

1. **Separation of concerns.** ROVARegistry knows robots. Chaum knows agent identity. Each is the best at its job.
2. **Reusability.** Chaum identities are useful in many marketplaces (LendingClub-for-agents, agent-job-boards, etc.). Forcing it into Rova would lock it.
3. **Compatibility.** Other agent products that adopt ERC-8004 will already be in Chaum. Rova just queries.

The two-product architecture lets each grow on its own merits while composing cleanly.

---

## Related

- `[[chaum-project]]` — full Chaum project memory
- `AUTH.md` § Agent — Rova's view of agent identity
- `DATA-MODEL.md` — where Chaum reads land in Rova's tables
- `DISPUTE-RESOLUTION.md` — how Chaum-derived rep affects disputes
- `POLICIES.md` § creatorAllowlist / trustedOracles — v1.5 primitives
- `ROADMAP.md` § v1.5 + v2 — when this integration lands
