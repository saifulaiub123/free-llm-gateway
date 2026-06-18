# Docker Commands — Free LLM Gateway

Handy commands for building, running, and operating the gateway in Docker.
The gateway is a **single image**: the NestJS server serves the API **and** the built SvelteKit SPA.

> Prerequisite: Docker Desktop (or a Docker engine) running. From the repo root unless noted.

## 1. First-time setup

```bash
# Create your env file and fill in the required secrets.
cp .env.example .env

# Generate an ENCRYPTION_KEY (32-byte hex) and JWT secrets:
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
```

## 2. Docker Compose (recommended)

```bash
# Build and start the gateway (SQLite, zero-config). Reads .env automatically.
docker compose up --build

# Start in the background.
docker compose up --build -d

# With PostgreSQL instead of SQLite (set DB_DRIVER=postgres + DB_URL in .env first).
docker compose --profile postgres up --build -d

# Tail logs.
docker compose logs -f gateway

# Stop (keep volumes / data).
docker compose down

# Stop AND delete volumes (wipes the SQLite DB + Postgres data).
docker compose down -v

# Validate the compose file without starting anything.
docker compose config --quiet
```

App: <http://localhost:5001> — dashboard at `/`, API at `/api/v1`, docs at `/api/docs` and `/v1/docs`.

## 3. Plain Docker (without Compose)

```bash
# Build the image.
docker build -f docker/Dockerfile -t free-llm-gateway:latest .

# Run it (pass env via --env-file).
docker run -d --name gateway -p 5001:5001 --env-file .env \
  -v gateway-data:/app/apps/server/data \
  free-llm-gateway:latest

# Logs / shell / stop.
docker logs -f gateway
docker exec -it gateway sh
docker rm -f gateway
```

## 4. Quick health check

```bash
curl http://localhost:5001/api/v1/health      # -> {"data":{"status":"ok"}}
curl -I http://localhost:5001/                 # -> 200 (SPA)
```

## 5. Database migrations (run later phases add schema)

```bash
# Inside a running container:
docker compose exec gateway pnpm db:migrate

# Or one-off:
docker compose run --rm gateway pnpm db:migrate
```

## 6. Cleanup

```bash
docker rm -f gateway flg-test 2>/dev/null     # remove containers
docker image rm free-llm-gateway:latest       # remove the image
docker volume rm gateway-data postgres-data   # remove persisted data (DESTRUCTIVE)
docker system prune -f                         # reclaim dangling build cache
```
