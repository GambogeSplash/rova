// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ROVARegistry} from "../src/ROVARegistry.sol";
import {ROVAVerifier} from "../src/ROVAVerifier.sol";
import {ROVAMarket} from "../src/ROVAMarket.sol";
import {ROVAWallet} from "../src/ROVAWallet.sol";

/// @notice Deploys all ROVA contracts to Base Sepolia
/// @dev Run: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
contract DeployROVA is Script {
    function run() external {
        // Config — replace with actual addresses before deployment
        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        address rovaToken = vm.envOr("ROVA_TOKEN_ADDRESS", address(0));
        uint256 minStake = 100e18; // 100 ROVA minimum stake

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Registry
        ROVARegistry registry = new ROVARegistry(rovaToken, minStake);
        console.log("ROVARegistry deployed at:", address(registry));

        // 2. Deploy Verifier
        ROVAVerifier verifier = new ROVAVerifier();
        console.log("ROVAVerifier deployed at:", address(verifier));

        // 3. Deploy Market
        ROVAMarket market = new ROVAMarket(usdc, address(registry), address(verifier));
        console.log("ROVAMarket deployed at:", address(market));

        // 4. Wire up: Verifier needs to know Market address
        verifier.setMarket(address(market));
        console.log("Verifier.market set to:", address(market));

        // 5. Registry admin should be Market (for slash/recordCompletion calls)
        registry.setAdmin(address(market));
        console.log("Registry.admin set to:", address(market));

        // 6. Deploy a sample wallet for demo robot
        ROVAWallet wallet = new ROVAWallet(deployer, deployer, 50e6); // 50 USDC daily limit
        console.log("ROVAWallet (demo) deployed at:", address(wallet));

        vm.stopBroadcast();

        console.log("\n=== ROVA Protocol Deployed ===");
        console.log("Network: Base Sepolia");
        console.log("Registry:", address(registry));
        console.log("Verifier:", address(verifier));
        console.log("Market:  ", address(market));
        console.log("Wallet:  ", address(wallet));
    }
}
