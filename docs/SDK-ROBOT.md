# SDK-ROBOT

> ROS2 integration quickstart. From `pip install` to "robot accepts and executes its first Rova job" in under 10 minutes.

---

## Audience

A robotics developer integrating Rova into an existing ROS2 stack, or a self-builder wiring it into a custom Python motion stack. They have:
- A Python 3.11+ environment
- A robot with motion + GPS + at least one sensor (camera, load cell, IMU)
- An Operator-provided pairing code (from `/dashboard`)

---

## Install

```bash
pip install rova-robot-sdk
```

Or via the Docker image (recommended for production):

```bash
docker run -d --name rova-robot \
  --network host \
  --device /dev/serial0:/dev/serial0 \
  -v /etc/rova:/etc/rova:rw \
  -e PAIRING_CODE=<from operator's dashboard> \
  rova/robot-sdk:1.0
```

The Docker image includes the SDK, the ROS2 adapter, and a default policy template. Pair the host with the Operator's account by passing `PAIRING_CODE` once.

---

## First run

```bash
rova-robot init
```

This launches the setup flow described in `ROBOT-IDENTITY.md`:
1. Generates keypairs
2. Deploys the robot's ERC-4337 wallet
3. Registers with the Operator's wallet signing
4. Publishes initial offerings

After init, you have `/etc/rova/config.toml` and `/etc/rova/keys/`.

---

## Minimal example — accept and execute a CARRY job

```python
from rova_robot_sdk import Robot, TaskType, SensorFrame, Decision
from my_motion_stack import navigate_to, gripper, gps, load_cell, camera

robot = Robot.from_config("/etc/rova/config.toml")

@robot.on_offer
async def evaluate(offer):
    # Policy automatically enforces baseline.
    # Add task-specific overrides here.
    if offer.task_type == TaskType.CARRY and offer.bounty < 5_00_00:
        return Decision.reject("BELOW_TARGET_BOUNTY")
    return Decision.ACCEPT

@robot.on_assigned
async def execute_carry(job):
    robot.heartbeat.set_phase("navigating_pickup")
    await navigate_to(job.from_coords)

    robot.heartbeat.set_phase("picking_up")
    pre_pickup_weight = load_cell.read()
    pickup_image = await camera.capture()
    await gripper.engage()
    post_pickup_weight = load_cell.read()

    if (post_pickup_weight - pre_pickup_weight) < 100:
        raise Robot.AbortJob("NO_PAYLOAD_DETECTED")

    robot.heartbeat.set_phase("navigating_delivery")
    await navigate_to(job.to_coords)

    robot.heartbeat.set_phase("delivering")
    dropoff_image = await camera.capture()
    await gripper.release()
    post_dropoff_weight = load_cell.read()

    if (post_pickup_weight - post_dropoff_weight) < 100:
        raise Robot.AbortJob("NO_DELIVERY_DETECTED")

    return SensorFrame(
        task=TaskType.CARRY,
        weight_delta_at_pickup=post_pickup_weight - pre_pickup_weight,
        weight_delta_at_dropoff=post_dropoff_weight - post_pickup_weight,
        pickup_image_hash=pickup_image.sha256(),
        dropoff_image_hash=dropoff_image.sha256(),
        final_position_gps=gps.read(),
        duration_s=int(job.elapsed_seconds()),
    )

robot.run()
```

That's the full integration. ~30 lines.

---

## ROS2 adapter

If your stack is ROS2, the adapter does the boilerplate:

```python
from rova_robot_sdk.ros2 import RosBridge

bridge = RosBridge(
    robot=robot,
    nav_action="/move_base",
    gps_topic="/gps/fix",
    battery_topic="/battery_state",
    cmd_gripper_action="/gripper/grasp",
)
bridge.run()
```

The adapter translates between Rova's lifecycle events and standard ROS2 topics/actions. You don't write `nav_action.send_goal(...)` — you write the high-level `@robot.on_assigned` handler.

For Unitree G1 / Spot / Reachy, pre-configured bridges ship as separate packages:

```bash
pip install rova-robot-sdk[unitree-g1]
pip install rova-robot-sdk[boston-spot]
pip install rova-robot-sdk[pollen-reachy]
```

Each preset wires the standard ROS2 topics for that platform.

---

## SDK API surface (reference)

### Top-level

```python
class Robot:
    @classmethod
    def from_config(cls, path: str) -> "Robot": ...

    @property
    def robot_id(self) -> int: ...
    @property
    def policy(self) -> Policy: ...
    @property
    def capabilities(self) -> set[str]: ...

    def on_offer(self, handler): ...        # decorator
    def on_assigned(self, handler): ...     # decorator
    def on_proof_result(self, handler): ...  # decorator
    def on_settled(self, handler): ...      # decorator

    @property
    def heartbeat(self) -> Heartbeat: ...

    def run(self) -> None: ...
    def stop(self) -> None: ...
    def deactivate(self) -> None: ...

    class AbortJob(Exception): ...
```

### Heartbeat

```python
class Heartbeat:
    def set_phase(self, phase: str) -> None: ...
    def publish(self, custom_fields: dict) -> None: ...
```

### Policy

```python
class Policy:
    @classmethod
    def from_template(cls, name: str) -> "Policy": ...
    def reload(self) -> None: ...
    def with_overrides(self, **kwargs) -> "Policy": ...
```

### SensorFrame

```python
class SensorFrame:
    task: TaskType
    final_position_gps: tuple[float, float]
    duration_s: int
    # plus task-specific fields per schema (CARRY, NAVIGATE, INSPECT, SORT)

    def compute_hash(self) -> bytes32: ...
```

---

## CLI

```bash
rova-robot init                     # First-run setup
rova-robot status                   # Show current state
rova-robot logs                     # Tail SDK logs
rova-robot policy edit              # Open policy in $EDITOR
rova-robot policy sync              # Pull latest from operator
rova-robot offering list            # Show published offerings
rova-robot offering publish ...     # Publish a new offering
rova-robot offering deactivate ...  # Stop offering
rova-robot rotate-key               # Generate new session key
rova-robot deactivate               # Remove from fleet
```

---

## Sensor schemas

Each task type has a canonical sensor frame schema. The SDK enforces it at proof submission:

### CARRY
```python
SensorFrame(
    task=TaskType.CARRY,
    weight_delta_at_pickup: int,     # grams
    weight_delta_at_dropoff: int,    # grams (typically negative)
    pickup_image_hash: bytes,         # sha256 of camera frame
    dropoff_image_hash: bytes,
    final_position_gps: tuple[float, float],
    duration_s: int,
)
```

### NAVIGATE
```python
SensorFrame(
    task=TaskType.NAVIGATE,
    waypoints_visited: list[tuple[float, float]],
    final_position_gps: tuple[float, float],
    distance_traveled_m: int,
    duration_s: int,
)
```

### INSPECT
```python
SensorFrame(
    task=TaskType.INSPECT,
    inspection_output: dict,         # task-specific
    inspection_image_hashes: list[bytes],
    final_position_gps: tuple[float, float],
    duration_s: int,
)
```

### SORT
```python
SensorFrame(
    task=TaskType.SORT,
    items_moved: int,
    pre_state_image_hash: bytes,
    post_state_image_hash: bytes,
    final_position_gps: tuple[float, float],
    duration_s: int,
)
```

Custom task types in v2 will add new schemas.

---

## Simulation mode

For local development without touching a real robot or chain:

```python
robot = Robot.from_config(...).with_simulation(
    use_synthetic_gps=True,
    use_synthetic_sensors=True,
    skip_chain=True,
)
robot.run()
```

In sim mode:
- GPS is generated to match `job.from_coords` → `job.to_coords` along a synthetic path
- Sensor frame is auto-populated with plausible values
- No `submitProof` UserOp is dispatched; "proof" is faked locally
- Heartbeats are published to a sim topic, not the real MQTT broker

Useful for:
- Testing your `@on_assigned` handler offline
- CI/CD pipelines
- Demo at `/simulator`

---

## Logging

The SDK logs in JSON to stdout:

```json
{"ts":"2026-05-25T14:32:18Z","level":"info","event":"offer.evaluated","offerId":17834,"decision":"ACCEPT"}
{"ts":"2026-05-25T14:32:24Z","level":"info","event":"assigned","jobId":4127,"bid":480000}
{"ts":"2026-05-25T14:42:01Z","level":"info","event":"proof.submitted","jobId":4127,"txHash":"0x..."}
```

Pipe into your existing log aggregator. The SDK also exports Prometheus metrics on opt-in HTTP:

```
robot_offers_evaluated_total{decision="ACCEPT"}
robot_jobs_completed_total
robot_jobs_failed_total{reason="..."}
robot_heartbeats_published_total
robot_proof_submit_latency_seconds
robot_battery_level
```

---

## Local HTTP endpoint (debug)

The SDK runs a local HTTP server (default `:9100`) for debug + operator override:

```
GET  /healthz                    # liveness
GET  /policy                     # current policy
GET  /capabilities               # capability manifest
GET  /heartbeat/last             # last heartbeat content
POST /pause                      # emergency pause via local network
POST /resume
POST /key/rotate                 # initiate session key rotation
```

Authenticated by a local-only token at `/etc/rova/local.token`. Useful when SSHing into a robot for emergencies — even with the network broken, you can pause locally.

---

## Common pitfalls

- **Forgetting to call `heartbeat.set_phase()`** — Operator dashboard shows the robot stuck in an old phase. Phase updates are an explicit call.
- **Blocking the event loop** — `await asyncio.sleep()` is fine; `time.sleep()` blocks heartbeats. Use async APIs.
- **Stale capability manifest** — Robot can take a CARRY job it can't physically do. Update `capabilities.toml` when adding/removing hardware.
- **Sensor frame doesn't match schema** — SDK throws at proof time. Test in sim first.
- **Session key file permissions wrong** — SDK refuses to load if not 0600. Fix with `chmod 600 /etc/rova/keys/session.key`.

---

## Distribution

- pip: `rova-robot-sdk`
- Docker: `rova/robot-sdk:1.0` (linux/amd64, linux/arm64)
- Source: `github.com/rova-protocol/robot-sdk` (MIT)

ROS2 platform presets:
- `rova-robot-sdk[unitree-g1]`
- `rova-robot-sdk[boston-spot]`
- `rova-robot-sdk[pollen-reachy]`
- `rova-robot-sdk[stretch-3]`

---

## Conformance

```bash
rova-robot-conformance --chain base-sepolia
```

Runs a full lifecycle against testnet:
- Wallet operations
- Policy evaluation
- Offer subscription
- Mock execution
- Proof submission
- Settlement

A passing conformance is required for any third-party robot deployment claiming Rova compatibility.

---

## Related

- `SDK.md` — overview of both SDKs
- `ROBOT-IDENTITY.md` — the setup this SDK runs
- `ROBOT-EXECUTE.md` — the lifecycle this SDK drives
- `POLICIES.md` — what the SDK enforces locally
- `PROOF.md` — what `submit_proof` sends
- `ARCH/ROBOT-SDK-SECURITY.md` — key management details
