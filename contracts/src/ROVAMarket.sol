// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {ROVARegistry} from "./ROVARegistry.sol";
import {ROVAVerifier} from "./ROVAVerifier.sol";

/// @title ROVAMarket — ACP-compatible task marketplace with onchain escrow
/// @notice Virtuals agents post physical tasks, select robot providers, lock bounty in escrow.
///         On verified completion, escrow releases to robot. On failure, bounty returns to agent.
contract ROVAMarket {
    // ─── Types ───────────────────────────────────────────────────
    enum JobStatus { OPEN, ASSIGNED, COMPLETED, FAILED, CANCELLED }

    struct Job {
        address client;
        uint256 offeringId;
        uint256 robotId;
        ROVARegistry.TaskType taskType;
        uint256 bounty;
        uint256 bid;
        uint256 slaMinutes;
        uint256 createdAt;
        uint256 deadline;
        JobStatus status;
    }

    struct Coordinates {
        int64 fromLatE7;
        int64 fromLngE7;
        int64 toLatE7;
        int64 toLngE7;
    }

    // ─── State ───────────────────────────────────────────────────
    IERC20 public immutable usdc;
    ROVARegistry public immutable registry;
    ROVAVerifier public immutable verifier;

    address public admin;
    uint256 public protocolFeeBps = 30; // 0.3%
    uint256 public accumulatedFees;
    uint256 public nextJobId;

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Coordinates) public jobCoords;
    mapping(address => uint256[]) public clientJobs;
    mapping(uint256 => uint256[]) public robotJobs;

    // ─── Events ──────────────────────────────────────────────────
    event JobPosted(uint256 indexed jobId, address indexed client, ROVARegistry.TaskType taskType, uint256 bounty);
    event JobAssigned(uint256 indexed jobId, uint256 indexed robotId, uint256 bid);
    event JobCompleted(uint256 indexed jobId, uint256 indexed robotId, uint256 payout);
    event JobFailed(uint256 indexed jobId, uint256 indexed robotId, string reason);
    event JobCancelled(uint256 indexed jobId);
    event FeesWithdrawn(uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────
    error NotAdmin();
    error NotClient();
    error InvalidOffering();
    error InsufficientBounty();
    error JobNotOpen();
    error JobNotAssigned();
    error VerificationPending();
    error SLANotBreached();
    error RobotNotActive();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────
    constructor(address _usdc, address _registry, address _verifier) {
        usdc = IERC20(_usdc);
        registry = ROVARegistry(_registry);
        verifier = ROVAVerifier(_verifier);
        admin = msg.sender;
    }

    // ─── Post Job ────────────────────────────────────────────────
    function postJob(
        ROVARegistry.TaskType taskType,
        uint256 bounty,
        int64 fromLatE7,
        int64 fromLngE7,
        int64 toLatE7,
        int64 toLngE7,
        uint256 slaMinutes
    ) external returns (uint256 jobId) {
        usdc.transferFrom(msg.sender, address(this), bounty);

        jobId = nextJobId++;
        jobs[jobId] = Job({
            client: msg.sender,
            offeringId: 0,
            robotId: 0,
            taskType: taskType,
            bounty: bounty,
            bid: 0,
            slaMinutes: slaMinutes,
            createdAt: block.timestamp,
            deadline: 0,
            status: JobStatus.OPEN
        });
        jobCoords[jobId] = Coordinates(fromLatE7, fromLngE7, toLatE7, toLngE7);
        clientJobs[msg.sender].push(jobId);

        emit JobPosted(jobId, msg.sender, taskType, bounty);
    }

    // ─── Assign Robot ────────────────────────────────────────────
    function assignRobot(uint256 jobId, uint256 offeringId) external {
        Job storage job = jobs[jobId];
        if (job.client != msg.sender) revert NotClient();
        if (job.status != JobStatus.OPEN) revert JobNotOpen();

        ROVARegistry.JobOffering memory offering = registry.getOffering(offeringId);
        if (!offering.active) revert InvalidOffering();
        if (offering.priceUsdc > job.bounty) revert InsufficientBounty();
        if (!registry.isRobotActive(offering.robotId)) revert RobotNotActive();

        uint256 deadline = block.timestamp + (job.slaMinutes * 60);

        job.offeringId = offeringId;
        job.robotId = offering.robotId;
        job.bid = offering.priceUsdc;
        job.deadline = deadline;
        job.status = JobStatus.ASSIGNED;

        robotJobs[offering.robotId].push(jobId);

        Coordinates memory c = jobCoords[jobId];
        verifier.setJobDestination(jobId, c.toLatE7, c.toLngE7, deadline);

        emit JobAssigned(jobId, offering.robotId, offering.priceUsdc);
    }

    // ─── Settle Job ──────────────────────────────────────────────
    function settleJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.ASSIGNED) revert JobNotAssigned();

        if (verifier.isVerified(jobId)) {
            _completeJob(jobId);
        } else if (verifier.isRejected(jobId)) {
            _failJob(jobId, "VERIFICATION_FAILED");
        } else {
            revert VerificationPending();
        }
    }

    // ─── Force Fail (SLA breach) ─────────────────────────────────
    function forceFailJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.ASSIGNED) revert JobNotAssigned();
        if (block.timestamp <= job.deadline) revert SLANotBreached();

        if (verifier.isVerified(jobId)) {
            _completeJob(jobId);
            return;
        }

        _failJob(jobId, "SLA_BREACH");
    }

    // ─── Cancel Job ──────────────────────────────────────────────
    function cancelJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (job.client != msg.sender) revert NotClient();
        if (job.status != JobStatus.OPEN) revert JobNotOpen();

        job.status = JobStatus.CANCELLED;
        usdc.transfer(msg.sender, job.bounty);

        emit JobCancelled(jobId);
    }

    // ─── Internal ────────────────────────────────────────────────
    function _completeJob(uint256 jobId) internal {
        Job storage job = jobs[jobId];
        job.status = JobStatus.COMPLETED;

        uint256 fee = (job.bid * protocolFeeBps) / 10000;
        uint256 payout = job.bid - fee;
        uint256 refund = job.bounty - job.bid;

        accumulatedFees += fee;

        ROVARegistry.Robot memory robot = registry.getRobot(job.robotId);
        usdc.transfer(robot.wallet, payout);

        if (refund > 0) {
            usdc.transfer(job.client, refund);
        }

        registry.recordCompletion(job.robotId);
        emit JobCompleted(jobId, job.robotId, payout);
    }

    function _failJob(uint256 jobId, string memory reason) internal {
        Job storage job = jobs[jobId];
        job.status = JobStatus.FAILED;

        usdc.transfer(job.client, job.bounty);

        uint256 slashAmount = job.bid / 10;
        registry.slash(job.robotId, slashAmount);

        emit JobFailed(jobId, job.robotId, reason);
    }

    // ─── Views ───────────────────────────────────────────────────
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getJobCoords(uint256 jobId) external view returns (Coordinates memory) {
        return jobCoords[jobId];
    }

    function getClientJobs(address client) external view returns (uint256[] memory) {
        return clientJobs[client];
    }

    function getRobotJobs(uint256 robotId) external view returns (uint256[] memory) {
        return robotJobs[robotId];
    }

    // ─── Admin ───────────────────────────────────────────────────
    function setProtocolFeeBps(uint256 _feeBps) external onlyAdmin {
        protocolFeeBps = _feeBps;
    }

    function withdrawFees(address to) external onlyAdmin {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.transfer(to, amount);
        emit FeesWithdrawn(amount);
    }

    function setAdmin(address _admin) external onlyAdmin {
        admin = _admin;
    }
}
