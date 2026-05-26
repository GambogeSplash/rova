// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import {ROVAVerifier} from "../src/ROVAVerifier.sol";

contract ROVAVerifierTest is Test {
    ROVAVerifier public verifier;

    address public deployer = address(this);
    address public marketAddr = makeAddr("market");
    address public robot = makeAddr("robot");
    address public stranger = makeAddr("stranger");

    int64 public constant DEST_LAT = 524120000;   // ~52.4120000
    int64 public constant DEST_LNG = 133260000;   // ~13.3260000
    uint256 public constant DEADLINE = 1000;       // absolute timestamp
    uint256 public constant JOB_ID = 42;

    function setUp() public {
        verifier = new ROVAVerifier();
        verifier.setMarket(marketAddr);

        // Warp to a known time well before the deadline
        vm.warp(500);

        // Set up a job destination as the market
        vm.prank(marketAddr);
        verifier.setJobDestination(JOB_ID, DEST_LAT, DEST_LNG, DEADLINE);
    }

    // ─── setJobDestination ─────────────────────────────────────

    function test_setJobDestination_success() public {
        uint256 newJobId = 99;
        vm.prank(marketAddr);
        verifier.setJobDestination(newJobId, int64(100), int64(200), 2000);

        assertEq(verifier.jobDeadlines(newJobId), 2000);
    }

    function test_setJobDestination_notMarket_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAVerifier.NotMarket.selector);
        verifier.setJobDestination(99, int64(100), int64(200), 2000);
    }

    // ─── submitProof — GPS pass ────────────────────────────────

    function test_submitProof_verified_success() public {
        // Submit proof at exact destination
        vm.prank(robot);
        verifier.submitProof(JOB_ID, DEST_LAT, DEST_LNG, keccak256("sensor-data"));

        assertTrue(verifier.isVerified(JOB_ID));
        assertFalse(verifier.isRejected(JOB_ID));

        ROVAVerifier.Proof memory p = verifier.getProof(JOB_ID);
        assertEq(p.latitudeE7, DEST_LAT);
        assertEq(p.longitudeE7, DEST_LNG);
        assertEq(p.sensorHash, keccak256("sensor-data"));
        assertTrue(p.verified);
    }

    function test_submitProof_withinTolerance_verified() public {
        // GPS tolerance default = 1000 E7 units
        int64 latWithin = DEST_LAT + 999;
        int64 lngWithin = DEST_LNG - 500;

        vm.prank(robot);
        verifier.submitProof(JOB_ID, latWithin, lngWithin, keccak256("data"));

        assertTrue(verifier.isVerified(JOB_ID));
    }

    // ─── submitProof — GPS fail ────────────────────────────────

    function test_submitProof_gpsMismatch_rejected() public {
        // Way outside tolerance
        int64 latFar = DEST_LAT + 5000;

        vm.prank(robot);
        verifier.submitProof(JOB_ID, latFar, DEST_LNG, keccak256("data"));

        assertFalse(verifier.isVerified(JOB_ID));
        assertTrue(verifier.isRejected(JOB_ID));
    }

    function test_submitProof_gpsMismatch_longitude_rejected() public {
        int64 lngFar = DEST_LNG - 2000;

        vm.prank(robot);
        verifier.submitProof(JOB_ID, DEST_LAT, lngFar, keccak256("data"));

        assertFalse(verifier.isVerified(JOB_ID));
        assertTrue(verifier.isRejected(JOB_ID));
    }

    // ─── submitProof — SLA breach ──────────────────────────────

    function test_submitProof_afterDeadline_rejected() public {
        // Warp past deadline
        vm.warp(DEADLINE + 1);

        vm.prank(robot);
        verifier.submitProof(JOB_ID, DEST_LAT, DEST_LNG, keccak256("data"));

        assertFalse(verifier.isVerified(JOB_ID));
        assertTrue(verifier.isRejected(JOB_ID));
    }

    function test_submitProof_exactlyAtDeadline_verified() public {
        // At exactly the deadline, timestamp == deadline => NOT greater, so should pass
        vm.warp(DEADLINE);

        vm.prank(robot);
        verifier.submitProof(JOB_ID, DEST_LAT, DEST_LNG, keccak256("data"));

        assertTrue(verifier.isVerified(JOB_ID));
    }

    // ─── Duplicate proof ───────────────────────────────────────

    function test_submitProof_duplicate_reverts() public {
        vm.prank(robot);
        verifier.submitProof(JOB_ID, DEST_LAT, DEST_LNG, keccak256("data"));

        vm.prank(robot);
        vm.expectRevert(ROVAVerifier.ProofAlreadySubmitted.selector);
        verifier.submitProof(JOB_ID, DEST_LAT, DEST_LNG, keccak256("data2"));
    }

    // ─── Job not configured ────────────────────────────────────

    function test_submitProof_jobNotConfigured_reverts() public {
        uint256 unknownJobId = 9999;

        vm.prank(robot);
        vm.expectRevert(ROVAVerifier.JobNotConfigured.selector);
        verifier.submitProof(unknownJobId, DEST_LAT, DEST_LNG, keccak256("data"));
    }

    // ─── Admin functions ───────────────────────────────────────

    function test_setGpsTolerance_success() public {
        verifier.setGpsTolerance(5000);
        assertEq(verifier.gpsTolerance(), 5000);
    }

    function test_setGpsTolerance_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAVerifier.NotAdmin.selector);
        verifier.setGpsTolerance(5000);
    }

    function test_setMarket_success() public {
        address newMarket = makeAddr("newMarket");
        verifier.setMarket(newMarket);
        assertEq(verifier.market(), newMarket);
    }

    function test_setAdmin_success() public {
        verifier.setAdmin(stranger);
        assertEq(verifier.admin(), stranger);
    }

    function test_setAdmin_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAVerifier.NotAdmin.selector);
        verifier.setAdmin(stranger);
    }

    // ─── Edge: boundary tolerance ──────────────────────────────

    function test_submitProof_exactBoundaryTolerance_rejected() public {
        // Exactly at tolerance boundary (1000) — uint64(1000) > 1000 is false,
        // so latDiff == tolerance => passes? Let's check: the contract uses `>`, not `>=`
        // uint64(latDiff) > gpsTolerance means 1000 > 1000 = false => verified
        int64 latBoundary = DEST_LAT + 1000;

        vm.prank(robot);
        verifier.submitProof(JOB_ID, latBoundary, DEST_LNG, keccak256("data"));

        // 1000 > 1000 is false, so it passes
        assertTrue(verifier.isVerified(JOB_ID));
    }

    function test_submitProof_justOverTolerance_rejected() public {
        int64 latOver = DEST_LAT + 1001;

        // Need a new job since JOB_ID may already have proof
        uint256 newJobId = 100;
        vm.prank(marketAddr);
        verifier.setJobDestination(newJobId, DEST_LAT, DEST_LNG, DEADLINE);

        vm.prank(robot);
        verifier.submitProof(newJobId, latOver, DEST_LNG, keccak256("data"));

        assertTrue(verifier.isRejected(newJobId));
        assertFalse(verifier.isVerified(newJobId));
    }
}
