/**
 * Agent Registry Contract Utilities (Web)
 *
 * ethers.jsを使用したスマートコントラクトとのやり取り
 * 共通機能は @agent-marketplace/shared から取得
 */

import { ethers } from 'ethers';
import type { AgentCard, Transaction } from '../types';

// 共通機能をインポート
import {
  AGENT_REGISTRY_ABI,
  getProvider,
  getAgentRegistryContract,
} from '@agent-marketplace/shared/contract';

// 共通機能を再エクスポート
export { AGENT_REGISTRY_ABI, getProvider, getAgentRegistryContract };

export function parseAgentCard(onChainData: any): AgentCard {
  // 平均評価を計算
  const averageRating =
    onChainData.ratingCount > 0
      ? Number(onChainData.totalRatings) / Number(onChainData.ratingCount)
      : 0;

  return {
    agentId: onChainData.agentId,
    name: onChainData.name,
    description: onChainData.description,
    url: onChainData.url,
    version: onChainData.version,
    defaultInputModes: onChainData.defaultInputModes,
    defaultOutputModes: onChainData.defaultOutputModes,
    skills: onChainData.skills.map((skill: any) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    })),
    owner: onChainData.owner,
    isActive: onChainData.isActive,
    createdAt: BigInt(onChainData.createdAt),
    totalRatings: BigInt(onChainData.totalRatings),
    ratingCount: BigInt(onChainData.ratingCount),
    averageRating,
    payment: {
      tokenAddress: onChainData.payment.tokenAddress,
      receiverAddress: onChainData.payment.receiverAddress,
      pricePerCall: BigInt(onChainData.payment.pricePerCall),
      chain: onChainData.payment.chain,
    },
    category: onChainData.category,
    imageUrl: onChainData.imageUrl,
  };
}

/**
 * Transactionの変換（オンチェーンデータ → TypeScript型）
 */
export function parseTransaction(onChainData: any): Transaction {
  return {
    txId: onChainData.txId,
    agentId: onChainData.agentId,
    caller: onChainData.caller,
    rating: Number(onChainData.rating),
    amount: BigInt(onChainData.amount),
    timestamp: BigInt(onChainData.timestamp),
  };
}

/**
 * 全エージェントIDを取得
 */
export async function getAllAgentIds(): Promise<string[]> {
  const contract = getAgentRegistryContract();
  const agentIds = await contract.getAllAgentIds();
  return agentIds;
}

/**
 * カテゴリ別エージェントIDを取得
 */
export async function getAgentsByCategory(category: string): Promise<string[]> {
  const contract = getAgentRegistryContract();
  const agentIds = await contract.getAgentsByCategory(category);
  return agentIds;
}

/**
 * アクティブなエージェントIDを取得
 */
export async function getActiveAgentsByCategory(category: string): Promise<string[]> {
  const contract = getAgentRegistryContract();
  const agentIds = await contract.getActiveAgentsByCategory(category);
  return agentIds;
}

/**
 * AgentCardを取得
 */
export async function getAgentCard(agentId: string): Promise<AgentCard> {
  const contract = getAgentRegistryContract();
  const onChainData = await contract.getAgentCard(agentId);
  return parseAgentCard(onChainData);
}

/**
 * 複数のAgentCardを一括取得
 */
export async function getAgentCards(agentIds: string[]): Promise<AgentCard[]> {
  const contract = getAgentRegistryContract();
  const promises = agentIds.map((id) => contract.getAgentCard(id));
  const onChainDataArray = await Promise.all(promises);
  return onChainDataArray.map(parseAgentCard);
}

/**
 * Transactionを取得
 */
export async function getTransaction(txId: string): Promise<Transaction> {
  const contract = getAgentRegistryContract();
  const onChainData = await contract.getTransaction(txId);
  return parseTransaction(onChainData);
}

/**
 * 全トランザクションIDを取得
 */
export async function getAllTransactionIds(): Promise<string[]> {
  const contract = getAgentRegistryContract();
  const txIds = await contract.getAllTransactionIds();
  return txIds;
}

/**
 * エージェント統計を取得
 */
export async function getAgentStats() {
  const contract = getAgentRegistryContract();
  const [totalAgents, totalTransactions] = await Promise.all([
    contract.getTotalAgentCount(),
    contract.getTotalTransactionCount(),
  ]);

  return {
    totalAgents: Number(totalAgents),
    totalTransactions: Number(totalTransactions),
  };
}

/**
 * トランザクションの記録（書き込み）
 */
export async function recordTransaction(
  signer: ethers.Signer,
  txId: string,
  agentId: string,
  amount: bigint
): Promise<ethers.ContractTransactionReceipt | null> {
  const contract = getAgentRegistryContract(signer);
  const tx = await contract.recordTransaction(txId, agentId, amount);
  const receipt = await tx.wait();
  return receipt;
}

/**
 * 評価の更新（書き込み）
 */
export async function updateTransactionRating(
  signer: ethers.Signer,
  txId: string,
  rating: number
): Promise<ethers.ContractTransactionReceipt | null> {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const contract = getAgentRegistryContract(signer);
  const tx = await contract.updateTransactionRating(txId, rating);
  const receipt = await tx.wait();
  return receipt;
}

/**
 * エージェントの平均評価を取得
 */
export async function getAverageRating(agentId: string): Promise<number> {
  const contract = getAgentRegistryContract();
  const avgRating = await contract.getAverageRating(agentId);
  // オンチェーンでは100倍されているので100で割る
  return Number(avgRating) / 100;
}
