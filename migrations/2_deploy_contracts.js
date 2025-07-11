const SimpleToken = artifacts.require("SimpleToken");
const fs = require('fs');

module.exports = function(deployer, network, accounts) {
  console.log("Deploying SimpleToken contract...");
  console.log("Network:", network);
  console.log("Deployer account:", accounts[0]);

  const initialSupply = 10000000;

  deployer.deploy(SimpleToken, initialSupply).then(function(instance) {
    console.log("SimpleToken deployed at address:", instance.address);
    
    // Save the contract address to frontend
    const contractInfo = {
        address: instance.address,
        network: network,
        deployedAt: new Date().toISOString(),
        initialSupply: initialSupply,
        abi: SimpleToken.abi
    };

    fs.writeFileSync(
        'contract-info.json',
        JSON.stringify(contractInfo, null, 2)
    );

    console.log("Contract information saved to contract-info.json");

    if (network === 'sepolia') {
      console.log("\n=== Deployment Summary ===");
      console.log("Contract Address:", instance.address);
      console.log("Network: Sepolia Testnet");
      console.log("Initial Supply:", initialSupply, "tokens");
      console.log("Deployer Balance: Check the Sepolia block explorer for your account balance.");
      console.log("\nNext steps:");
      console.log("1. Update CONTRACT_ADDRESS in your frontend/src/App.js");
      console.log("2. Verify contract: truffle verify SimpleToken --network sepolia");
      console.log("3. View on Etherscan: https://sepolia.etherscan.io/address/" + instance.address);
    }

    return instance;
  });
};
