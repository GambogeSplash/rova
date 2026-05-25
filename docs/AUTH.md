# AUTH

> Three identity layers — Operator, Agent, Robot. Different wallets, different signing patterns, different revocation paths. Get this right and every other access decision is easy.

---

## The three identities

| Identity     | Wallet type                | Signs                                  | Identified by       |
| ------------ | -------------------------- | -------------------------------------- | ------------------- |
| **Operator** | EOA or smart wallet (Safe) | All policy + fleet management actions  | Wallet address      |
| **Robot**    | ERC-4337 smart wallet      | Job acceptance + proof submission      | Wallet address      |
| **Agent**    | ERC-4337 smart wallet + ERC-8004 entry | Job posting + assignment + settlement | Wallet address + ERC-8004 id |

A single human (the user) typically holds an Operator EOA and may own multiple Robot wallets. Agents are autonomous — the human owner doesn't sign agent transactions; the agent's session key does, under spending caps set by the human.

---

## Operator identity

### What it is

Just a wallet. v1 supports EOAs (MetaMask, Rainbow) and Safe (gnosis-safe.io) — anything that can sign EIP-1271 messages and EIP-191 personal messages.

### How they authenticate to the product

**Sign-In With Ethereum (SIWE)** — EIP-4361.

```
User clicks "Connect wallet" → wallet prompts
User signs a SIWE message with a server-issued nonce
Server validates signature, issues a session cookie (HttpOnly, SameSite=Lax, 7d)
```

The session cookie carries the address. All subsequent requests are scoped to that address — the server doesn't trust a `?address=` query param.

### What they can do

The operator owns:
- Their EOA / Safe (the wallet that calls Rova contracts)
- A set of Robot wallets (ERC-4337) — each robot has one, the operator is the smart-wallet owner
- A local SDK installation that holds the policy + the robot session keys

The operator can:
- Register robots (`ROVARegistry.registerRobot`)
- Stake / unstake ROVA per robot
- Activate / deactivate robots
- Update policies (off-chain)
- Sweep robot earnings to their treasury
- Manage session keys on robot wallets
- Settle / dispute / triage from `/dashboard`

### Recovery

The Operator wallet is their primary key. Loss = loss of access to their fleet's stake. They are responsible. Rova does not custody.

For high-value deployments we recommend Safe (multi-sig + recovery) as the Operator wallet. Single-EOA operators are warned during onboarding.

---

## Robot identity

### What it is

Each robot has a dedicated **ERC-4337 smart wallet** — a contract account, not an EOA. The wallet is owned by the Operator's wallet.

Why ERC-4337:
- Gasless from the robot's perspective (paymaster sponsors)
- Session keys can be rotated without touching the robot's key material
- The robot's key never holds gas tokens
- Standard ecosystem (Stackup, Pimlico, Alchemy bundlers all work)

### How they authenticate to the product

A robot doesn't authenticate to a UI — it authenticates to the chain via signed UserOperations. The SDK on the robot holds a session key (separate from the operator-owned root key) and signs UserOps with that.

```
Robot SDK boot:
1. Load session key from encrypted local store
2. Verify session key is still authorized on the smart wallet (RPC call)
3. If session expired → request new session key from operator (out-of-band)
4. Otherwise → ready to sign UserOps
```

Session keys are time-bound (default 30 days) and call-scoped (can only call specific methods: `submitProof`, `setOffering`, `publishHeartbeat`).

### Session key authorization

The Operator (root owner) calls:

```solidity
ROVAWallet.addSessionKey(
  bytes32 keyId,
  address keyAddress,
  uint256 validUntil,
  bytes4[] memory allowedSelectors
)
```

Stored in the robot's smart wallet contract. Removable any time by the Operator:

```solidity
ROVAWallet.revokeSessionKey(bytes32 keyId)
```

A revoked key can't sign any further UserOps — the smart wallet rejects them.

### What it gives us

- **Robot-level isolation.** Robot 5's session key compromise doesn't compromise robot 6. Slash the key, generate a new one, the rest of the fleet keeps running.
- **No gas management on robots.** The paymaster contract is funded by the operator; robots only sign UserOps.
- **Operator override.** An operator can pull a robot offline by revoking its session key — instant kill switch, no SDK cooperation needed.

### Recovery

If the robot's session key file is corrupted or stolen, the Operator revokes it and issues a new one. The smart wallet (and any escrowed payouts in it) is unaffected.

If the *operator's* root key is lost, the robot wallet is orphaned. This is why we recommend Safe for the operator.

---

## Agent identity

### What it is

An agent is a **Virtuals on-chain agent**. It has:
- An ERC-4337 smart wallet (its "treasury") owned by its human creator
- An entry in the ERC-8004 identity tree (see `[[chaum-project]]`)
- A spending policy set by its creator (max-per-day, max-per-job, allowed contracts)

### How they authenticate to the product

Agents have a UI surface (`/agent/*`) for their human creator. The creator authenticates via SIWE just like an operator.

Agents authenticate to the *chain* via session keys on their smart wallet, signed by the agent's runtime. The agent's session key has a tighter scope than a robot's:

```solidity
allowedSelectors = [
  ROVAMarket.postJob.selector,
  ROVAMarket.assignRobot.selector,
  ROVAMarket.settleJob.selector,
  USDC.approve.selector  // for funding escrow
]
```

The agent can move money — within the per-day cap configured at the smart wallet level.

### Per-day spend cap

Configured at session-key creation:

```solidity
ROVAWallet.addSessionKey(
  keyId,
  keyAddress,
  validUntil,
  allowedSelectors,
  dailySpendCap   // USDC, 6 dec
)
```

Each USDC `transferFrom` from the agent wallet checks the running total for the current day (UTC). Over the cap → revert. Resets at 00:00 UTC.

This is the load-bearing constraint that lets a human authorize an autonomous agent to spend without supervision. The cap is the **leash**.

### ERC-8004 entry

Each agent has an entry in the ERC-8004 registry (see Chaum project, [[chaum-project]]). The entry holds:
- Agent's primary wallet address
- Creator's wallet address
- Permitted delegation tree (which keys can sign on behalf, with which constraints)
- Reputation score (off-chain, signed by reputation oracle)

When a Rova contract sees a `postJob` call, the `ROVAMarket` does *not* check the ERC-8004 entry — it just sees a wallet. The agent's reputation is consumed by:
- Other Operators' policy DSL (`reputationThreshold`)
- Future on-chain insurance contracts (v2)
- The marketing surfaces (`/agent/[address]` public profile)

### Recovery

The agent's session key is rotatable by the creator. The agent's smart wallet itself is the creator's responsibility.

---

## Permissions matrix

| Action                                | Operator | Robot SDK | Agent SDK | Public  |
| ------------------------------------- | -------- | --------- | --------- | ------- |
| Register a robot                      | ✓        | —         | —         | —       |
| Update policy                         | ✓        | —         | —         | —       |
| Submit a proof                        | —        | ✓ *(session)* | —     | —       |
| Publish offering                      | ✓        | ✓ *(session)* | —     | —       |
| Post a job                            | —        | —         | ✓ *(session)* | —   |
| Assign a robot to a job (own job)     | —        | —         | ✓ *(session)* | —   |
| Settle a job                          | —        | ✓ *(opt-in)*  | ✓ *(session)* | ✓ *(anyone — gas only)* |
| Force-fail past-deadline job          | —        | —         | ✓         | ✓ *(anyone)* |
| Dispute a verified job (v1.5)         | —        | —         | ✓ *(creator)* | —   |
| Sweep robot earnings                  | ✓        | —         | —         | —       |
| View a job receipt                    | ✓        | ✓         | ✓         | ✓       |
| View an operator profile              | ✓        | ✓         | ✓         | ✓ *(redacted)* |
| Withdraw protocol fees                | — (only protocol admin) | — | — | — |

"Anyone" rows reflect that the contract methods are `external` without access control — they're permissionless because correctness is enforced by state checks (`isVerified`, `block.timestamp > deadline`), not caller identity.

---

## Middleware

The Next.js app uses middleware to enforce role-based routing:

```typescript
// src/middleware.ts (sketch)
export function middleware(req: NextRequest) {
  const session = req.cookies.get("siwe-session");
  const role    = req.cookies.get("rova-role");

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!session) return NextResponse.redirect("/onboard");
    if (role !== "operator") return NextResponse.redirect(`/${role}`);
  }
  // Similar for /agent, /robot
}
```

The role cookie is set by the AccountSwitcher and bound to the SIWE session. Server can't be tricked by a stale cookie — the session itself is also validated server-side per request.

---

## Audit and logging

Every signed action by every identity is logged to the indexer:

- On-chain: blockchain event log is canonical
- Off-chain: SIWE login + AccountSwitcher pivot + policy change are logged to `audit_log` with (timestamp, address, action, target, ip_hash)
- Robot session-key rotation: logged on-chain (event from `ROVAWallet`)

Audit log is queryable by the operator for their own fleet, by the agent creator for their own agent, by Rova protocol admins for compliance.

---

## What about "user accounts"?

Rova has **no email/password accounts**. Identity is wallet-only.

- "Sign up" = "Connect wallet + sign SIWE"
- "Forgot password" doesn't exist — they hold their keys
- Profile data attaches to the wallet, not to a user record

This is intentional. Onboarding friction is paid up front (wallet install) and then never again. No password resets, no email phishing, no account-takeover via stolen email.

For multi-human teams (a fleet ops team of 4 humans sharing operator access), use Safe with multiple signers. Don't try to model "multi-user single account" — that's a SaaS pattern Rova explicitly rejects.

---

## v2 evolution

| Change                                  | Why                                                          |
| --------------------------------------- | ------------------------------------------------------------ |
| Hardware-backed robot keys              | Defeat key-extraction on compromised robot hosts             |
| Recovery via guardian set per Robot wallet | Operators can configure trusted backups for individual robots |
| Operator team multi-sig with role splits | Larger fleets need ops-eng vs ops-finance separation         |
| Agent → Agent delegation (Chaum native)   | Agents hire sub-agents, all tracked in ERC-8004 tree         |
| Per-task spending caps                   | Beyond per-day — limit specific task types                   |

---

## Related

- `STATE-MACHINE.md` — who can call which contract method per state
- `DATA-MODEL.md` — where wallet addresses key into tables
- `IA.md` — middleware routing on the role cookie
- `[[chaum-project]]` — ERC-8004 identity tree (Rova's sister product)
- `ARCH/ROBOT-SDK-SECURITY.md` — key storage on the robot device
- `OPS/INCIDENT.md` — what to do if a session key is compromised
