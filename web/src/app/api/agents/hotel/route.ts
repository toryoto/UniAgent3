/**
 * Hotel Agent API Route
 *
 * POST /api/agents/hotel - ホテル検索（x402決済対応）
 *
 * @x402/next を使用した標準実装
 */

import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import type { Address } from 'viem';
import { hotelAgent, type HotelSearchResult } from '@/lib/agents/hotel';
import type { AgentJsonRpcRouteResponse } from '@/lib/x402/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = async (
  req: NextRequest
): Promise<NextResponse<AgentJsonRpcRouteResponse<HotelSearchResult>>> => {
  try {
    const body = await req.json();
    const params = body.params || {};
    const result = hotelAgent.generateMockResponse(params);

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      result,
    });
  } catch (error) {
    console.error('Hotel agent error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal Server Error',
        },
      },
      { status: 500 }
    );
  }
};

const facilitatorClient = new HTTPFacilitatorClient({
  url: 'https://x402.org/facilitator',
});

const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server);

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: 'exact',
        price: hotelAgent.price,
        network: 'eip155:84532',
        payTo: hotelAgent.receiverAddress as Address,
      },
    ],
    description: hotelAgent.description,
    mimeType: 'application/json',
  },
  server
);
