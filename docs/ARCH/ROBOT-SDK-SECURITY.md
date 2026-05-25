# ARCH/ROBOT-SDK-SECURITY

> Key management on the robot host. The trust boundary between ROS2 / hardware drivers and the Rova signing path. How to keep a compromised robot from draining its operator.

---

## Threat model

What we defend against:

| Threat                                      | Severity | Likelihood |
| ------------------------------------------- | -------- | ---------- |
| Robot host SSH compromise                    | High     | Medium     |
| Operator laptop compromise (root key theft) | High     | Low        |
| Session key file theft (file read access)   | Medium   | Medium     |
| Side-channel attack on signing operation    | Medium   | Low        |
| Sensor frame tampering (lying about reality) | Medium   | Medium     |
| Network MITM during proof submission        | Low      | Low        |
| Malicious bundler                            | Low      | Low        |
| Quantum break of ECDSA                       | (theoretical) | Decades |

What we don't (yet) defend against:
- Physical robot theft (the wallet is local; theft = compromise)
- Sensor spoofing at the hardware level (GPS jammer in the robot's vicinity)
- Operator coercion (key signed under duress)

---

## Key hierarchy

```
Operator's root key (EOA or Safe)
   ▼
   owns
   ▼
Robot's ERC-4337 smart wallet  (one per robot)
   ▼
   authorizes
   ▼
Session key (per-robot, time-bound, call-scoped)
   ▼
   signs
   ▼
UserOps (submitProof, publishOffering, publishHeartbeat)
```

Each layer can be revoked independently. Compromise of a session key doesn't expose the smart wallet's funds — the attacker can only call the scoped methods.

---

## Session key storage

### Default (software-only)

Stored at `/etc/rova/keys/session.key`:
- AES-256-GCM encrypted
- Passphrase derived from `/etc/rova/master.key` (a randomly-generated file with 0400 perms)
- Decrypted at SDK start, held in memory
- File permissions enforced: 0600, owned by `rova` user

Compromise vector: file-system access to both `session.key` AND `master.key`. Mitigated by:
- Separating files (in case of partial backup leak)
- 0400 on master.key (not even read access for `rova` user — must run with elevated initial perms, then drop)
- Audit logging access attempts via `auditd`

### TPM-backed

For robots with TPM 2.0:

```python
robot = Robot(...).with_session_key_provider("tpm")
```

The session key never leaves the TPM. Signing is delegated to the chip. The kernel sees signatures, never the key.

Compromise vector: only physical extraction of the TPM. SSH-level compromise can sign things while running but can't exfiltrate the key for later use.

### YubiKey-backed

For high-value deployments:

```python
robot = Robot(...).with_session_key_provider("yubikey", slot=9c)
```

User-presence required for each signature — meaning a human (operator) must physically tap the key to authorize each UserOp. Not viable for autonomous robots; viable for high-value attended deployments (e.g., regulated INSPECT jobs in healthcare).

### Secure Enclave (Apple Silicon hosts)

Some operators run robot SDKs on Mac mini hosts:

```python
robot = Robot(...).with_session_key_provider("secure_enclave")
```

Key in Secure Enclave; signing via Touch ID or programmatic policy.

---

## Session key scope

A session key isn't a "do anything" key. It's bound to specific contract methods:

```solidity
sessionKey.allowedSelectors = [
  ROVAVerifier.submitProof.selector,
  ROVARegistry.publishOffering.selector,
  ROVARegistry.deactivateOffering.selector,
  // NOT: ROVARegistry.deactivateRobot, ROVAWallet.execute (with arbitrary target)
];
```

`ROVAWallet.validateUserOp` checks the `callData` selector against `allowedSelectors`. A session key trying to call `execute(arbitraryTarget, ...)` reverts.

Why this matters: even with full compromise of the session key, an attacker can only:
- Submit (potentially invalid) proofs — they'd be rejected by verifier
- Publish or deactivate offerings — annoying but recoverable
- Cannot drain the wallet's USDC (no `transfer` selector)
- Cannot deactivate the robot or unstake (operator-only methods)

---

## Session key TTL

Default 30 days. Configurable per-deployment:

```toml
[security]
session_key_validity_days = 30
session_key_rotation_warning_days = 5  # warn operator 5 days before expiry
```

At expiry:
- The smart wallet's `validateUserOp` rejects signatures from the key
- SDK detects expiry; pauses + alerts operator
- Operator rotates via `FLEET-OPS.md` § Rotate session key

Short TTL is good — limits damage from undetected key theft. Long TTL is good — fewer ops-burden rotations. Default 30d is a middle ground.

---

## What gets signed

Three signing operations a session key performs:

1. **UserOperation signing.** Standard ERC-4337 hash → ECDSA → 65-byte signature.
2. **Heartbeat signing.** Lighter weight — the heartbeat MQTT message is signed so consumers can verify it came from the robot. Used by operator dashboards to detect spoofed heartbeats.
3. **Receipt verification challenge.** A future v2 feature: the SDK can prove a robot's identity to a third party off-chain by signing a challenge nonce.

All three use the same private key with different message domains (EIP-191 v1, our own MQTT prefix, EIP-712 typed data).

---

## Compromised key playbook

If an operator suspects a session key compromise:

1. Operator dashboard → `/dashboard/fleet/[robotId]` → "Rotate session key" → confirm
2. SDK on the robot picks up the new key at next heartbeat (≤ 10s)
3. Old key explicitly revoked via `ROVAWallet.revokeSessionKey(oldKeyId)` — happens automatically after new key is verified active
4. Operator reviews recent UserOps signed by the suspect key (via Basescan / indexer)
5. Any unauthorized actions during the suspect window: file dispute, contact protocol team for emergency stake-recovery (not automated yet)

If the operator suspects the *operator's* root key is compromised:
1. Transfer the smart wallet's `owner` to a fresh wallet (via `transferOwnership` on `ROVAWallet`)
2. Re-rotate session keys from the new owner
3. Move USDC out of any robot wallets to a new treasury
4. This is a manual process — no automated "panic" button

---

## Hardware drivers — trust boundary

The Rova SDK trusts these drivers:
- GPS / GNSS / RTK module (reads `gps.fix`)
- Load cell driver (reads `weight`)
- Camera SDK (reads frames)
- IMU (reads orientation)

If a driver is compromised, it can:
- Report wrong GPS coords (rejected by verifier in the GPS check)
- Report wrong weight (no on-chain check; would fail dispute pre-image inspection)
- Report wrong image (same as weight)

The Rova SDK is a downstream consumer. We can't verify hardware. We can:
- Hash the raw sensor data so disputes can inspect it
- Cross-check GPS against IMU integration (v2 — physical consistency check)
- Reject suspicious values (NaN, out-of-range, frozen) before submitting

The trust assumption: a robot's *operator* is responsible for ensuring its sensors are intact. If the operator is fielding compromised hardware, that's a business problem, not a protocol problem.

---

## Network security

Robot SDK network calls:
- HTTPS to Rova bundler (TLS 1.3, cert-pinned)
- WSS to Rova indexer for offerings (TLS 1.3)
- TLS-secured MQTT to heartbeat broker (cert-pinned)
- HTTPS to Base Sepolia RPC (TLS 1.3)

All endpoints have known cert fingerprints; SDK refuses to connect to a wrong cert. Mitigates MITM attacks even on untrusted networks.

For self-hosted indexers, operators configure their own cert; SDK pins the operator-provided fingerprint.

---

## Audit logging

SDK logs every signed operation:

```
2026-05-25T14:42:01Z  sign  user_op=submitProof  jobId=4127  txHash=0x...
2026-05-25T14:42:14Z  sign  heartbeat            phase=settled
2026-05-25T14:43:11Z  rotate session_key  old=0xabc... new=0xdef...
```

Logs go to:
- Local journal (`journalctl -u rova-robot`)
- Operator-configured remote sink (Loki, Datadog, etc.)
- On-chain auditable subset (the UserOp hashes; immutable on Base)

Anomalous patterns (e.g., 50 proofs in 5 minutes when normal is 5 per hour) trigger SDK alerts. Operator can respond.

---

## What we don't currently do (but should, v2+)

| Improvement                                  | Why                                                     |
| -------------------------------------------- | ------------------------------------------------------- |
| Multi-party computation for signing          | Eliminates single-point session-key compromise          |
| Attested boot of the SDK process              | Defeats "swap the SDK binary" attacks                  |
| Per-job ephemeral keys                       | Limits damage even further if a key leaks                |
| GnosisSafe-as-robot-wallet                    | Multi-sig requirement for the robot's most expensive operations |
| ZK-attested sensor pipeline                   | Sensor pre-images proven non-tampered at submission time |
| Bundler diversity                            | No single bundler can censor a robot's proofs            |

These are flagged for v2/v3. v1 ships with the simple-strong baseline above.

---

## How to verify a deployment is configured securely

A self-check script:

```bash
rova-robot security-audit
```

Outputs a report:
```
[✓] Session key file 0600
[✓] Master key file 0400
[✓] Master key not in version control
[✓] TLS cert pinning enabled
[✓] Bundler endpoint reachable + cert OK
[✓] Indexer endpoint reachable + cert OK
[!] Session key validity 47 days (recommended ≤ 30)
[!] No remote audit log sink configured (recommended for production)
[✓] User running SDK is non-root
```

Passing ≥ 80% of checks is required for the SDK to start in `--strict` mode (a production-recommended flag).

---

## Related

- `AUTH.md` — the broader identity model
- `ROBOT-IDENTITY.md` — initial key provisioning
- `FLEET-OPS.md` § Rotate session key — operator's runtime control
- `OPS/INCIDENT.md` — playbooks for compromise scenarios
- `SDK-ROBOT.md` § sensor schemas — what the SDK accepts as proof input
