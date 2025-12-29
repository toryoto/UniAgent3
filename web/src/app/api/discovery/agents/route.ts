import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { AgentCardDto, ApiResponse, DiscoveryApiResponse } from '@/lib/types';
import { averageFromTotals, parseBigIntLike, usdcBaseUnitsToNumber } from '@/lib/utils/units';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  maxPrice: z
    .preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : v),
      z.coerce.number()
    )
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), 'maxPrice must be >= 0')
    .optional(),
  minRating: z
    .preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : v),
      z.coerce.number()
    )
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 5),
      'minRating must be between 0 and 5'
    )
    .optional(),
  limit: z
    .preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : v),
      z.coerce.number()
    )
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v >= 1 && v <= 100),
      'limit must be 1-100'
    )
    .optional()
    .default(30),
  offset: z
    .preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : v),
      z.coerce.number()
    )
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), 'offset must be >= 0')
    .optional()
    .default(0),
  sortBy: z.enum(['rating', 'price', 'newest']).optional().default('newest'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

function toLowerSafe(v: unknown): string {
  return typeof v === 'string' ? v.toLowerCase() : '';
}

function computeAverageRating(totalRatings: unknown, ratingCount: unknown): number {
  // PoCなので Number へ落とす（評価は小さい値を想定）
  return averageFromTotals(totalRatings, ratingCount);
}

function computePriceUsdc(pricePerCall: unknown): number {
  // USDC 6 decimals を想定（on-chain value は最小単位の整数）
  return usdcBaseUnitsToNumber(pricePerCall);
}

function normalizeAgentCardDto(agentCardJson: any): AgentCardDto | null {
  if (!agentCardJson || typeof agentCardJson !== 'object') return null;

  const avg = computeAverageRating(agentCardJson.totalRatings, agentCardJson.ratingCount);
  const priceUsdc = computePriceUsdc(agentCardJson?.payment?.pricePerCall);
  const ratingCountBig = parseBigIntLike(agentCardJson.ratingCount) ?? BigInt(0);

  const dto: AgentCardDto = {
    agentId: String(agentCardJson.agentId ?? ''),
    name: String(agentCardJson.name ?? ''),
    description: String(agentCardJson.description ?? ''),
    url: String(agentCardJson.url ?? ''),
    version: typeof agentCardJson.version === 'string' ? agentCardJson.version : undefined,
    defaultInputModes: Array.isArray(agentCardJson.defaultInputModes)
      ? agentCardJson.defaultInputModes.filter((v: any) => typeof v === 'string')
      : undefined,
    defaultOutputModes: Array.isArray(agentCardJson.defaultOutputModes)
      ? agentCardJson.defaultOutputModes.filter((v: any) => typeof v === 'string')
      : undefined,
    skills: Array.isArray(agentCardJson.skills)
      ? agentCardJson.skills
          .filter((s: any) => s && typeof s === 'object')
          .map((s: any) => ({
            id: String(s.id ?? ''),
            name: String(s.name ?? ''),
            description: String(s.description ?? ''),
          }))
      : undefined,
    owner: typeof agentCardJson.owner === 'string' ? agentCardJson.owner : undefined,
    isActive: typeof agentCardJson.isActive === 'boolean' ? agentCardJson.isActive : undefined,
    createdAt: typeof agentCardJson.createdAt === 'string' ? agentCardJson.createdAt : undefined,
    totalRatings:
      typeof agentCardJson.totalRatings === 'string' ? agentCardJson.totalRatings : undefined,
    ratingCount:
      typeof agentCardJson.ratingCount === 'string' ? agentCardJson.ratingCount : undefined,
    averageRating: Number.isFinite(avg) ? avg : 0,
    payment: agentCardJson.payment
      ? {
          tokenAddress:
            typeof agentCardJson.payment.tokenAddress === 'string'
              ? agentCardJson.payment.tokenAddress
              : undefined,
          receiverAddress:
            typeof agentCardJson.payment.receiverAddress === 'string'
              ? agentCardJson.payment.receiverAddress
              : undefined,
          pricePerCall:
            typeof agentCardJson.payment.pricePerCall === 'string'
              ? agentCardJson.payment.pricePerCall
              : undefined,
          pricePerCallUsdc: Number.isFinite(priceUsdc) ? priceUsdc : 0,
          chain:
            typeof agentCardJson.payment.chain === 'string'
              ? agentCardJson.payment.chain
              : undefined,
        }
      : {
          pricePerCallUsdc: 0,
        },
    category: typeof agentCardJson.category === 'string' ? agentCardJson.category : undefined,
    imageUrl: typeof agentCardJson.imageUrl === 'string' ? agentCardJson.imageUrl : undefined,
    ratingCountDisplay: Number(ratingCountBig),
  };

  // 必須の最低限（表示崩れ防止）
  if (!dto.agentId || !dto.name) return null;
  return dto;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      q: sp.get('q') ?? undefined,
      category: sp.get('category') ?? undefined,
      maxPrice: sp.get('maxPrice') ?? undefined,
      minRating: sp.get('minRating') ?? undefined,
      limit: sp.get('limit') ?? undefined,
      offset: sp.get('offset') ?? undefined,
      sortBy: sp.get('sortBy') ?? undefined,
      sortOrder: sp.get('sortOrder') ?? undefined,
    });

    if (!parsed.success) {
      const res: ApiResponse<never> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid query',
      };
      return NextResponse.json(res, { status: 400 });
    }

    const { q, category, maxPrice, minRating, limit, offset, sortBy, sortOrder } = parsed.data;

    const rows = await prisma.agentCache.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500, // PoC: まずはDBから多めに取り、詳細フィルタはメモリで実施
    });

    const normalized = rows
      .map((r) => normalizeAgentCardDto(r.agentCard))
      .filter((v): v is AgentCardDto => Boolean(v));

    const qLower = q ? q.toLowerCase() : '';

    const filtered = normalized.filter((a) => {
      if (qLower) {
        const hay = [
          a.name,
          a.description,
          a.category ?? '',
          ...(a.skills?.map((s) => s.name) ?? []),
          ...(a.skills?.map((s) => s.description) ?? []),
        ]
          .map((s) => toLowerSafe(s))
          .join(' ');
        if (!hay.includes(qLower)) return false;
      }

      if (typeof maxPrice === 'number') {
        const price = a.payment?.pricePerCallUsdc ?? 0;
        if (price > maxPrice) return false;
      }

      if (typeof minRating === 'number') {
        if ((a.averageRating ?? 0) < minRating) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'rating') return dir * ((a.averageRating ?? 0) - (b.averageRating ?? 0));
      if (sortBy === 'price')
        return (
          dir *
          (((a.payment?.pricePerCallUsdc ?? 0) as number) -
            ((b.payment?.pricePerCallUsdc ?? 0) as number))
        );

      // newest
      const aTs = Number(parseBigIntLike(a.createdAt) ?? BigInt(0));
      const bTs = Number(parseBigIntLike(b.createdAt) ?? BigInt(0));
      return dir * (aTs - bTs);
    });

    const total = sorted.length;
    const agents = sorted.slice(offset, offset + limit);

    const data: DiscoveryApiResponse = { agents, total };
    const res: ApiResponse<DiscoveryApiResponse> = { success: true, data };
    return NextResponse.json(res);
  } catch (e) {
    const res: ApiResponse<never> = {
      success: false,
      error: e instanceof Error ? e.message : 'Internal server error',
    };
    return NextResponse.json(res, { status: 500 });
  }
}
