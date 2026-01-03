/**
 * Vercel Serverless Function entry point for Agent Service
 *
 * ExpressサーバーをVercelのServerless Functions形式でラップ
 */

// @ts-ignore - @vercel/node is available at runtime in Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import type { AgentRequest, AgentResponse } from '@agent-marketplace/shared';
import { runAgent } from '../src/core/agent.js';
import { logger } from '../src/utils/logger.js';

// Expressアプリを作成
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.http.info(`${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agent' });
});

/**
 * Agent execution endpoint
 *
 * POST /api/agent
 * Body: { message: string, walletId: string, walletAddress: string, maxBudget: number }
 */
app.post('/api/agent', async (req, res) => {
  try {
    const { message, walletId, walletAddress, maxBudget } = req.body as AgentRequest;

    // Validation
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'message is required and must be a string',
      });
      return;
    }

    if (!walletId || typeof walletId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'walletId is required and must be a string',
      });
      return;
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({
        success: false,
        error: 'walletAddress is required and must be a string',
      });
      return;
    }

    if (typeof maxBudget !== 'number' || maxBudget <= 0) {
      res.status(400).json({
        success: false,
        error: 'maxBudget must be a positive number',
      });
      return;
    }

    // Run agent
    const result: AgentResponse = await runAgent({ message, walletId, walletAddress, maxBudget });

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.agent.error('Request failed', { error: errorMessage });

    res.status(500).json({
      success: false,
      message: '',
      executionLog: [],
      totalCost: 0,
      error: errorMessage,
    });
  }
});

/**
 * SSE Streaming endpoint
 *
 * POST /api/agent/stream
 */
app.post('/api/agent/stream', async (req, res) => {
  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, walletId, walletAddress, maxBudget } = req.body as AgentRequest;

    // Validation
    if (!message || !walletId || !walletAddress || typeof maxBudget !== 'number') {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Invalid request' })}\n\n`);
      res.end();
      return;
    }

    // Start event
    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    // Run agent (non-streaming for now)
    const result = await runAgent({ message, walletId, walletAddress, maxBudget });

    // Send execution log as events
    for (const entry of result.executionLog) {
      res.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`);
    }

    // Final result
    res.write(
      `data: ${JSON.stringify({
        type: 'end',
        success: result.success,
        message: result.message,
        totalCost: result.totalCost,
        error: result.error,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
    res.end();
  }
});

// Vercel Serverless Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
