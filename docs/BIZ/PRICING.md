# BIZ/PRICING

> How Rova makes money. The fee structure, the free/paid tiers, the philosophy.

---

## Frame

Rova charges a small protocol fee on settled work. No subscriptions, no per-seat licensing, no tiered access. Operators and agents using Rova pay only when value is created.

Three principles:

1. **Aligned incentives.** We only earn when our users earn. No "platform fee" decoupled from outcomes.
2. **One number, transparent.** A single percentage on settled bids. Visible in every receipt.
3. **Cheap enough to be ignored.** At 0.3%, a $5 CARRY job costs the robot $0.015. Below the threshold where it changes economic behavior.

---

## The fee

**0.3% of the settled bid** (the `bid`, not the `bounty` — agents over-fund for slippage; we only fee the actual transfer).

```solidity
uint256 fee = (job.bid * protocolFeeBps) / 10000;   // 30 bps = 0.3%
uint256 robotPayout = job.bid - fee;
```

Charged at settlement, deducted from the robot's payout, accumulated in `ROVAMarket.accumulatedFees`. Withdrawable by protocol admin (multi-sig).

### Examples

| Bid       | Fee (0.3%) | Robot receives |
| --------- | ---------- | -------------- |
| $1.00     | $0.003     | $0.997         |
| $5.00     | $0.015     | $4.985         |
| $10.00    | $0.030     | $9.970         |
| $50.00    | $0.150     | $49.850        |
| $500.00   | $1.500     | $498.500       |

At v0-v1 protocol volumes, total fees are tiny. At ~$10k/day in settled work, that's ~$30/day in protocol revenue.

---

## When the fee changes

The fee is governance-settable via `ROVAMarket.setProtocolFeeBps(newFeeBps)`. v1 it's the founder. v2 it's a DAO vote.

**Constraints we commit to:**
- Hard cap: 1.0% (100 bps). Cannot exceed without contract upgrade.
- 30-day notice for any fee increase
- No retroactive fees on in-flight jobs

The cap exists because at >1%, agents would route around Rova for high-value transactions. We've explicitly told the market this won't happen.

---

## Failed-job economics

When a job fails (proof rejected or SLA breach):

- **Bounty returns to client in full** — no protocol fee on failures
- **Robot stake slashed 10% of bid** — slashed ROVA accumulated in registry
- **Slashed ROVA disposition** (governance-controlled):
  - v1: held by registry; ungovernable
  - v1.5: 50% returned to client (compensation for inconvenience), 50% to protocol treasury
  - v2: 100% to insurance pool (covers SLA-breach refunds for premium jobs)

We don't profit from failures. The slash is the protocol's anti-abuse mechanism, not a revenue stream.

---

## Dispute economics

When a dispute is opened, the agent posts a $5 USDC bond:

| Outcome           | Bond goes to                            |
| ----------------- | --------------------------------------- |
| UPHELD (robot wins) | Protocol treasury (anti-griefing)        |
| OVERTURNED (agent wins) | Refunded to agent + additional slash on robot |
| INCONCLUSIVE      | 50% refund to agent + 50% to treasury    |
| WITHDRAWN         | 50% refund + 50% to treasury             |

Bond pool funds:
- v1.5: covers protocol team's manual review cost
- v2: distributed to resolver pool participants as their fee

---

## What's free

Everything that doesn't move money:

- Browsing offerings
- Subscribing to event streams
- Reading job receipts
- Using the simulator
- Reading the SDK conformance test results
- Self-hosting the indexer
- Forking the SDKs
- Reading the docs

The free tier is generous because access is the funnel. If using Rova as a developer costs anything beyond the marginal job fee, adoption suffers.

---

## What's paid (beyond the protocol fee)

In v1, nothing. The 0.3% is the entire monetization.

In v1.5+, optional paid features for operators (not monetization beyond service costs):
- **Cloud sync** of policies + sensor pre-images — $20/mo per fleet, covers our storage cost
- **Enhanced alerts** (Telegram bot, webhooks) — $10/mo
- **API token with elevated rate limits** — $50/mo for 60k req/min

These are pass-through service costs, not margin. We're explicit about that.

---

## What we'll never charge for

- "Premium" matchmaking (agents paying for higher visibility) — corrupts the marketplace
- "Sponsored" robots in agent SDK results — same
- Withdrawing funds from a robot wallet — that's the operator's money
- Reading historical job data
- Listing in the public registry
- Operator API access
- Closing a position / deactivating a robot
- "Faster settlements" — settlements are already block-instant; nothing to accelerate

The pricing surface is intentionally small. Anything not in this doc is not monetized.

---

## Revenue projection (v1 → v2)

These are scenarios, not forecasts. Each row is "if we hit this volume."

| Scale (USDC/day settled) | Daily fee revenue | Annual revenue | Implications                                            |
| ------------------------ | ----------------- | -------------- | ------------------------------------------------------- |
| $1,000                    | $3                | $1,095          | Demo era — covers nothing                                |
| $10,000                   | $30               | $10,950         | Hobby viable, doesn't fund engineering                   |
| $100,000                  | $300              | $109,500        | Modest startup; one senior engineer's salary             |
| $1,000,000                | $3,000            | $1,095,000      | Five-person team viable, lean                            |
| $10,000,000               | $30,000           | $10,950,000     | Real company; mainstream protocol                        |
| $100,000,000              | $300,000          | $109,500,000    | Categorical winner; "Visa for robot work"                 |

The protocol is sustainable starting at ~$1M/day. We expect to cross that within 18 months of v2 mainnet launch if the robotics market expands as expected.

---

## Why not a token-gated fee structure

We considered: "robots staking more ROVA pay lower fees." Rejected because:

- It rewards capital, not capability
- It pushes the price floor up for small operators
- It complicates accounting for everyone
- It's the kind of feature that *looks* clever and *acts* hostile to bootstrappers

The flat fee is the right answer. Same percentage for everyone. The protocol stays a marketplace, not a status game.

---

## Settlement currency

v1-v1.5: USDC on Base (Sepolia testnet, then mainnet).

v2: optional USDC.e (Optimism bridge variant) for agents settling cross-chain. The fee is always taken in the settlement currency — no FX risk for Rova.

Other stablecoins (PYUSD, DAI, FDUSD) considered in v2.5 if operators request. Hard pass on volatile assets — the protocol is a settlement layer, not a derivative position.

---

## Per-jurisdiction notes

Rova is a protocol, not a custody service. Operators handle their own:
- Tax reporting (Rova provides CSV export; not a tax advisor)
- KYC/AML if their jurisdiction requires it for stablecoin holdings
- Robot operations licensing

For Operators in jurisdictions where:
- USDC is restricted: they're responsible for compliance
- Robot operations are regulated: they handle the regulatory layer
- Tax reporting is complex: the export functionality is there; their accountant takes it from there

We document the architecture for legal counsel to review. We don't provide legal cover.

---

## Related

- `BIZ/TOKEN-ECONOMICS.md` — ROVA token economics (v2)
- `BIZ/OPEN-SOURCE.md` — what's free + permissive
- `STATE-MACHINE.md` § settlement — where the fee is applied
- `ARCH/CONTRACTS.md` § ROVAMarket — where the fee lives in code
- `SETTLEMENT-LEDGER.md` — operator's view of the fee in their ledger
