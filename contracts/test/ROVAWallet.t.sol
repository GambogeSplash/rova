// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import {ROVAWallet} from "../src/ROVAWallet.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ROVAWalletTest is Test {
    ROVAWallet public wallet;
    MockERC20 public usdc;

    address public operatorAddr = makeAddr("operator");
    address public robotAddr = makeAddr("robot");
    address public dest1 = makeAddr("dest1");
    address public dest2 = makeAddr("dest2");
    address public stranger = makeAddr("stranger");

    uint256 public constant MAX_DAILY = 1000e6; // 1000 USDC

    function setUp() public {
        vm.prank(operatorAddr);
        wallet = new ROVAWallet(operatorAddr, robotAddr, MAX_DAILY);

        usdc = new MockERC20("USDC", "USDC", 6);

        // Fund wallet with USDC
        usdc.mint(address(wallet), 10_000e6);

        // Allow dest1
        vm.prank(operatorAddr);
        wallet.setDestination(dest1, true);
    }

    // ─── Withdraw ERC20 ────────────────────────────────────────

    function test_withdraw_success() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, 500e6);

        assertEq(usdc.balanceOf(dest1), 500e6);
    }

    function test_withdraw_updatesWithdrawnToday() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, 300e6);

        assertEq(wallet.withdrawnToday(), 300e6);
    }

    function test_withdraw_notOperator_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.withdraw(address(usdc), dest1, 100e6);
    }

    function test_withdraw_paused_reverts() public {
        vm.prank(operatorAddr);
        wallet.emergencyPause();

        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.WalletPaused.selector);
        wallet.withdraw(address(usdc), dest1, 100e6);
    }

    function test_withdraw_destinationNotAllowed_reverts() public {
        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.DestinationNotAllowed.selector);
        wallet.withdraw(address(usdc), dest2, 100e6); // dest2 not allowed
    }

    function test_withdraw_dailyLimitExceeded_reverts() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, MAX_DAILY);

        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.DailyLimitExceeded.selector);
        wallet.withdraw(address(usdc), dest1, 1); // even 1 wei exceeds
    }

    function test_withdraw_multipleWithinLimit_success() public {
        vm.startPrank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, 400e6);
        wallet.withdraw(address(usdc), dest1, 400e6);
        vm.stopPrank();

        assertEq(wallet.withdrawnToday(), 800e6);
        assertEq(usdc.balanceOf(dest1), 800e6);
    }

    // ─── Daily limit reset ─────────────────────────────────────

    function test_withdraw_dailyLimitResetsAfter24h() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, MAX_DAILY);

        // Warp forward 1 day
        vm.warp(block.timestamp + 1 days);

        // Should be able to withdraw again
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, MAX_DAILY);

        assertEq(usdc.balanceOf(dest1), MAX_DAILY * 2);
    }

    // ─── Withdraw ETH ──────────────────────────────────────────

    function test_withdrawEth_success() public {
        // Fund wallet with ETH
        vm.deal(address(wallet), 10 ether);

        vm.prank(operatorAddr);
        wallet.withdrawEth(payable(dest1), 100e6);

        assertEq(dest1.balance, 100e6);
    }

    function test_withdrawEth_notOperator_reverts() public {
        vm.deal(address(wallet), 10 ether);

        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.withdrawEth(payable(dest1), 1 ether);
    }

    function test_withdrawEth_paused_reverts() public {
        vm.deal(address(wallet), 10 ether);

        vm.prank(operatorAddr);
        wallet.emergencyPause();

        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.WalletPaused.selector);
        wallet.withdrawEth(payable(dest1), 1 ether);
    }

    function test_withdrawEth_destinationNotAllowed_reverts() public {
        vm.deal(address(wallet), 10 ether);

        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.DestinationNotAllowed.selector);
        wallet.withdrawEth(payable(dest2), 1 ether);
    }

    function test_withdrawEth_dailyLimitExceeded_reverts() public {
        vm.deal(address(wallet), 10 ether);

        vm.prank(operatorAddr);
        wallet.withdrawEth(payable(dest1), MAX_DAILY);

        vm.prank(operatorAddr);
        vm.expectRevert(ROVAWallet.DailyLimitExceeded.selector);
        wallet.withdrawEth(payable(dest1), 1);
    }

    // ─── Receive ETH ───────────────────────────────────────────

    function test_receiveEth_emitsEvent() public {
        vm.deal(stranger, 5 ether);

        vm.prank(stranger);
        vm.expectEmit(true, false, false, true);
        emit ROVAWallet.Received(stranger, 1 ether);
        (bool ok,) = address(wallet).call{value: 1 ether}("");
        assertTrue(ok);

        assertEq(address(wallet).balance, 1 ether);
    }

    // ─── Destination Allowlist ─────────────────────────────────

    function test_setDestination_allow() public {
        vm.prank(operatorAddr);
        wallet.setDestination(dest2, true);

        assertTrue(wallet.allowedDestinations(dest2));
    }

    function test_setDestination_revoke() public {
        vm.prank(operatorAddr);
        wallet.setDestination(dest1, false);

        assertFalse(wallet.allowedDestinations(dest1));
    }

    function test_setDestination_notOperator_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.setDestination(dest2, true);
    }

    // ─── Emergency Pause/Unpause ───────────────────────────────

    function test_emergencyPause_success() public {
        vm.prank(operatorAddr);
        wallet.emergencyPause();

        assertTrue(wallet.paused());
    }

    function test_unpause_success() public {
        vm.startPrank(operatorAddr);
        wallet.emergencyPause();
        wallet.unpause();
        vm.stopPrank();

        assertFalse(wallet.paused());
    }

    function test_emergencyPause_notOperator_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.emergencyPause();
    }

    function test_unpause_notOperator_reverts() public {
        vm.prank(operatorAddr);
        wallet.emergencyPause();

        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.unpause();
    }

    // ─── Policy Controls ───────────────────────────────────────

    function test_setMaxDailyWithdraw_success() public {
        vm.prank(operatorAddr);
        wallet.setMaxDailyWithdraw(5000e6);

        assertEq(wallet.maxDailyWithdraw(), 5000e6);
    }

    function test_setMaxDailyWithdraw_notOperator_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ROVAWallet.NotOperator.selector);
        wallet.setMaxDailyWithdraw(5000e6);
    }

    // ─── Views ─────────────────────────────────────────────────

    function test_tokenBalance_returnsCorrectBalance() public view {
        assertEq(wallet.tokenBalance(address(usdc)), 10_000e6);
    }

    function test_ethBalance_returnsCorrectBalance() public {
        vm.deal(address(wallet), 3 ether);
        assertEq(wallet.ethBalance(), 3 ether);
    }

    function test_remainingDailyAllowance_full() public view {
        assertEq(wallet.remainingDailyAllowance(), MAX_DAILY);
    }

    function test_remainingDailyAllowance_partial() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, 600e6);

        assertEq(wallet.remainingDailyAllowance(), MAX_DAILY - 600e6);
    }

    function test_remainingDailyAllowance_resetsAfterDay() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, MAX_DAILY);

        assertEq(wallet.remainingDailyAllowance(), 0);

        vm.warp(block.timestamp + 1 days);
        assertEq(wallet.remainingDailyAllowance(), MAX_DAILY);
    }

    function test_remainingDailyAllowance_exhausted() public {
        vm.prank(operatorAddr);
        wallet.withdraw(address(usdc), dest1, MAX_DAILY);

        assertEq(wallet.remainingDailyAllowance(), 0);
    }

    // ─── Constructor state ─────────────────────────────────────

    function test_constructor_setsState() public view {
        assertEq(wallet.operator(), operatorAddr);
        assertEq(wallet.robot(), robotAddr);
        assertEq(wallet.maxDailyWithdraw(), MAX_DAILY);
        assertFalse(wallet.paused());
    }
}
