/**
 * @agent-marketplace/shared
 *
 * web、mcp両方で使用する共通コード
 */

export {
  CONTRACT_ADDRESSES,
  RPC_URL,
  USDC_DECIMALS,
  USDC_UNIT,
  parseUSDC,
  formatUSDCAmount,
} from './config.js';

export { AGENT_REGISTRY_ABI, getProvider, getAgentRegistryContract } from './contract.js';
