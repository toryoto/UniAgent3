/**
 * @agent-marketplace/shared
 *
 * web、mcp、agentパッケージで使用する共通コード
 */

// Contract Addresses - Centralized
export {
  USDC_BASE_SEPOLIA_ADDRESS,
  USDC_SEPOLIA_ADDRESS,
  USDC_ADDRESS,
  AGENT_REGISTRY_ADDRESS,
  AGENT_RECEIVER_ADDRESS,
  SEPOLIA_NETWORK_ID,
  BASE_SEPOLIA_NETWORK_ID,
  X402_NETWORK,
  AGENT_IDS,
  AGENT_PRICES,
  CONTRACT_ADDRESSES, // Legacy support
} from './contracts.js';

// USDC Utilities
export {
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
  parseUSDCString,
  formatUSDCString,
} from './utils/usdc.js';

// Config (RPC URL)
export { RPC_URL } from './config.js';

// Contract Helpers
export { AGENT_REGISTRY_ABI, getProvider, getAgentRegistryContract } from './contract.js';

export type {
  A2ASkill,
  A2APaymentInfo,
  AgentCard,
  AgentJson,
  AgentJsonEndpoint,
  DiscoveredAgent,
  AgentRequest,
  AgentResponse,
  ExecutionLogEntry,
  X402PaymentInfo,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types.js';

// Services
export {
  discoverAgents,
  type DiscoverAgentsInput,
  type DiscoverAgentsOutput,
} from './services/index.js';
