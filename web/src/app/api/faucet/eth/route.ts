import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // TODO: Replace with your actual faucet API endpoint
    const faucetApiUrl = process.env.FAUCET_ETH_API_URL;

    // Development mode: Return mock response
    if (!faucetApiUrl) {
      console.log('[DEV] Faucet ETH request for:', address);
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return NextResponse.json({
        success: true,
        message: `Successfully sent 0.1 ETH to ${address.slice(0, 6)}...${address.slice(-4)}`,
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        amount: '0.1',
        address,
        note: 'This is a mock response. Configure FAUCET_ETH_API_URL for production.',
      });
    }

    // Call your faucet API
    const response = await fetch(faucetApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers if needed
        // 'Authorization': `Bearer ${process.env.FAUCET_API_KEY}`,
      },
      body: JSON.stringify({
        address,
        amount: '0.1', // Adjust amount as needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to request ETH from faucet' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: `Successfully sent ETH to ${address}`,
      txHash: data.txHash || data.transactionHash,
      ...data,
    });
  } catch (error) {
    console.error('Faucet ETH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

