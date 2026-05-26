// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import {ROVARegistry} from "../src/ROVARegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ROVARegistryTest is Test {
    ROVARegistry public registry;
    MockERC20 public rovaToken;

    address public deployer = address(this);
    address public operator = makeAddr("operator");
    address public robotWallet = makeAddr("robotWallet");
    address public stranger = makeAddr("stranger");

    uint256 public constant MIN_STAKE = 1000e18;

    function setUp() public {
        rovaToken = new MockERC20("ROVA", "ROVA", 18);
        registry = new ROVARegistry(address(rovaToken), MIN_STAKE);

        // Fund operator with tokens and approve registry
        rovaToken.mint(operator, 100_000e18);
        vm.prank(operator);
        rovaToken.approve(address(registry), type(uint256).max);
    }

    // ─── Registration ──────────────────────────────────────────

    function test_registerRobot_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1-ALPHA", "Unitree G1", robotWallet, MIN_STAKE);

        assertEq(robotId, 0);
        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.owner, operator);
        assertEq(r.wallet, robotWallet);
        assertEq(keccak256(bytes(r.name)), keccak256(bytes("G1-ALPHA")));
        assertEq(keccak256(bytes(r.model)), keccak256(bytes("Unitree G1")));
        assertEq(r.stake, MIN_STAKE);
        assertEq(r.reputation, 5000);
        assertEq(r.jobsCompleted, 0);
        assertEq(r.jobsFailed, 0);
        assertTrue(r.active);
        assertEq(r.registeredAt, block.timestamp);
    }

    function test_registerRobot_insufficientStake_reverts() public {
        vm.prank(operator);
        vm.expectRevert(ROVARegistry.InsufficientStake.selector);
        registry.registerRobot("G1-ALPHA", "Unitree G1", robotWallet, MIN_STAKE - 1);
    }

    function test_registerRobot_incrementsId() public {
        vm.startPrank(operator);
        uint256 id0 = registry.registerRobot("Bot-0", "Model-A", robotWallet, MIN_STAKE);
        uint256 id1 = registry.registerRobot("Bot-1", "Model-B", robotWallet, MIN_STAKE);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(registry.nextRobotId(), 2);
    }

    function test_registerRobot_ownerRobotsTracked() public {
        vm.startPrank(operator);
        registry.registerRobot("Bot-0", "Model-A", robotWallet, MIN_STAKE);
        registry.registerRobot("Bot-1", "Model-B", robotWallet, MIN_STAKE);
        vm.stopPrank();

        uint256[] memory ids = registry.getOwnerRobots(operator);
        assertEq(ids.length, 2);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
    }

    function test_registerRobot_emitsEvent() public {
        vm.prank(operator);
        vm.expectEmit(true, true, false, true);
        emit ROVARegistry.RobotRegistered(0, operator, "G1-ALPHA");
        registry.registerRobot("G1-ALPHA", "Unitree G1", robotWallet, MIN_STAKE);
    }

    // ─── Deactivation ──────────────────────────────────────────

    function test_deactivateRobot_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        registry.deactivateRobot(robotId);

        assertFalse(registry.isRobotActive(robotId));
    }

    function test_deactivateRobot_notOwner_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotOwner.selector);
        registry.deactivateRobot(robotId);
    }

    // ─── Offerings ─────────────────────────────────────────────

    function test_publishOffering_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        uint256 offId = registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, 50e6, 30);

        assertEq(offId, 0);
        ROVARegistry.JobOffering memory o = registry.getOffering(offId);
        assertEq(o.robotId, robotId);
        assertEq(uint256(o.taskType), uint256(ROVARegistry.TaskType.CARRY));
        assertEq(o.priceUsdc, 50e6);
        assertEq(o.slaMinutes, 30);
        assertTrue(o.active);
    }

    function test_publishOffering_inactiveRobot_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        registry.deactivateRobot(robotId);

        vm.prank(operator);
        vm.expectRevert(ROVARegistry.RobotNotActive.selector);
        registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, 50e6, 30);
    }

    function test_publishOffering_notOwner_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotOwner.selector);
        registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, 50e6, 30);
    }

    function test_deactivateOffering_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        uint256 offId = registry.publishOffering(robotId, ROVARegistry.TaskType.NAVIGATE, 20e6, 60);

        vm.prank(operator);
        registry.deactivateOffering(offId);

        ROVARegistry.JobOffering memory o = registry.getOffering(offId);
        assertFalse(o.active);
    }

    function test_deactivateOffering_notOwner_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        uint256 offId = registry.publishOffering(robotId, ROVARegistry.TaskType.CARRY, 50e6, 30);

        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotOwner.selector);
        registry.deactivateOffering(offId);
    }

    // ─── Staking ───────────────────────────────────────────────

    function test_addStake_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(operator);
        registry.addStake(robotId, 500e18);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.stake, MIN_STAKE + 500e18);
    }

    function test_addStake_notOwner_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotOwner.selector);
        registry.addStake(robotId, 500e18);
    }

    // ─── Slashing ──────────────────────────────────────────────

    function test_slash_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE * 2);

        // deployer is admin
        registry.slash(robotId, 100e18);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.stake, MIN_STAKE * 2 - 100e18);
        assertEq(r.jobsFailed, 1);
        assertTrue(r.active); // still above min stake
    }

    function test_slash_deactivatesIfBelowMinStake() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        // Slash entire stake
        registry.slash(robotId, MIN_STAKE);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.stake, 0);
        assertFalse(r.active);
    }

    function test_slash_capsAtStakeAmount() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        // Slash more than stake — should cap
        registry.slash(robotId, MIN_STAKE * 2);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.stake, 0);
    }

    function test_slash_notAdmin_reverts() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotAdmin.selector);
        registry.slash(robotId, 100e18);
    }

    // ─── Reputation & Completion ───────────────────────────────

    function test_updateReputation_success() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        registry.updateReputation(robotId, 8500);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.reputation, 8500);
    }

    function test_recordCompletion_incrementsJobsCompleted() public {
        vm.prank(operator);
        uint256 robotId = registry.registerRobot("G1", "Unitree G1", robotWallet, MIN_STAKE);

        registry.recordCompletion(robotId);
        registry.recordCompletion(robotId);

        ROVARegistry.Robot memory r = registry.getRobot(robotId);
        assertEq(r.jobsCompleted, 2);
    }

    // ─── Admin ─────────────────────────────────────────────────

    function test_setMinStake_success() public {
        registry.setMinStake(2000e18);
        assertEq(registry.minStake(), 2000e18);
    }

    function test_setMinStake_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotAdmin.selector);
        registry.setMinStake(2000e18);
    }

    function test_setAdmin_success() public {
        registry.setAdmin(stranger);
        assertEq(registry.admin(), stranger);
    }

    function test_setAdmin_notAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVARegistry.NotAdmin.selector);
        registry.setAdmin(stranger);
    }
}
