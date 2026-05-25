# ROBOT-REGISTER

> Adding a robot to the fleet after onboarding. Used from `/dashboard/fleet` when an Operator scales up.

This is the "second robot onward" flow. The first robot lives in `ONBOARDING.md`. This flow is similar but tighter — the Operator already has wallet, policy, infrastructure.

---

## Audience

Existing Operator with 1+ robots already registered, wanting to add another. The Operator:
- Has an authenticated SIWE session
- Has a policy authored (which the new robot will inherit by default)
- Has ROVA tokens in their wallet (for stake)

---

## Entry point

```
/dashboard/fleet → [+ Add robot] button → /dashboard/fleet/new
```

Always reachable from the fleet view's top-right corner.

---

## The single form

A one-page form (no multi-step wizard — the Operator is now experienced):

```
┌──────────────────────────────────────────────────────────────┐
│  ADD ROBOT TO FLEET                                          │
│                                                              │
│  Robot name *                                                │
│  [ G1-BETA                                                  ]│
│                                                              │
│  Model *                                                     │
│  [ Unitree G1                                              ▾]│
│                                                              │
│  Stake *                                                     │
│  [ 100 ROVA                                                 ]│
│  ☑ Use same stake amount as G1-ALPHA                         │
│                                                              │
│  Policy *                                                    │
│  ( ) Inherit from G1-ALPHA                                  │
│  ( ) Inherit from G2-OMEGA                                  │
│  ( ) Use template: [ Cautious Warehouse ▾ ]                 │
│  (●) Start from G1-ALPHA's policy and customize             │
│                                                              │
│  Location lock                                               │
│  [ 📍 Same warehouse as G1-ALPHA  (52.4120°, -1.5100°) ▾   ]│
│                                                              │
│  Offerings to publish                                        │
│  ☑ CARRY at $4.50 (matches policy floor)                     │
│  ☑ SORT at $3.00                                             │
│                                                              │
│  Estimated cost: 100 ROVA stake + ~$0.10 in gas              │
│                                                              │
│                                          [Add robot to fleet]│
└──────────────────────────────────────────────────────────────┘
```

### Field rules

- **Robot name** — must be unique within the operator's fleet. Suggested name auto-generates from existing pattern (`G1-ALPHA` → `G1-BETA` → `G1-GAMMA`).
- **Stake** — defaults to most-recent robot's stake. Operator can vary per robot for risk balancing.
- **Policy inheritance** — copying an existing robot's policy is the common path. "Customize" forks a new policy with the parent's values pre-loaded.
- **Location lock** — first robot's location is the default; can be different for distributed fleets.
- **Offerings** — pre-checked based on policy's accepted task types.

---

## Mechanics

Click "Add robot to fleet":

1. Deploy ERC-4337 wallet for this robot (paymaster-sponsored UserOp)
2. `rovaToken.approve(registry, stakeAmount)` — operator signs
3. `ROVARegistry.registerRobot(name, model, walletAddress, stakeAmount)` — operator signs
4. For each checked offering: `ROVARegistry.publishOffering(robotId, taskType, priceUsdc, slaMinutes)`
5. SDK installs session key for the new robot via `ROVAWallet.addSessionKey`

All in one batched UserOp if the operator's wallet supports batching; otherwise sequential txns.

On success: redirect to `/dashboard/fleet/{newRobotId}` showing the new robot card.

---

## Edge cases

- **Name collision** → inline error "Already used by `G1-ALPHA`"
- **Insufficient ROVA balance** → modal with "Need X ROVA to stake. Top up your wallet to continue."
- **Registry call reverts (`InsufficientStake`)** → typed error, retry with corrected amount
- **Network slow during batched UserOp** → show progress per step
- **Operator wants to add 10 robots at once** → bulk-import is a v1.5 feature; v1 directs them to script it via the agent SDK

---

## Telemetry

```
fleet.add_robot.viewed
fleet.add_robot.submitted          (model, stake_amount, policy_choice)
fleet.add_robot.succeeded          (robotId, elapsed_ms)
fleet.add_robot.failed             (step, reason)
```

---

## Related

- `ONBOARDING.md` — the first-robot flow
- `POLICIES.md` — policy inheritance semantics
- `AUTH.md` — wallet provisioning
- `DASHBOARD.md` — where the new robot appears
