# ─────────────────────────────────────────────────────────────────────────────
# Stage: production
# Base: node:20-alpine (slim, security-patched, ~50 MB)
# Aligned with FrontEndSME (node:20-alpine) and engines>=20 in package.json.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Install dumb-init for proper signal handling (PID 1 problem)
RUN apk add --no-cache dumb-init

# Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependency manifests first (layer-cache: only re-runs npm ci
# when package*.json changes, not on every source code change)
COPY package*.json ./

# Install production dependencies only. Use `npm ci` for reproducible
# builds (matches package-lock.json exactly); --omit=dev keeps the image
# small; --ignore-scripts blocks arbitrary install hooks from dependencies.
RUN npm ci --omit=dev --ignore-scripts

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
