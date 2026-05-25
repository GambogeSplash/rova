# ARCH/CONTRACTS

> The four contracts that make Rova a marketplace. How they relate, what they own, how they upgrade.

---

## Frame

Four contracts. Each owns a narrow slice. No contract has dependencies on logic it doesn't need.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│     ROVARegistry          ←──┐                                 │
│       (identity)              │                                │
│                              │  reads identity                 │
│                              │  reads offering                 │
│                              │  records completion              │
│                              │  records slash                  │
│                              │                                 │
│     ROVAMarket  ────────────┘                                  │
│       (jobs + escrow)                                          │
│        │                                                       │
│        │  reads verifier result                                │
│        │  configures destination + deadline                    │
│        ▼                                                       │
│     ROVAVerifier                                               │
│       (proof check)                                            │
│                                                                │
│                                                                │
│     ROVAWallet (one per robot)                                 │
│       (ERC-4337 smart wallet — independent)                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

The dependency arrows are one-way. `ROVAVerifier` doesn't know about `ROVAMarket` (well, it has the `market` address for the `onlyMarket` modifier, but no logic). `ROVAWallet` doesn't know about the marketplace at all — it's a generic ERC-4337 wallet that happens to be used by robots.

This is intentional. One-way dependencies = predictable upgrade paths.

---

## Contract 1 — `ROVARegistry`

**Owns:** Robot identity, capability metadata, stake balance, reputation, Job Offerings, slashing.

**Key methods:**
- `registerRobot(name, model, wallet, stakeAmount) → robotId`
- `deactivateRobot(robotId)`
- `publishOffering(robotId, taskType, priceUsdc, slaMinutes) → offeringId`
- `deactivateOffering(offeringId)`
- `addStake(robotId, amount)`
- `recordCompletion(robotId)` — only callable by `ROVAMarket`
- `slash(robotId, amount)` — only callable by `ROVAMarket`

**Stores:**
- `mapping(uint256 => Robot) robots`
- `mapping(uint256 => JobOffering) offerings`
- `mapping(address => uint256[]) ownerRobots`

**Why it's separate:** Identity is independent of jobs. A robot can exist without ever being assigned a job. Offerings can be published, browsed, and deactivated without `ROVAMarket` being involved.

---

## Contract 2 — `ROVAMarket`

**Owns:** Jobs, escrow, settlement, fees.

**Key methods:**
- `postJob(taskType, bounty, fromLat, fromLng, toLat, toLng, slaMinutes) → jobId` (client locks USDC)
- `assignRobot(jobId, offeringId)` — client only, picks a robot
- `settleJob(jobId)` — anyone, after proof verifies or rejects
- `forceFailJob(jobId)` — anyone, after deadline
- `cancelJob(jobId)` — client only, only while OPEN
- `withdrawFees(to)` — admin only

**Reads:**
- `registry.getOffering(offeringId)` — for assignment validation
- `registry.isRobotActive(robotId)`
- `registry.getRobot(robotId)` — for robot wallet address
- `verifier.isVerified(jobId)` — for settlement decision
- `verifier.isRejected(jobId)` — for settlement decision

**Writes:**
- `verifier.setJobDestination(jobId, lat, lng, deadline)` — on assignment, communicates the destination to the verifier
- `registry.recordCompletion(robotId)` — on success
- `registry.slash(robotId, amount)` — on failure

**Stores:**
- `mapping(uint256 => Job) jobs`
- `mapping(uint256 => Coordinates) jobCoords`
- `mapping(address => uint256[]) clientJobs`
- `mapping(uint256 => uint256[]) robotJobs`
- `accumulatedFees`

---

## Contract 3 — `ROVAVerifier`

**Owns:** Proofs, GPS tolerance, deadlines per job.

**Key methods:**
- `setJobDestination(jobId, latE7, lngE7, deadline)` — only callable by `ROVAMarket`
- `submitProof(jobId, latE7, lngE7, sensorHash)` — anyone (typically the robot)
- `setGpsTolerance(tolerance)` — admin only

**Reads:** Just its own state.

**Internal logic:**
- Auto-verification on `submitProof`: SLA check + GPS proximity check
- Two integer comparisons total

**Events:**
- `ProofSubmitted(jobId, latE7, lngE7, sensorHash)`
- `ProofVerified(jobId)`
- `ProofRejected(jobId, reason)`

**Why separate from `ROVAMarket`:** Proof logic is small and stable. Isolating it means a proof-rule change (e.g., adding beacon attestation in v3) doesn't require redeploying `ROVAMarket` and migrating job state.

---

## Contract 4 — `ROVAWallet`

**Owns:** ERC-4337 smart wallet account per robot. Session-key authorization.

**Key methods:**
- `execute(target, value, data)` — main UserOp entry
- `addSessionKey(keyId, address, validUntil, allowedSelectors[])` — only owner
- `revokeSessionKey(keyId)` — only owner
- `validateUserOp(userOp, hash, missingFunds)` — ERC-4337 standard entry

**Stores:**
- `address owner` — operator's EOA / Safe
- `mapping(bytes32 => SessionKey) sessionKeys`
- `uint256 nonce`

**Why separate:** Wallets are per-robot. They're not part of the protocol surface — they're standard ERC-4337 smart wallets with a session-key extension. Operators could (in theory) use any ERC-4337 wallet that supports session keys; the bundled `ROVAWallet` is the recommended default.

---

## Interface contracts

```solidity
// ROVAMarket → ROVARegistry
interface IRegistry {
    function getOffering(uint256 offeringId) external view returns (JobOffering memory);
    function isRobotActive(uint256 robotId) external view returns (bool);
    function getRobot(uint256 robotId) external view returns (Robot memory);
    function recordCompletion(uint256 robotId) external;
    function slash(uint256 robotId, uint256 amount) external;
}

// ROVAMarket → ROVAVerifier
interface IVerifier {
    function setJobDestination(uint256 jobId, int64 latE7, int64 lngE7, uint256 deadline) external;
    function isVerified(uint256 jobId) external view returns (bool);
    function isRejected(uint256 jobId) external view returns (bool);
}
```

These are minimal. Each consumer reads only what it needs.

---

## Access control

| Method                                | Who can call                              |
| ------------------------------------- | ----------------------------------------- |
| `registerRobot`                       | Anyone (it's a marketplace; permissionless) |
| `deactivateRobot(id)`                 | Robot's owner only                         |
| `publishOffering(robotId, ...)`       | Robot's owner only                         |
| `deactivateOffering(id)`              | Robot's owner only                         |
| `addStake(robotId, amount)`           | Robot's owner only                         |
| `recordCompletion`                    | `ROVAMarket` only (`onlyMarket`)           |
| `slash`                               | `ROVAMarket` only                          |
| `postJob`                             | Anyone (with USDC + approval)              |
| `assignRobot`                         | Job's client only                          |
| `cancelJob`                           | Job's client only                          |
| `settleJob`                           | Anyone (state checks guard correctness)     |
| `forceFailJob`                        | Anyone (state checks guard correctness)     |
| `setJobDestination` (verifier)        | `ROVAMarket` only                          |
| `submitProof`                         | Anyone (state check on job validity)        |
| `setGpsTolerance`                     | Admin only                                  |
| `setProtocolFeeBps`                   | Admin only                                  |
| `withdrawFees`                        | Admin only                                  |

The pattern: permissionless where state checks suffice; tightly scoped where state checks don't.

---

## Storage layouts

All contracts use OpenZeppelin's transparent upgradeable proxy. Storage layout rules:

1. Never re-order fields
2. New fields append only
3. Never change a field's type
4. Mappings are safe — never reorder, but adding new mappings is fine
5. Structs can have appended fields (but not insert in middle)

### Migration tool

A migration runner reads the current storage layout, validates new layout against it (using OpenZeppelin's slot-by-slot diff), and refuses to deploy upgrades that break layout.

---

## Upgrade strategy

Each contract has its own proxy. Upgrades happen independently.

### Normal upgrade (non-breaking)
1. Deploy new logic
2. Multi-sig signs proxy upgrade
3. Proxy points at new logic
4. Old logic remains on-chain for transparency

### Storage-breaking change
1. Deploy as a new contract (e.g., `ROVAMarketV2`)
2. Snapshot old contract's state at a fixed block
3. Migrate snapshot into new contract (write-only, batch)
4. Update `ROVARegistry`'s known `market` address (admin call)
5. Deprecate old market with read-only mode (still settles in-flight jobs)

A storage-breaking change to `ROVAMarket` is the most expensive. We optimize the spec to avoid this — `Job` struct is intentionally minimal so the chance of needing a breaking field is low.

---

## Deployment

### Initial (Base Sepolia, v0)

```
ROVAToken         (ERC-20 — Rova governance token, deployed externally)
ROVAFactoryEntry  (entry-point for ERC-4337)
ROVARegistry      (deployed, initialized with ROVAToken + minStake)
ROVAVerifier      (deployed, market addr set after market deploy)
ROVAMarket        (deployed, references Registry + Verifier + USDC)
Verifier.setMarket(ROVAMarket address)
ROVAWallet        (each robot deploys its own via the factory)
```

Order matters: Registry first (no dependencies), Verifier next (no dependencies), Market after (depends on both), then back-reference Verifier → Market.

### Mainnet (v2)

Same order. Multi-sig (Safe) controls all admin functions. Initial fee 0.3%, admin can lift to 1.0% via governance vote.

---

## Gas budget per operation

Approximate (Base Sepolia, optimized contracts):

| Operation                              | Gas (gas units) | Cost @ 0.1 gwei + $2k ETH |
| -------------------------------------- | --------------- | ------------------------- |
| `registerRobot` (with stake transfer)  | 180k            | $0.036                    |
| `publishOffering`                      | 60k             | $0.012                    |
| `postJob` (with USDC transferFrom)     | 120k            | $0.024                    |
| `assignRobot`                          | 90k             | $0.018                    |
| `submitProof` (with auto-verify)       | 70k             | $0.014                    |
| `settleJob`                            | 100k            | $0.020                    |
| `forceFailJob`                         | 90k             | $0.018                    |
| `slash`                                | 40k             | $0.008                    |

Total cost per successful job: ~$0.05 across all parties.

---

## Test coverage

Foundry tests in `contracts/test/`:

- `ROVARegistry.t.sol` — robot registration, stake, slashing, offerings
- `ROVAMarket.t.sol` — full job lifecycle, race conditions, edge cases
- `ROVAVerifier.t.sol` — GPS tolerance edge cases, deadline boundary
- `ROVAWallet.t.sol` — ERC-4337 conformance, session key authorization
- `Integration.t.sol` — full happy + failure paths across all four contracts

Goal: > 95% line coverage, all named edge cases from `STATE-MACHINE.md` § race conditions covered.

---

## Audit history

| Date       | Auditor              | Scope                         | Findings                                       |
| ---------- | -------------------- | ----------------------------- | ---------------------------------------------- |
| 2026-04-15 | Internal review       | All 4 contracts               | 3 minor; 1 medium; all fixed pre-deploy        |
| 2026-Q3    | (planned)            | All 4 contracts + ERC-4337 wallet | Pre-mainnet audit by Spearbit / Trail of Bits |

Audit reports stored at `contracts/audits/`.

---

## v2 contract evolution

Anticipated changes:
- Dispute extension contract (`ROVADisputes`) — own state, plugs into Market via events
- Multi-warehouse extension (`ROVAOperatorRegistry`) — track operator-level fleets
- ROVA token slashing economics — connect stake slash to token burn / DAO treasury
- Beacon-anchored verification — additional check in `ROVAVerifier._verify`

Each is an additive contract or an additive field. None require breaking changes to v1 storage.

---

## Related

- `STATE-MACHINE.md` — what the contract methods do in lifecycle terms
- `DATA-MODEL.md` § on-chain — entity layouts
- `PROOF.md` — verifier internal logic
- `AUTH.md` — wallet + session key model
- `ROADMAP.md` § v2 — contract upgrade plans
- `OPS/INCIDENT.md` — playbooks for contract emergencies
