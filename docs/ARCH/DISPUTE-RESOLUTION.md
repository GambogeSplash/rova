# ARCH/DISPUTE-RESOLUTION

> The algorithmic + on-chain detail of the v1.5 dispute mechanism. The flow lives in `DISPUTE-RESOLUTION.md`; this is how the machine implements it.

---

## Components

```
ROVADisputes contract                    ← New in v1.5
  ├── opens dispute (bond locked)
  ├── tracks pre-image publication
  ├── records resolutions
  └── triggers refunds + slashes

ROVAResolver (multisig in v1.5; DAO in v2)
  ├── role-checked resolveDispute()
  └── one-of-N threshold

Off-chain evidence layer
  ├── IPFS (preferred)
  ├── pinning service (operator-paid)
  └── on-chain `EvidenceAttached` event with content addresses

UI bridges
  ├── /dashboard/disputes (operator)
  ├── /agent/disputes (agent)
  └── /disputes (public; transparency)
```

---

## The `ROVADisputes` contract

Sits alongside `ROVAMarket` — doesn't modify it. Reads jobs from Market; reads proofs from Verifier.

### Storage

```solidity
struct Dispute {
    uint256 jobId;
    address opener;             // the agent
    uint256 openedAt;
    uint256 claimDeadline;      // openedAt + 24h
    uint256 bondPosted;         // USDC, locked
    bytes32 preImageHash;       // sensorHash from proof, denormalized for cheaper lookup
    bytes   preImage;           // empty until robot publishes
    uint256 preImagePublishedAt;
    DisputeOutcome outcome;     // PENDING / UPHELD / OVERTURNED / INCONCLUSIVE / WITHDRAWN
    uint256 resolvedAt;
    address resolver;            // who settled
    DisputeReason reason;
    EvidenceItem[] evidence;
}

enum DisputeOutcome { PENDING, UPHELD, OVERTURNED, INCONCLUSIVE, WITHDRAWN }

enum DisputeReason {
  DAMAGED_ON_ARRIVAL,
  WRONG_ITEMS,
  NO_ARRIVAL,
  INSPECTION_FALSIFIED,
  SORT_INCORRECT,
  OTHER
}

mapping(uint256 => Dispute) public disputes;       // keyed by jobId
mapping(uint256 => uint256[]) public openDisputesByOperator;
```

### Methods

```solidity
function openDispute(uint256 jobId, DisputeReason reason, EvidenceItem[] calldata evidence) external {
    Job memory job = market.getJob(jobId);
    require(msg.sender == job.client, "NotClient");
    require(job.status == JobStatus.COMPLETED, "JobNotCompleted");
    require(block.timestamp <= settlements[jobId].settledAt + DISPUTE_WINDOW_S, "DisputeWindowClosed");
    require(disputes[jobId].openedAt == 0, "AlreadyDisputed");

    // Lock the bond
    usdc.transferFrom(msg.sender, address(this), DISPUTE_BOND);

    disputes[jobId] = Dispute({
        jobId: jobId,
        opener: msg.sender,
        openedAt: block.timestamp,
        claimDeadline: block.timestamp + 24 hours,
        bondPosted: DISPUTE_BOND,
        preImageHash: verifier.getProof(jobId).sensorHash,
        preImage: "",
        preImagePublishedAt: 0,
        outcome: DisputeOutcome.PENDING,
        resolvedAt: 0,
        resolver: address(0),
        reason: reason,
        evidence: evidence,
    });

    emit DisputeOpened(jobId, msg.sender, reason);
}

function publishPreImage(uint256 jobId, bytes calldata preImage) external {
    Dispute storage d = disputes[jobId];
    require(d.openedAt != 0, "NoDispute");
    require(block.timestamp <= d.claimDeadline, "ClaimWindowClosed");
    require(keccak256(preImage) == d.preImageHash, "PreImageMismatch");
    require(msg.sender == registry.getRobot(market.getJob(jobId).robotId).owner, "NotOperator");

    d.preImage = preImage;
    d.preImagePublishedAt = block.timestamp;
    emit PreImagePublished(jobId);
}

function withdraw(uint256 jobId) external {
    Dispute storage d = disputes[jobId];
    require(msg.sender == d.opener, "NotOpener");
    require(d.outcome == DisputeOutcome.PENDING, "AlreadyResolved");

    d.outcome = DisputeOutcome.WITHDRAWN;
    d.resolvedAt = block.timestamp;

    // 50% bond refund
    usdc.transfer(msg.sender, d.bondPosted / 2);
    emit DisputeWithdrawn(jobId);
}

function resolve(uint256 jobId, DisputeOutcome outcome) external onlyResolver {
    Dispute storage d = disputes[jobId];
    require(d.outcome == DisputeOutcome.PENDING, "AlreadyResolved");
    require(outcome != DisputeOutcome.PENDING && outcome != DisputeOutcome.WITHDRAWN, "InvalidOutcome");

    d.outcome = outcome;
    d.resolvedAt = block.timestamp;
    d.resolver = msg.sender;

    _processResolution(jobId);
    emit DisputeResolved(jobId, outcome, msg.sender);
}

function attachEvidence(uint256 jobId, EvidenceItem[] calldata items) external {
    Dispute storage d = disputes[jobId];
    require(d.openedAt != 0 && d.outcome == DisputeOutcome.PENDING, "InvalidState");
    require(
        msg.sender == d.opener ||
        msg.sender == registry.getRobot(market.getJob(jobId).robotId).owner,
        "NotParty"
    );
    for (uint i = 0; i < items.length; i++) {
        d.evidence.push(items[i]);
    }
    emit EvidenceAttached(jobId, msg.sender, items.length);
}
```

---

## The `_processResolution` algorithm

```solidity
function _processResolution(uint256 jobId) internal {
    Dispute storage d = disputes[jobId];
    Job memory job = market.getJob(jobId);
    Robot memory robot = registry.getRobot(job.robotId);

    if (d.outcome == DisputeOutcome.UPHELD) {
        // Robot wins; agent loses bond
        // Bond stays in contract (burned / sent to protocol fees)
        accumulatedBondPenalties += d.bondPosted;
        // Reputation: agent -20, robot 0
        registry.adjustReputation(robot.robotId, 0);
        // (Agent reputation system arrives in v1.5+; no-op for v1.5 initial)
    }
    else if (d.outcome == DisputeOutcome.OVERTURNED) {
        // Agent wins; robot returns the bid + slashing
        uint256 protocolFee = (job.bid * market.protocolFeeBps()) / 10000;
        uint256 refundAmount = job.bid - protocolFee;

        // Try to claw back from robot wallet
        try usdc.transferFrom(robot.wallet, d.opener, refundAmount) {
            // Success
        } catch {
            // Shortfall — slash stake to cover
            registry.slash(robot.robotId, refundAmount);  // implicit USDC liquidation v2
        }

        // Refund bond
        usdc.transfer(d.opener, d.bondPosted);

        // Additional slash for losing
        uint256 lossSlash = job.bid / 4;  // 25%
        registry.slash(robot.robotId, lossSlash);

        // Reputation: agent +5, robot -50
        registry.adjustReputation(robot.robotId, -50);
    }
    else if (d.outcome == DisputeOutcome.INCONCLUSIVE) {
        // 50/50 split
        uint256 splitAmount = (job.bid - (job.bid * market.protocolFeeBps()) / 10000) / 2;
        try usdc.transferFrom(robot.wallet, d.opener, splitAmount) {
        } catch {
            registry.slash(robot.robotId, splitAmount);
        }

        // 50% bond refund
        usdc.transfer(d.opener, d.bondPosted / 2);
        accumulatedBondPenalties += d.bondPosted / 2;

        // Reputation: agent -5, robot -15
        registry.adjustReputation(robot.robotId, -15);
    }
}
```

---

## Auto-resolution at deadline

A keeper bot (run by Rova protocol) calls `closePastClaimDeadline(jobId)` for disputes whose `claimDeadline` has elapsed:

```solidity
function closePastClaimDeadline(uint256 jobId) external {
    Dispute storage d = disputes[jobId];
    require(d.openedAt != 0 && d.outcome == DisputeOutcome.PENDING, "InvalidState");
    require(block.timestamp > d.claimDeadline, "WindowOpen");

    if (d.preImage.length == 0) {
        // Robot didn't publish — auto-OVERTURNED
        d.outcome = DisputeOutcome.OVERTURNED;
        d.resolvedAt = block.timestamp;
        _processResolution(jobId);
        emit DisputeResolved(jobId, DisputeOutcome.OVERTURNED, address(0));  // address(0) = auto
    } else {
        // Robot published; awaits manual resolution
        // (no action — leaves outcome PENDING)
        return;
    }
}
```

Bad pre-image case (hash mismatch) is impossible — `publishPreImage` reverts on mismatch. So if `preImage.length > 0`, the bytes are guaranteed valid.

---

## Resolver pool (v1.5 → v2)

### v1.5 — Multi-sig

The Rova protocol team is the resolver. `RESOLVER_ROLE` granted to a 2-of-3 Safe controlled by:
- Founder
- Lead engineer
- Trusted advisor

Disputes are reviewed weekly. Median resolution time: 3-5 days.

### v2 — DAO-governed pool

Replaces the Safe with a slashable resolver pool:

- Anyone can stake 10,000 ROVA to enter the resolver pool
- For each dispute, a Schelling commit-reveal selects 5 resolvers (random)
- Resolvers vote in private (commit), then reveal
- Majority outcome wins; minority gets their stake portion slashed
- Resolvers earn a 20% cut of the dispute bond on majority-aligned votes

Game-theoretic: every resolver has reputation + economic skin to vote honestly. Disputes resolve in 24-48h.

---

## Evidence layer

Evidence items are content-addressed pointers, not the content itself:

```solidity
struct EvidenceItem {
    EvidenceKind kind;       // IMAGE, VIDEO, TEXT, SIGNED_ATTESTATION
    bytes32 cid;              // IPFS CID or sha256 of pinned content
    string url;               // primary URL (IPFS gateway or operator CDN)
    string caption;
}
```

The bytes are stored off-chain. The `cid` lets parties verify the URL hasn't been swapped post-hoc.

Failure modes:
- **Pin link dies** — content addressed by CID; another pin can be used. Auto-resolved if any pinning provider has it.
- **Operator removed evidence after the fact** — `cid` mismatch detected by resolver; counts against the operator
- **Agent fakes signed attestation** — signature verification fails; counts against the agent

---

## Dispute lifecycle states (extended state machine)

The job's primary state machine (see `STATE-MACHINE.md`) has `COMPLETED` as terminal. The dispute extension adds:

```
COMPLETED ──disputeJob──> COMPLETED + dispute(PENDING)
                                │
                                │ within 24h, anyone can:
                                │
                                ▼
              ┌─────────────────┬────────────────────┐
              │                 │                    │
              ▼                 ▼                    ▼
      publishPreImage    closePastClaimDeadline   withdraw
              │                 │                    │
              ▼                 ▼                    │
        manual resolve    auto-OVERTURNED            │
              │                 │                    │
              └─────────────────┼────────────────────┘
                                │
                                ▼
              COMPLETED + dispute(OUTCOME)
                  ↑
                  └ terminal
```

A job's "real" status is `(JobStatus, DisputeOutcome)` — both fields needed for accuracy.

---

## Bond economics

`DISPUTE_BOND = $5 USDC`

Game theory:
- Cost to grief one operator: $5 per dispute (or $2.50 if withdrawn)
- Cost is significant relative to the operator's likely $5-10 reward per job
- Operators slowly accumulate reputation; agents who grief lose theirs
- Equilibrium: only honest disputes worth opening

If griefing becomes a problem (agents disputing many won jobs hoping for INCONCLUSIVE 50% refund), governance can:
- Raise the bond
- Make UPHELD outcome cost agent reputation (already does)
- Time-limit between disputes per agent ("rate limit")

---

## Why the architecture is *additive*

The dispute system is a *separate contract*. `ROVAMarket` doesn't change. The `Settlement` event still fires the moment proof verifies. The robot wallet still receives USDC.

The dispute layer:
- Reads from `Market` and `Verifier` (read-only)
- Writes only to its own state + `Registry` (via `slash` + `adjustReputation` calls)
- Pulls funds via `transferFrom` from the robot wallet (which the operator pre-approves at registration)

This means:
- v1 operators can ignore disputes entirely (off-protocol)
- v1.5 disputes don't break v1 contracts
- A future v3 dispute mechanism can replace `ROVADisputes` without touching Market

Additive is the architectural philosophy. Breaking changes are the last resort.

---

## Related

- `DISPUTE-RESOLUTION.md` — the user-facing flow
- `AGENT-DISPUTE.md` — agent's perspective
- `STATE-MACHINE.md` — the primary lifecycle this extends
- `PROOF.md` § Dispute path — what makes this possible
- `ARCH/CONTRACTS.md` — where `ROVADisputes` slots in
- `BIZ/PRICING.md` — bond economics
