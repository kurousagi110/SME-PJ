# ─────────────────────────────────────────────────────────────────────────────
# Stage: production
# Base: node:18-alpine (slim, security-patched, ~50 MB)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine

# Install dumb-init for proper signal handling (PID 1 problem)
RUN apk add --no-cache dumb-init

# Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependency manifests first (layer-cache: only re-runs npm install
# when package*.json changes, not on every source code change)
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy application source code
# (node_modules, .env, .git etc. are excluded via .dockerignore)
COPY . .

# Transfer ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Document the port the app listens on.
# The actual value is controlled by the PORT environment variable (default 5000).
EXPOSE 5000

# Use dumb-init as PID 1 so SIGTERM is forwarded to the Node process
# (enables graceful shutdown — server.close + client.close)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
