// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title ROVAWallet — ERC-4337-ready smart wallet for robots
/// @notice Receives payment on task completion. Fleet operator sets withdrawal rules.
///         Emergency pause blocks all outgoing transactions.
contract ROVAWallet {
    // ─── State ───────────────────────────────────────────────────
    address public operator;        // fleet operator
    address public robot;           // robot identity (can receive on behalf)
    bool    public paused;

    uint256 public maxDailyWithdraw;
    uint256 public withdrawnToday;
    uint256 public dayStart;

    mapping(address => bool) public allowedDestinations;

    // ─── Events ──────────────────────────────────────────────────
    event Received(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, address indexed token, uint256 amount);
    event Paused();
    event Unpaused();
    event DailyLimitSet(uint256 limit);
    event DestinationSet(address indexed dest, bool allowed);

    // ─── Errors ──────────────────────────────────────────────────
    error NotOperator();
    error WalletPaused();
    error DailyLimitExceeded();
    error DestinationNotAllowed();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert WalletPaused();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────
    constructor(address _operator, address _robot, uint256 _maxDailyWithdraw) {
        operator = _operator;
        robot = _robot;
        maxDailyWithdraw = _maxDailyWithdraw;
        dayStart = block.timestamp;
    }

    // ─── Receive ETH ─────────────────────────────────────────────
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // ─── Withdraw ERC20 ──────────────────────────────────────────
    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOperator whenNotPaused {
        if (!allowedDestinations[to]) revert DestinationNotAllowed();

        _resetDayIfNeeded();
        if (withdrawnToday + amount > maxDailyWithdraw) revert DailyLimitExceeded();
        withdrawnToday += amount;

        IERC20(token).transfer(to, amount);
        emit Withdrawn(to, token, amount);
    }

    // ─── Withdraw ETH ────────────────────────────────────────────
    function withdrawEth(address payable to, uint256 amount) external onlyOperator whenNotPaused {
        if (!allowedDestinations[to]) revert DestinationNotAllowed();

        _resetDayIfNeeded();
        if (withdrawnToday + amount > maxDailyWithdraw) revert DailyLimitExceeded();
        withdrawnToday += amount;

        to.transfer(amount);
        emit Withdrawn(to, address(0), amount);
    }

    // ─── Policy Controls ─────────────────────────────────────────
    function setMaxDailyWithdraw(uint256 _limit) external onlyOperator {
        maxDailyWithdraw = _limit;
        emit DailyLimitSet(_limit);
    }

    function setDestination(address dest, bool allowed) external onlyOperator {
        allowedDestinations[dest] = allowed;
        emit DestinationSet(dest, allowed);
    }

    // ─── Emergency ───────────────────────────────────────────────
    function emergencyPause() external onlyOperator {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOperator {
        paused = false;
        emit Unpaused();
    }

    // ─── Internal ────────────────────────────────────────────────
    function _resetDayIfNeeded() internal {
        if (block.timestamp >= dayStart + 1 days) {
            dayStart = block.timestamp;
            withdrawnToday = 0;
        }
    }

    // ─── Views ───────────────────────────────────────────────────
    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function remainingDailyAllowance() external view returns (uint256) {
        if (block.timestamp >= dayStart + 1 days) return maxDailyWithdraw;
        if (withdrawnToday >= maxDailyWithdraw) return 0;
        return maxDailyWithdraw - withdrawnToday;
    }
}
