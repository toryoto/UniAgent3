# Multi-stage build for MCP Server
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY mcp/package*.json ./mcp/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --omit=dev

# Build shared package
FROM base AS shared-builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY package*.json ./
RUN cd packages/shared && npm ci && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mcp/node_modules ./mcp/node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/

# Copy MCP server source
COPY mcp ./mcp
COPY package.json ./

# Expose port
EXPOSE 3001

# Health check - MCPサーバーのSSEエンドポイントを確認
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/sse', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 405 ? 0 : 1)})"

# Start MCP server
CMD ["npm", "run", "start", "-w", "mcp"]

