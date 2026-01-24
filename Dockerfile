# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from subfolder
COPY control2dance-2026/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code from subfolder
COPY control2dance-2026/ .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

# Expose the port
EXPOSE 4321

# Start the server
CMD ["node", "./dist/server/entry.mjs"]
