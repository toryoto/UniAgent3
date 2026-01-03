import { ethers } from 'hardhat';

/**
 * Update agent URLs for already deployed agents
 *
 * Run this to update the URL of existing agents to the production Vercel URL
 *
 * Usage:
 * AGENT_REGISTRY_ADDRESS=0xe2B64700330af9e408ACb3A04a827045673311C1 BASE_URL=https://uni-agent-web.vercel.app npx hardhat run scripts/update-agent-urls.ts --network base-sepolia
 */

async function main() {
  // AgentRegistry contract address (Base Sepolia)
  const AGENT_REGISTRY_ADDRESS =
    process.env.AGENT_REGISTRY_ADDRESS || '0xe2B64700330af9e408ACb3A04a827045673311C1';

  // Base URL for agent.json endpoints
  const BASE_URL = process.env.BASE_URL;

  console.log('Updating agent URLs...');
  console.log('AgentRegistry address:', AGENT_REGISTRY_ADDRESS);
  console.log('Base URL:', BASE_URL);

  const [deployer] = await ethers.getSigners();
  console.log('Using account:', deployer.address);

  // Get AgentRegistry contract
  const AgentRegistry = await ethers.getContractFactory('AgentRegistry');
  const agentRegistry = AgentRegistry.attach(AGENT_REGISTRY_ADDRESS);

  // Payment info with zero address to keep current payment settings
  const keepPayment = {
    tokenAddress: ethers.ZeroAddress,
    receiverAddress: ethers.ZeroAddress,
    pricePerCall: 0,
    chain: '',
  };

  // Agent IDs (actual deployed IDs)
  const agent1Id = '0x0bddd164b1ba44c2b7bd2960cce576de2de93bd1da0b5621d6b8ffcffa91b75e'; // FlightFinderPro
  const agent2Id = '0x70fc477d5b587eed5078b44c890bae89e6497d5b1b9e115074eddbb3eb46dd0e'; // HotelBookerPro
  const agent3Id = '0xc1de1b2fcec91001afacbf4acc007ff0b96e84c2f9c7ca785cba05102234b0fc'; // TourismGuide

  // Update Agent 1: FlightFinderPro
  console.log('\n1️⃣ Updating FlightFinderPro URL...');
  try {
    const tx1 = await agentRegistry.updateAgent(
      agent1Id,
      '', // name: keep current
      '', // description: keep current
      `${BASE_URL}/api/agents/flight/.well-known/agent.json`, // url: update
      '', // version: keep current
      keepPayment, // payment: keep current
      '' // imageUrl: keep current
    );
    await tx1.wait();
    console.log('✅ FlightFinderPro URL updated');
  } catch (error: any) {
    if (error.message.includes('not owner')) {
      console.log('⚠️  FlightFinderPro: Not the owner. Skipping...');
    } else if (error.message.includes('does not exist')) {
      console.log('⚠️  FlightFinderPro: Agent does not exist. Skipping...');
    } else {
      throw error;
    }
  }

  // Update Agent 2: HotelBookerPro
  console.log('\n2️⃣ Updating HotelBookerPro URL...');
  try {
    const tx2 = await agentRegistry.updateAgent(
      agent2Id,
      '', // name: keep current
      '', // description: keep current
      `${BASE_URL}/api/agents/hotel/.well-known/agent.json`, // url: update
      '', // version: keep current
      keepPayment, // payment: keep current
      '' // imageUrl: keep current
    );
    await tx2.wait();
    console.log('✅ HotelBookerPro URL updated');
  } catch (error: any) {
    if (error.message.includes('not owner')) {
      console.log('⚠️  HotelBookerPro: Not the owner. Skipping...');
    } else if (error.message.includes('does not exist')) {
      console.log('⚠️  HotelBookerPro: Agent does not exist. Skipping...');
    } else {
      throw error;
    }
  }

  // Update Agent 3: TourismGuide
  console.log('\n3️⃣ Updating TourismGuide URL...');
  try {
    const tx3 = await agentRegistry.updateAgent(
      agent3Id,
      '', // name: keep current
      '', // description: keep current
      `${BASE_URL}/api/agents/tourism/.well-known/agent.json`, // url: update
      '', // version: keep current
      keepPayment, // payment: keep current
      '' // imageUrl: keep current
    );
    await tx3.wait();
    console.log('✅ TourismGuide URL updated');
  } catch (error: any) {
    if (error.message.includes('not owner')) {
      console.log('⚠️  TourismGuide: Not the owner. Skipping...');
    } else if (error.message.includes('does not exist')) {
      console.log('⚠️  TourismGuide: Agent does not exist. Skipping...');
    } else {
      throw error;
    }
  }

  // Display summary
  console.log('\n==================================================');
  console.log('📝 Update Summary');
  console.log('==================================================');
  console.log('Updated URLs:');
  console.log('1. FlightFinderPro:', `${BASE_URL}/api/agents/flight/.well-known/agent.json`);
  console.log('2. HotelBookerPro:', `${BASE_URL}/api/agents/hotel/.well-known/agent.json`);
  console.log('3. TourismGuide:', `${BASE_URL}/api/agents/tourism/.well-known/agent.json`);
  console.log('==================================================');

  // Verify updates
  console.log('\n🔍 Verifying updates...');
  try {
    const agent1 = await agentRegistry.getAgentCard(agent1Id);
    console.log('FlightFinderPro URL:', agent1.url);
  } catch (error) {
    console.log('⚠️  Could not verify FlightFinderPro');
  }

  try {
    const agent2 = await agentRegistry.getAgentCard(agent2Id);
    console.log('HotelBookerPro URL:', agent2.url);
  } catch (error) {
    console.log('⚠️  Could not verify HotelBookerPro');
  }

  try {
    const agent3 = await agentRegistry.getAgentCard(agent3Id);
    console.log('TourismGuide URL:', agent3.url);
  } catch (error) {
    console.log('⚠️  Could not verify TourismGuide');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
