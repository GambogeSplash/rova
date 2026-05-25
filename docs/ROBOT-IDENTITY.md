# ROBOT-IDENTITY

> The one-time setup a robot goes through before it can earn. Wallet provisioning, on-chain registration, session-key generation, first offering publication. The boot-up flow that runs once per robot in its lifetime.

---

## Audience

The robot SDK (`@rova/robot-sdk`) running on a robot for the first time. Typically triggered by the Operator's onboarding flow (see `ONBOARDING.md` step 2) or by the "Add robot to fleet" flow (`ROBOT-REGISTER.md`).

The robot itself is not an active participant — the SDK runs the flow autonomously, with the Operator signing the transactions from their wallet.

---

## Pre-conditions

Before this flow can run:
- The robot's host machine has Python 3.11+, `pip`, network access
- The Rova SDK is installed (`pip install rova-robot-sdk`)
- The Operator's wallet is connected to the SDK installer (via a one-time pairing code from `/dashboard`)
- The Operator has approved 100+ ROVA for the registry

---

## The four steps

```
1. Generate keypairs                 (~2 s; local key generation)
2. Deploy ERC-4337 smart wallet      (~10 s; paymaster-sponsored)
3. Register robot in registry        (~10 s; operator-signed)
4. Publish initial offerings         (~5 s × N offerings)
─────────────────────────────────────────────────────────────
                                Total: ~30 s for a typical setup
```

---

## Step 1 — Generate keypairs

The SDK generates locally on the robot:

```python
# Session key for runtime UserOps
session_priv = secrets.token_bytes(32)
session_pub = derive_public_key(session_priv)
session_address = address_from_pub(session_pub)

# Encryption key for sensor pre-images stored locally
sensor_priv = secrets.token_bytes(32)
```

Stored at `/etc/rova/keys/` with 0600 permissions:
- `session.key` — encrypted session keypair (decrypted only at SDK start with passphrase or HSM)
- `sensor.key` — encrypted sensor encryption keypair

The session key is what the robot signs UserOps with day-to-day. The Operator's root key never touches the robot host.

### Edge: HSM-backed

For operators using TPM / Secure Enclave / Yubikey on the robot host, the SDK supports HSM-backed key generation:

```python
robot = Robot(
    ...,
    session_key_provider="tpm",  # or "yubikey", "secure_enclave"
)
```

Keys never leave the secure module. Higher setup cost, much better key protection.

---

## Step 2 — Deploy ERC-4337 smart wallet

The SDK constructs a `ROVAWallet.create()` UserOp (the wallet factory) with:
- Owner: the Operator's root wallet
- Initial session key: the session key from step 1, scoped to `submitProof + publishOffering + publishHeartbeat`
- Session key duration: 30 days (configurable)

Submitted via the bundler with paymaster sponsorship — the Operator doesn't pay gas, Rova's paymaster does.

```
const factory = "0xRova...Factory";
const initCode = factory + encodeFunctionData("createAccount", [operatorAddress, sessionKey, 30 days]);

UserOp = {
  sender: counterfactual_address,
  nonce: 0,
  initCode,
  callData: "0x",
  paymaster: rovaPaymaster,
  signature: signed_by_operator_wallet,
};
```

Bundler includes in next Base block. `RobotWalletCreated(walletAddress, owner, sessionKey)` event fires. SDK reads it, stores the wallet address.

---

## Step 3 — Register in `ROVARegistry`

With the wallet deployed, the SDK constructs the registration call:

```solidity
ROVARegistry.registerRobot(
  name: "G1-ALPHA",       // operator-provided
  model: "Unitree G1",    // operator-provided
  wallet: 0x71C7...4e2F,  // smart wallet from step 2
  stakeAmount: 100e18     // ROVA tokens, approved earlier
)
```

Two transactions:
1. `rovaToken.approve(registry, 100e18)` if not already approved — Operator signs
2. `ROVARegistry.registerRobot(...)` — Operator signs

`RobotRegistered(robotId, owner, name)` event fires. SDK captures the new `robotId`, writes it to local config:

```
/etc/rova/config.toml
[robot]
id = 1
name = "G1-ALPHA"
model = "Unitree G1"
wallet = "0x71C7...4e2F"
operator = "0xabc...123"
```

---

## Step 4 — Publish initial offerings

The Operator's onboarding choice set N offerings (typically 1-2 task types × 1 SLA tier each). For each, the SDK calls:

```solidity
ROVARegistry.publishOffering(robotId, taskType, priceUsdc, slaMinutes)
```

Each is a separate transaction unless batched. Most operators batch all offerings into one UserOp via the smart wallet.

`OfferingPublished(offeringId, robotId, taskType, priceUsdc)` events fire. SDK saves offering IDs locally for runtime reference.

---

## Post-setup state

After this flow completes:
- Robot has an on-chain identity (robotId)
- Robot has a smart wallet that can receive USDC
- Robot has 100 ROVA staked (slashable)
- Robot has at least one active offering visible to agents
- SDK is configured and ready to listen for `OfferReceived` events

The SDK starts heartbeat publishing (`rova/heartbeat/{robotId}`, 10s interval). The Operator's dashboard begins showing the robot as `● active`.

---

## Session key rotation

After 30 days, the session key expires. The SDK handles this:

```python
# SDK boot
if session_key_expires_soon(within=24*3600):
    log.warn("Session key expires in <24h. Triggering rotation.")
    request_rotation_from_operator()
```

The Operator's dashboard surfaces a "Rotate keys" prompt. One click → on-chain `ROVAWallet.addSessionKey(...)` with new key, optionally `revokeSessionKey(...)` on the old one immediately or wait for natural expiry.

In an emergency (suspected compromise), the Operator can rotate ad-hoc via `FLEET-OPS.md` § Rotate session key.

---

## Capability manifest

The SDK exposes capabilities the robot has, off-chain:

```toml
# /etc/rova/capabilities.toml
[capabilities]
INDOOR_NAV = true
OUTDOOR_NAV = false
RTK_GPS = true
LIDAR = true
RAIN_RATED = false
CAMERA_4K = true
PAYLOAD_KG = 10
SUPPORTED_TASK_TYPES = ["CARRY", "SORT"]
```

Capabilities are an off-chain agreement between the Operator (who knows what the robot can do) and the agents (who query against `requiredCapabilities` per `AGENT-BROWSE.md`).

The SDK enforces these by rejecting offers requiring capabilities the manifest doesn't claim.

---

## Deactivation

When a robot is decommissioned (sold, broken, retired):

```python
robot.deactivate()
```

Steps:
1. Mark robot inactive in local config
2. Call `ROVARegistry.deactivateRobot(robotId)` — Operator signs
3. Returns stake to Operator's wallet
4. Robot wallet (ERC-4337) is preserved on-chain for any pending settlement claims, but is now unlinked from the registry

Deactivation is reversible (re-register) but you get a new robotId — your reputation history doesn't transfer.

---

## Edge cases

### Wallet creation reverts
Bundler rejected (paymaster low on funds, malformed initCode). SDK shows operator a structured error, retries with backoff.

### ROVA approval fails
Operator's wallet doesn't have enough ROVA, or didn't sign the approval. SDK pauses; operator must top up + retry.

### Registration succeeds but offering publish fails
Robot is registered, no offerings — robot is invisible to agents. SDK retries on next start. Operator can also retry manually from `/dashboard/fleet/[robotId]`.

### Operator's pairing code expired
Pairing codes are 10-min single-use. SDK shows "Pairing expired — generate a new code from /dashboard."

### Network during setup
Each step is idempotent. SDK can resume from the last completed step. Local config tracks progress.

---

## Telemetry

```
robot.identity.setup_started
robot.identity.keys_generated        (provider: software | tpm | yubikey | enclave)
robot.identity.wallet_deployed       (walletAddress)
robot.identity.registered            (robotId)
robot.identity.offering_published    (offeringId, taskType, priceUsdc)
robot.identity.setup_completed       (totalDurationMs)
robot.identity.setup_failed          (step, reason)
```

---

## Related

- `ONBOARDING.md` § Step 2 — the Operator's view of this flow
- `ROBOT-REGISTER.md` — the multi-robot variant
- `AUTH.md` — session-key + smart-wallet model
- `STATE-MACHINE.md` — what events from this flow trigger
- `SDK-ROBOT.md` — the SDK that runs this
- `FLEET-OPS.md` § Rotate session key — ongoing maintenance
