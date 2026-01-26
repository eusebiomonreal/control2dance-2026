# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for client-side env vars (baked at build time)
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG PUBLIC_SITE_URL

# Set them as env vars for the build process
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

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

# Server-side env vars will be passed at runtime via docker-compose/dokploy

# Expose the port
EXPOSE 4321

# Start the server
CMD ["node", "./dist/server/entry.mjs"]
