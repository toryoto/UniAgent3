import { ethers } from 'hardhat';
import * as fs from 'fs';

async function main() {
  console.log('Starting USDC deployment...');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  const name = 'USDC';
  const symbol = 'USDC';
  const decimals = 6;
  const initialSupply = 10000n * 10n ** BigInt(decimals); // 10000 * 10^6 = 10000000000

  console.log('\nDeployment parameters:');
  console.log('  Name:', name);
  console.log('  Symbol:', symbol);
  console.log('  Decimals:', decimals);
  console.log('  Initial Supply:', ethers.formatUnits(initialSupply, decimals), symbol);

  console.log('\nDeploying Stablecoin (USDC)...');
  const Stablecoin = await ethers.getContractFactory('Stablecoin');
  const stablecoin = await Stablecoin.deploy(name, symbol, initialSupply, decimals);

  await stablecoin.waitForDeployment();
  const stablecoinAddress = await stablecoin.getAddress();

  console.log('✅ Stablecoin (USDC) deployed to:', stablecoinAddress);

  console.log('\n==================================================');
  console.log('📝 Deployment Summary');
  console.log('==================================================');
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Chain ID:', (await ethers.provider.getNetwork()).chainId);
  console.log('Deployer:', deployer.address);
  console.log('USDC Contract:', stablecoinAddress);
  console.log('Initial Supply:', ethers.formatUnits(initialSupply, decimals), symbol);
  console.log('==================================================');

  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contract: 'Stablecoin',
    contractAddress: stablecoinAddress,
    name,
    symbol,
    decimals: decimals.toString(),
    initialSupply: initialSupply.toString(),
    initialSupplyFormatted: ethers.formatUnits(initialSupply, decimals),
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/usdc-deployment-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  // Wait for block confirmations on live networks
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) {
    // Not localhost
    console.log('\n⏳ Waiting for block confirmations...');
    await stablecoin.deploymentTransaction()?.wait(2);
    console.log('✅ Confirmed!');

    console.log('\n📋 To verify the contract on explorer, run:');
    if (network.chainId === 84532n) {
      console.log(
        `npx hardhat verify --network base-sepolia ${stablecoinAddress} "${name}" "${symbol}" ${initialSupply} ${decimals}`
      );
    } else if (network.chainId === 11155111n) {
      console.log(
        `npx hardhat verify --network sepolia ${stablecoinAddress} "${name}" "${symbol}" ${initialSupply} ${decimals}`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
