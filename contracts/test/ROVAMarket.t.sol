// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import {ROVAMarket} from "../src/ROVAMarket.sol";
import {ROVARegistry} from "../src/ROVARegistry.sol";
import {ROVAVerifier} from "../src/ROVAVerifier.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ROVAMarketTest is Test {
    ROVAMarket public market;
    ROVARegistry public registry;
    ROVAVerifier public verifier;
    MockERC20 public usdc;
    MockERC20 public rovaToken;

    address public deployer = address(this);
    address public client = makeAddr("client");
    address public operator = makeAddr("operator");
    address public robotWallet = makeAddr("robotWallet");
    address public stranger = makeAddr("stranger");

    uint256 public constant MIN_STAKE = 1000e18;
    uint256 public constant BOUNTY = 100e6;       // 100 USDC
    uint256 public constant PRICE = 50e6;          // 50 USDC offering price
    uint256 public constant SLA_MINUTES = 30;

    int64 public constant FROM_LAT = 524000000;
    int64 public constant FROM_LNG = 133000000;
    int64 public constant TO_LAT = 524120000;
    int64 public constant TO_LNG = 133260000;

    uint256 public robotId;
    uint256 public offeringId;

    function setUp() public {
        // Deploy tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        rovaToken = new MockERC20("ROVA", "ROVA", 18);

        // Deploy core contracts
        registry = new ROVARegistry(address(rovaToken), MIN_STAKE);
        verifier = new ROVAVerifier();
        market = new ROVAMarket(address(usdc), address(registry), address(verifier));

        // Wire up access control:
        // ROVAMarket needs to be admin on registry (for slash/recordCompletion)
        registry.setAdmin(address(market));
        // ROVAMarket needs to be market on verifier (for setJobDestination)
        verifier.setMarket(address(market));

        // Register a robot
        rovaToken.mint(operator, 100_000e18);
        vm.startPrank(operator);
        rovaToken.approve(address(registry), type(uint256).max);
        robotId = registry.registerRobot("G1-ALPHA", "Unitree G1", robotWallet, MIN_STAKE);
        offeringId = registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, PRICE, SLA_MINUTES);
        vm.stopPrank();

        // Fund client with USDC
        usdc.mint(client, 10_000e6);
        vm.prank(client);
        usdc.approve(address(market), type(uint256).max);
    }

    // ─── Helpers ───────────────────────────────────────────────

    function _postJob() internal returns (uint256 jobId) {
        vm.prank(client);
        jobId = market.postJob(
            ROVARegistry.TaskType.CARRY,
            BOUNTY,
            FROM_LAT, FROM_LNG,
            TO_LAT, TO_LNG,
            SLA_MINUTES
        );
    }

    function _postAndAssignJob() internal returns (uint256 jobId) {
        jobId = _postJob();
        vm.prank(client);
        market.assignRobot(jobId, offeringId);
    }

    // ─── Post Job ──────────────────────────────────────────────

    function test_postJob_success() public {
        uint256 jobId = _postJob();

        assertEq(jobId, 0);
        ROVAMarket.Job memory job = market.getJob(jobId);
        assertEq(job.client, client);
        assertEq(job.bounty, BOUNTY);
        assertEq(uint256(job.status), uint256(ROVAMarket.JobStatus.OPEN));
        assertEq(job.slaMinutes, SLA_MINUTES);

        // USDC transferred to market
        assertEq(usdc.balanceOf(address(market)), BOUNTY);
    }

    function test_postJob_emitsEvent() public {
        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit ROVAMarket.JobPosted(0, client, ROVARegistry.TaskType.CARRY, BOUNTY);
        market.postJob(ROVARegistry.TaskType.CARRY, BOUNTY, FROM_LAT, FROM_LNG, TO_LAT, TO_LNG, SLA_MINUTES);
    }

    function test_postJob_tracksClientJobs() public {
        _postJob();
        _postJob();

        uint256[] memory ids = market.getClientJobs(client);
        assertEq(ids.length, 2);
    }

    function test_postJob_storesCoordinates() public {
        uint256 jobId = _postJob();

        ROVAMarket.Coordinates memory c = market.getJobCoords(jobId);
        assertEq(c.fromLatE7, FROM_LAT);
        assertEq(c.fromLngE7, FROM_LNG);
        assertEq(c.toLatE7, TO_LAT);
        assertEq(c.toLngE7, TO_LNG);
    }

    // ─── Assign Robot ──────────────────────────────────────────

    function test_assignRobot_success() public {
        uint256 jobId = _postJob();

        vm.prank(client);
        market.assignRobot(jobId, offeringId);

        ROVAMarket.Job memory job = market.getJob(jobId);
        assertEq(uint256(job.status), uint256(ROVAMarket.JobStatus.ASSIGNED));
        assertEq(job.robotId, robotId);
        assertEq(job.bid, PRICE);
        assertGt(job.deadline, 0);
    }

    function test_assignRobot_notClient_reverts() public {
        uint256 jobId = _postJob();

        vm.prank(stranger);
        vm.expectRevert(ROVAMarket.NotClient.selector);
        market.assignRobot(jobId, offeringId);
    }

    function test_assignRobot_jobNotOpen_reverts() public {
        uint256 jobId = _postAndAssignJob();

        vm.prank(client);
        vm.expectRevert(ROVAMarket.JobNotOpen.selector);
        market.assignRobot(jobId, offeringId);
    }

    function test_assignRobot_insufficientBounty_reverts() public {
        // Post a job with bounty less than offering price
        usdc.mint(client, 10e6);
        vm.prank(client);
        uint256 jobId = market.postJob(
            ROVARegistry.TaskType.CARRY,
            10e6, // only 10 USDC, offering is 50
            FROM_LAT, FROM_LNG, TO_LAT, TO_LNG, SLA_MINUTES
        );

        vm.prank(client);
        vm.expectRevert(ROVAMarket.InsufficientBounty.selector);
        market.assignRobot(jobId, offeringId);
    }

    function test_assignRobot_inactiveOffering_reverts() public {
        uint256 jobId = _postJob();

        // Deactivate the offering
        vm.prank(operator);
        registry.deactivateOffering(offeringId);

        vm.prank(client);
        vm.expectRevert(ROVAMarket.InvalidOffering.selector);
        market.assignRobot(jobId, offeringId);
    }

    function test_assignRobot_inactiveRobot_reverts() public {
        uint256 jobId = _postJob();

        // Deactivate the robot
        vm.prank(operator);
        registry.deactivateRobot(robotId);

        vm.prank(client);
        vm.expectRevert(ROVAMarket.RobotNotActive.selector);
        market.assignRobot(jobId, offeringId);
    }

    // ─── Settle Job — Verified ─────────────────────────────────

    function test_settleJob_verified_success() public {
        uint256 jobId = _postAndAssignJob();

        // Robot submits valid proof
        verifier.submitProof(jobId, TO_LAT, TO_LNG, keccak256("sensor"));

        assertTrue(verifier.isVerified(jobId));

        uint256 walletBefore = usdc.balanceOf(robotWallet);
        uint256 clientBefore = usdc.balanceOf(client);

        market.settleJob(jobId);

        ROVAMarket.Job memory job = market.getJob(jobId);
        assertEq(uint256(job.status), uint256(ROVAMarket.JobStatus.COMPLETED));

        // Check payout: bid=50e6, fee=0.3% => 150000, payout=49850000
        uint256 fee = (PRICE * 30) / 10000;
        uint256 payout = PRICE - fee;
        uint256 refund = BOUNTY - PRICE;

        assertEq(usdc.balanceOf(robotWallet) - walletBefore, payout);
        assertEq(usdc.balanceOf(client) - clientBefore, refund);
        assertEq(market.accumulatedFees(), fee);
    }

    function test_settleJob_verified_noRefundWhenBountyEqualsBid() public {
        // Create offering with price == bounty
        vm.prank(operator);
        uint256 exactOffering = registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, BOUNTY, SLA_MINUTES);

        vm.prank(client);
        uint256 jobId = market.postJob(
            ROVARegistry.TaskType.CARRY, BOUNTY,
            FROM_LAT, FROM_LNG, TO_LAT, TO_LNG, SLA_MINUTES
        );
        vm.prank(client);
        market.assignRobot(jobId, exactOffering);

        verifier.submitProof(jobId, TO_LAT, TO_LNG, keccak256("sensor"));

        uint256 clientBefore = usdc.balanceOf(client);
        market.settleJob(jobId);

        // No refund
        assertEq(usdc.balanceOf(client), clientBefore);
    }

    // ─── Settle Job — Rejected ─────────────────────────────────

    function test_settleJob_rejected_failsJob() public {
        uint256 jobId = _postAndAssignJob();

        // Submit proof with wrong GPS (far away)
        verifier.submitProof(jobId, TO_LAT + 50000, TO_LNG, keccak256("sensor"));
        assertTrue(verifier.isRejected(jobId));

        uint256 clientBefore = usdc.balanceOf(client);
        market.settleJob(jobId);

        ROVAMarket.Job memory job = market.getJob(jobId);
        assertEq(uint256(job.status), uint256(ROVAMarket.JobStatus.FAILED));

        // Client gets full bounty back
        assertEq(usdc.balanceOf(client) - clientBefore, BOUNTY);
    }

    // ─── Settle Job — Pending ──────────────────────────────────

    function test_settleJob_pending_reverts() public {
        uint256 jobId = _postAndAssignJob();

        // No proof submitted yet
        vm.expectRevert(ROVAMarket.VerificationPending.selector);
        market.settleJob(jobId);
    }

    function test_settleJob_notAssigned_reverts() public {
        uint256 jobId = _postJob();

        vm.expectRevert(ROVAMarket.JobNotAssigned.selector);
        market.settleJob(jobId);
    }

    // ─── Force Fail (SLA breach) ───────────────────────────────

    function test_forceFailJob_slaBreach_success() public {
        uint256 jobId = _postAndAssignJob();

        ROVAMarket.Job memory job = market.getJob(jobId);

        // Warp past deadline
        vm.warp(job.deadline + 1);

        uint256 clientBefore = usdc.balanceOf(client);
        market.forceFailJob(jobId);

        ROVAMarket.Job memory failed = market.getJob(jobId);
        assertEq(uint256(failed.status), uint256(ROVAMarket.JobStatus.FAILED));
        assertEq(usdc.balanceOf(client) - clientBefore, BOUNTY);
    }

    function test_forceFailJob_slaNotBreached_reverts() public {
        uint256 jobId = _postAndAssignJob();

        // Still before deadline
        vm.expectRevert(ROVAMarket.SLANotBreached.selector);
        market.forceFailJob(jobId);
    }

    function test_forceFailJob_butVerified_completesInstead() public {
        uint256 jobId = _postAndAssignJob();

        // Submit valid proof before deadline
        verifier.submitProof(jobId, TO_LAT, TO_LNG, keccak256("sensor"));

        ROVAMarket.Job memory job = market.getJob(jobId);
        vm.warp(job.deadline + 1);

        // Even though SLA breached, proof was verified => completes
        market.forceFailJob(jobId);

        ROVAMarket.Job memory result = market.getJob(jobId);
        assertEq(uint256(result.status), uint256(ROVAMarket.JobStatus.COMPLETED));
    }

    function test_forceFailJob_notAssigned_reverts() public {
        uint256 jobId = _postJob();

        vm.expectRevert(ROVAMarket.JobNotAssigned.selector);
        market.forceFailJob(jobId);
    }

    // ─── Cancel Job ────────────────────────────────────────────

    function test_cancelJob_success() public {
        uint256 jobId = _postJob();
        uint256 clientBefore = usdc.balanceOf(client);

        vm.prank(client);
        market.cancelJob(jobId);

        ROVAMarket.Job memory job = market.getJob(jobId);
        assertEq(uint256(job.status), uint256(ROVAMarket.JobStatus.CANCELLED));

        // Client gets bounty back
        assertEq(usdc.balanceOf(client) - clientBefore, BOUNTY);
    }

    function test_cancelJob_notClient_reverts() public {
        uint256 jobId = _postJob();

        vm.prank(stranger);
        vm.expectRevert(ROVAMarket.NotClient.selector);
        market.cancelJob(jobId);
    }

    function test_cancelJob_notOpen_reverts() public {
        uint256 jobId = _postAndAssignJob();

        vm.prank(client);
        vm.expectRevert(ROVAMarket.JobNotOpen.selector);
        market.cancelJob(jobId);
    }

    // ─── Fee Collection ────────────────────────────────────────

    function test_withdrawFees_success() public {
        // Complete a job to accumulate fees
        uint256 jobId = _postAndAssignJob();
        verifier.submitProof(jobId, TO_LAT, TO_LNG, keccak256("sensor"));
        market.settleJob(jobId);

        uint256 expectedFees = (PRICE * 30) / 10000;
        assertEq(market.accumulatedFees(), expectedFees);

        address treasury = makeAddr("treasury");
        vm.prank(address(this)); // deployer is market admin
        market.withdrawFees(treasury);

        assertEq(usdc.balanceOf(treasury), expectedFees);
        assertEq(market.accumulatedFees(), 0);
    }

    function test_withdrawFees_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAMarket.NotAdmin.selector);
        market.withdrawFees(stranger);
    }

    // ─── Admin ─────────────────────────────────────────────────

    function test_setProtocolFeeBps_success() public {
        market.setProtocolFeeBps(100); // 1%
        assertEq(market.protocolFeeBps(), 100);
    }

    function test_setProtocolFeeBps_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAMarket.NotAdmin.selector);
        market.setProtocolFeeBps(100);
    }

    function test_setAdmin_success() public {
        market.setAdmin(stranger);
        assertEq(market.admin(), stranger);
    }

    // ─── Slashing on failure ───────────────────────────────────

    function test_failJob_slashesRobotStake() public {
        uint256 jobId = _postAndAssignJob();

        // Submit proof with bad GPS
        verifier.submitProof(jobId, TO_LAT + 50000, TO_LNG, keccak256("sensor"));

        ROVARegistry.Robot memory before = registry.getRobot(robotId);

        market.settleJob(jobId);

        ROVARegistry.Robot memory after_ = registry.getRobot(robotId);
        uint256 expectedSlash = PRICE / 10; // bid / 10
        assertEq(before.stake - after_.stake, expectedSlash);
        assertEq(after_.jobsFailed, before.jobsFailed + 1);
    }

    // ─── Robot jobs tracking ───────────────────────────────────

    function test_assignRobot_tracksRobotJobs() public {
        uint256 jobId = _postAndAssignJob();

        uint256[] memory rJobs = market.getRobotJobs(robotId);
        assertEq(rJobs.length, 1);
        assertEq(rJobs[0], jobId);
    }

    // ─── recordCompletion called on success ────────────────────

    function test_settleJob_recordsCompletion() public {
        uint256 jobId = _postAndAssignJob();
        verifier.submitProof(jobId, TO_LAT, TO_LNG, keccak256("sensor"));

        ROVARegistry.Robot memory before = registry.getRobot(robotId);
        market.settleJob(jobId);
        ROVARegistry.Robot memory after_ = registry.getRobot(robotId);

        assertEq(after_.jobsCompleted, before.jobsCompleted + 1);
    }
}
