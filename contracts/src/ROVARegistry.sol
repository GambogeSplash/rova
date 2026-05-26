// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title ROVARegistry — Robot identity, capability registration, and Job Offerings
/// @notice Robots register on-chain with capabilities and publish priced Job Offerings.
///         Stake ROVA tokens to list — slashed on failed delivery.
contract ROVARegistry {
    // ─── Types ───────────────────────────────────────────────────
    enum TaskType { CARRY, NAVIGATE, INSPECT, SORT }

    struct Robot {
        address owner;          // fleet operator
        address wallet;         // ERC-4337 wallet receiving payments
        string  name;           // e.g. "G1-ALPHA"
        string  model;          // e.g. "Unitree G1"
        uint256 stake;          // ROVA staked
        uint256 reputation;     // scaled 0–10000 (4.9 = 4900)
        uint256 jobsCompleted;
        uint256 jobsFailed;
        bool    active;
        uint256 registeredAt;
    }

    struct JobOffering {
        uint256 robotId;
        TaskType taskType;
        uint256 priceUsdc;      // price in USDC (6 decimals)
        uint256 slaMinutes;     // max time to complete
        bool    active;
    }

    // ─── State ───────────────────────────────────────────────────
    IERC20 public immutable rovaToken;
    uint256 public minStake;
    address public admin;

    uint256 public nextRobotId;
    uint256 public nextOfferingId;

    mapping(uint256 => Robot) public robots;
    mapping(uint256 => JobOffering) public offerings;
    mapping(address => uint256[]) public ownerRobots;

    // ─── Events ──────────────────────────────────────────────────
    event RobotRegistered(uint256 indexed robotId, address indexed owner, string name);
    event RobotDeactivated(uint256 indexed robotId);
    event OfferingPublished(uint256 indexed offeringId, uint256 indexed robotId, TaskType taskType, uint256 priceUsdc);
    event OfferingDeactivated(uint256 indexed offeringId);
    event StakeAdded(uint256 indexed robotId, uint256 amount);
    event StakeSlashed(uint256 indexed robotId, uint256 amount);
    event ReputationUpdated(uint256 indexed robotId, uint256 newReputation);

    // ─── Errors ──────────────────────────────────────────────────
    error NotOwner();
    error NotAdmin();
    error InsufficientStake();
    error RobotNotActive();
    error OfferingNotActive();
    error InvalidRobot();

    // ─── Modifiers ───────────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyRobotOwner(uint256 robotId) {
        if (robots[robotId].owner != msg.sender) revert NotOwner();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────
    constructor(address _rovaToken, uint256 _minStake) {
        rovaToken = IERC20(_rovaToken);
        minStake = _minStake;
        admin = msg.sender;
    }

    // ─── Robot Registration ──────────────────────────────────────
    function registerRobot(
        string calldata name,
        string calldata model,
        address wallet,
        uint256 stakeAmount
    ) external returns (uint256 robotId) {
        if (stakeAmount < minStake) revert InsufficientStake();

        rovaToken.transferFrom(msg.sender, address(this), stakeAmount);

        robotId = nextRobotId++;
        robots[robotId] = Robot({
            owner: msg.sender,
            wallet: wallet,
            name: name,
            model: model,
            stake: stakeAmount,
            reputation: 5000, // start at 5.0
            jobsCompleted: 0,
            jobsFailed: 0,
            active: true,
            registeredAt: block.timestamp
        });
        ownerRobots[msg.sender].push(robotId);

        emit RobotRegistered(robotId, msg.sender, name);
    }

    function deactivateRobot(uint256 robotId) external onlyRobotOwner(robotId) {
        robots[robotId].active = false;
        emit RobotDeactivated(robotId);
    }

    // ─── Job Offerings ───────────────────────────────────────────
    function publishOffering(
        uint256 robotId,
        TaskType taskType,
        uint256 priceUsdc,
        uint256 slaMinutes
    ) external onlyRobotOwner(robotId) returns (uint256 offeringId) {
        if (!robots[robotId].active) revert RobotNotActive();

        offeringId = nextOfferingId++;
        offerings[offeringId] = JobOffering({
            robotId: robotId,
            taskType: taskType,
            priceUsdc: priceUsdc,
            slaMinutes: slaMinutes,
            active: true
        });

        emit OfferingPublished(offeringId, robotId, taskType, priceUsdc);
    }

    function deactivateOffering(uint256 offeringId) external {
        JobOffering storage o = offerings[offeringId];
        if (robots[o.robotId].owner != msg.sender) revert NotOwner();
        o.active = false;
        emit OfferingDeactivated(offeringId);
    }

    // ─── Staking ─────────────────────────────────────────────────
    function addStake(uint256 robotId, uint256 amount) external onlyRobotOwner(robotId) {
        rovaToken.transferFrom(msg.sender, address(this), amount);
        robots[robotId].stake += amount;
        emit StakeAdded(robotId, amount);
    }

    /// @notice Called by ROVAMarket on failed job — slashes robot stake
    function slash(uint256 robotId, uint256 amount) external onlyAdmin {
        Robot storage r = robots[robotId];
        uint256 slashAmt = amount > r.stake ? r.stake : amount;
        r.stake -= slashAmt;
        r.jobsFailed++;

        // Deactivate if below min stake
        if (r.stake < minStake) {
            r.active = false;
        }

        emit StakeSlashed(robotId, slashAmt);
    }

    // ─── Reputation ──────────────────────────────────────────────
    function updateReputation(uint256 robotId, uint256 newReputation) external onlyAdmin {
        robots[robotId].reputation = newReputation;
        emit ReputationUpdated(robotId, newReputation);
    }

    function recordCompletion(uint256 robotId) external onlyAdmin {
        robots[robotId].jobsCompleted++;
    }

    // ─── Views ───────────────────────────────────────────────────
    function getRobot(uint256 robotId) external view returns (Robot memory) {
        return robots[robotId];
    }

    function getOffering(uint256 offeringId) external view returns (JobOffering memory) {
        return offerings[offeringId];
    }

    function getOwnerRobots(address owner) external view returns (uint256[] memory) {
        return ownerRobots[owner];
    }

    function isRobotActive(uint256 robotId) external view returns (bool) {
        return robots[robotId].active;
    }

    // ─── Admin ───────────────────────────────────────────────────
    function setMinStake(uint256 _minStake) external onlyAdmin {
        minStake = _minStake;
    }

    function setAdmin(address _admin) external onlyAdmin {
        admin = _admin;
    }
}
