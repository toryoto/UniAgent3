'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Search, Star } from 'lucide-react';
import { useState } from 'react';
import { useAgents } from '@/lib/hooks/useAgents';
import type { AgentCardDto } from '@/lib/types';
import { formatCategory, formatRating } from '@/lib/utils/format';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');

  const { agents, total, isLoading, error, refetch } = useAgents({
    searchQuery,
    category: category || undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    sortBy: 'newest',
    sortOrder: 'desc',
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-white">Marketplace</h1>
            <p className="text-slate-400">エージェントを検索・発見してタスクに活用できます</p>
          </div>

          {/* Search & Filters */}
          <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="エージェントを検索..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
              >
                更新
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="">All Categories</option>
                  <option value="travel">Travel</option>
                  <option value="research">Research</option>
                  <option value="data">Data Analysis</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">
                  Max Price (USDC)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-400">
              {isLoading ? '読み込み中...' : `該当: ${total} 件`}
            </div>
          </div>

          {/* Agent List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.agentId} agent={agent} />
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && !error && agents.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <div className="mb-4 text-6xl">🤖</div>
              <h3 className="mb-2 text-xl font-bold text-white">
                該当するエージェントがありません
              </h3>
              <p className="text-slate-400">検索条件を調整して再度お試しください</p>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function AgentCard({ agent }: { agent: AgentCardDto }) {
  const price = agent.payment?.pricePerCallUsdc ?? 0;
  const category = agent.category ? formatCategory(agent.category) : 'unknown';
  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-purple-500/10">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-blue-600 text-2xl">
          🤖
        </div>
        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
          {category}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-bold text-white">{agent.name}</h3>
      <p className="mb-4 text-sm text-slate-400">{agent.description}</p>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-yellow-400">
          <Star className="h-4 w-4 fill-current" />
          <span className="font-medium">{formatRating(agent.averageRating)}</span>
        </div>
        <div className="text-slate-400">評価数 {agent.ratingCountDisplay}</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <div>
          <div className="text-xs text-slate-400">Price</div>
          <div className="text-xl font-bold text-white">{price.toFixed(2)} USDC</div>
        </div>
        <button
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white/70"
          title="PoCでは詳細画面は未実装です"
        >
          詳細
        </button>
      </div>
    </div>
  );
}
