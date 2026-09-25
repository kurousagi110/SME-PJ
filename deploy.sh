#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SME ERP — Zero-Downtime Rolling Deployment Script
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -Eeuo pipefail

log() {
  echo -e "\033[1;34m[SME-DEPLOY]\033[0m $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
  echo -e "\033[1;31m[SME-DEPLOY ERROR]\033[0m $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log "Starting deployment sequence for SME ERP..."

# 1. Pull latest code from main branch
log "Pulling latest changes from git repository..."
git fetch origin main
git reset --hard origin/main

# 2. Build containers
log "Building Docker images (parallel)..."
docker compose build --parallel

# 3. Rolling update containers without dropping database volume
log "Recreating containers with rolling update..."
docker compose up -d --remove-orphans

# 4. Wait for containers to be healthy
log "Waiting for services to become healthy..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  STATUS_API=$(docker inspect --format='{{json .State.Health.Status}}' sme_api 2>/dev/null || echo '"unknown"')
  STATUS_FE=$(docker inspect --format='{{json .State.Health.Status}}' sme_frontend 2>/dev/null || echo '"unknown"')

  if [[ "$STATUS_API" == *"healthy"* ]] && [[ "$STATUS_FE" == *"healthy"* ]]; then
    HEALTHY=true
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  log "Waiting for healthcheck... ($RETRY_COUNT/$MAX_RETRIES) - API: $STATUS_API, FE: $STATUS_FE"
  sleep 4
done

if [ "$HEALTHY" = false ]; then
  error "Deployment verification failed: Containers did not report healthy in time!"
  docker compose ps
  docker compose logs --tail 30 api
  exit 1
fi

# 5. Hot reload Nginx to refresh upstream connections and certificates
log "Hot reloading Nginx proxy..."
docker exec sme_nginx nginx -t
docker exec sme_nginx nginx -s reload

# 6. Verify health endpoint
log "Performing end-to-end API health check..."
if curl -sSf http://127.0.0.1/api/v1/health > /dev/null; then
  log "Health check passed successfully: http://127.0.0.1/api/v1/health is OK!"
else
  error "Health check failed on http://127.0.0.1/api/v1/health!"
  exit 1
fi

# 7. Prune dangling Docker images to preserve disk space
log "Cleaning up old dangling images..."
docker image prune -f

log "✅ Deployment completed successfully!"
docker compose ps
