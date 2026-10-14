# Local dev orchestration for taela-ai (Postgres + Backend + Frontend).
# Run `make` or `make help` for the list of targets.
#
# Override any of these on the command line if your setup differs, e.g.
#   make dev-up PG_PORT=5433 BACKEND_PORT=8081
PG_CONTAINER      ?= taela-ai-pg
PG_IMAGE          ?= postgres:16-alpine
PG_PORT           ?= 5432
PG_DB             ?= taela_ai
PG_USER           ?= postgres
PG_PASSWORD       ?= postgres

BACKEND_CONTAINER ?= taela-ai-backend
BACKEND_IMAGE     ?= taela-ai-backend:dev
BACKEND_PORT      ?= 8080
FRONTEND_PORT     ?= 3000

DOCKER_NETWORK    ?= taela-ai-net

DEV_DIR       := .dev
FRONTEND_LOG  := $(DEV_DIR)/frontend.log

.PHONY: help dev-up dev-down dev-restart dev-status dev-logs \
        env net-up pg-up pg-down pg-logs pg-reset \
        backend-image backend-up backend-down backend-restart backend-logs \
        install backend frontend

help:
	@echo "taela-ai — local dev"
	@echo ""
	@echo "  make dev-up       Start Postgres + Backend (both in Docker) and Frontend together in the background"
	@echo "  make dev-down     Stop Backend and Frontend (Postgres keeps running)"
	@echo "  make dev-restart  dev-down then dev-up"
	@echo "  make dev-status   Show what's currently running"
	@echo "  make dev-logs     Tail backend + frontend logs (Ctrl+C to stop watching, services keep running)"
	@echo ""
	@echo "  make pg-up        Start/create the local Postgres container only"
	@echo "  make pg-down      Stop the Postgres container (data is preserved)"
	@echo "  make pg-reset     Remove the Postgres container entirely (DESTROYS local data)"
	@echo ""
	@echo "  make backend-up   Build + start the backend container only (talks to pg over Docker)"
	@echo "  make backend-down Stop and remove the backend container"
	@echo "  make backend-logs Tail the backend container's logs"
	@echo ""
	@echo "  make backend      Run the backend on the host (not Docker) in the foreground, for local debugging"
	@echo "  make frontend     Run the frontend in the foreground (current terminal)"
	@echo "  make env          Create Backend/.env and Frontend/.env.local from their .example files if missing"
	@echo "  make install      Install Frontend npm dependencies if missing"

# --- env files ---------------------------------------------------------

env: Backend/.env Frontend/.env.local

Backend/.env:
	cp Backend/.env.example Backend/.env
	@echo "Created Backend/.env from .env.example — edit it if you need different values."

Frontend/.env.local:
	cp Frontend/.env.local.example Frontend/.env.local
	@echo "Created Frontend/.env.local from .env.local.example."

# --- Docker network ------------------------------------------------------
# Shared bridge network so the backend container can reach Postgres by
# container name instead of via the host's localhost (which isn't reachable
# from inside another container on macOS/Windows Docker Desktop).

net-up:
	@if ! docker info >/dev/null 2>&1; then \
		echo "Docker daemon isn't reachable — start/open Docker Desktop (or your Docker VM) and try again."; \
		exit 1; \
	fi
	@docker network inspect $(DOCKER_NETWORK) >/dev/null 2>&1 || docker network create $(DOCKER_NETWORK) >/dev/null

# --- Postgres -----------------------------------------------------------

pg-up: net-up
	@if [ -n "$$(docker ps -q -f name=^/$(PG_CONTAINER)$$)" ]; then \
		echo "Postgres ($(PG_CONTAINER)) already running."; \
	elif [ -n "$$(docker ps -aq -f name=^/$(PG_CONTAINER)$$)" ]; then \
		echo "Starting existing Postgres container $(PG_CONTAINER)..."; \
		docker start $(PG_CONTAINER) >/dev/null; \
	else \
		echo "Creating Postgres container $(PG_CONTAINER) on port $(PG_PORT)..."; \
		docker run -d --name $(PG_CONTAINER) \
			--network $(DOCKER_NETWORK) \
			-e POSTGRES_PASSWORD=$(PG_PASSWORD) \
			-e POSTGRES_DB=$(PG_DB) \
			-p $(PG_PORT):5432 \
			$(PG_IMAGE) >/dev/null; \
	fi
	@docker network connect $(DOCKER_NETWORK) $(PG_CONTAINER) >/dev/null 2>&1 || true

pg-down:
	@if docker stop $(PG_CONTAINER) >/dev/null 2>&1; then \
		echo "Stopped $(PG_CONTAINER)."; \
	else \
		echo "$(PG_CONTAINER) is not running."; \
	fi

pg-logs:
	docker logs -f $(PG_CONTAINER)

# DESTROYS local data — the container (and its volume) is removed, not just stopped.
pg-reset:
	@docker rm -f $(PG_CONTAINER) >/dev/null 2>&1 || true
	@echo "Removed $(PG_CONTAINER). Run 'make pg-up' to recreate it (fresh/empty)."

# --- Backend (Docker) ----------------------------------------------------
# Builds the backend with the same Dockerfile used for deploys, stopping at
# the "build" stage (skips the Postgres-bundling final stage, which is
# Railway-specific) and runs the resulting binary against the pg-up
# container over $(DOCKER_NETWORK).

backend-image: net-up
	@echo "Building backend image ($(BACKEND_IMAGE))..."
	@docker build --target build -t $(BACKEND_IMAGE) Backend

backend-up: env net-up backend-image
	@if [ -n "$$(docker ps -q -f name=^/$(BACKEND_CONTAINER)$$)" ]; then \
		echo "Backend ($(BACKEND_CONTAINER)) already running."; \
	else \
		docker rm -f $(BACKEND_CONTAINER) >/dev/null 2>&1 || true; \
		echo "Starting backend container $(BACKEND_CONTAINER) on :$(BACKEND_PORT)..."; \
		docker run -d --name $(BACKEND_CONTAINER) \
			--network $(DOCKER_NETWORK) \
			-p $(BACKEND_PORT):8080 \
			--env-file Backend/.env \
			-e PORT=8080 \
			-e DATABASE_URL="postgres://$(PG_USER):$(PG_PASSWORD)@$(PG_CONTAINER):5432/$(PG_DB)?sslmode=disable" \
			$(BACKEND_IMAGE) /out/api >/dev/null; \
	fi

backend-down:
	@if docker stop $(BACKEND_CONTAINER) >/dev/null 2>&1; then \
		docker rm $(BACKEND_CONTAINER) >/dev/null 2>&1; \
		echo "Stopped backend ($(BACKEND_CONTAINER))."; \
	else \
		echo "$(BACKEND_CONTAINER) is not running."; \
	fi

backend-restart: backend-down backend-up

backend-logs:
	docker logs -f $(BACKEND_CONTAINER)

# --- Frontend deps -------------------------------------------------------

install:
	@if [ -d Frontend/node_modules ]; then \
		echo "Frontend deps already installed."; \
	else \
		cd Frontend && npm install; \
	fi

# --- Run in the foreground (one terminal tab each) -----------------------

backend: env
	cd Backend && go run ./cmd/api

frontend: env install
	cd Frontend && npm run dev

# --- Run everything together in the background ---------------------------

$(DEV_DIR):
	@mkdir -p $(DEV_DIR)

dev-up: env pg-up backend-up install $(DEV_DIR)
	@if lsof -ti :$(FRONTEND_PORT) >/dev/null 2>&1; then \
		echo "Frontend already running on :$(FRONTEND_PORT)."; \
	else \
		echo "Starting frontend (log: $(FRONTEND_LOG))..."; \
		(cd Frontend && nohup npm run dev > ../$(FRONTEND_LOG) 2>&1 &); \
	fi
	@sleep 2
	@echo ""
	@echo "taela-ai is starting up:"
	@echo "  Backend:   http://localhost:$(BACKEND_PORT)/healthz (docker: $(BACKEND_CONTAINER))"
	@echo "  Frontend:  http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@echo "  make dev-status   check what's up"
	@echo "  make dev-logs     tail logs"
	@echo "  make dev-down     stop backend + frontend"

dev-down: backend-down
	@pids="$$(lsof -ti :$(FRONTEND_PORT) 2>/dev/null)"; \
	if [ -n "$$pids" ]; then kill $$pids 2>/dev/null; echo "Stopped frontend (:$(FRONTEND_PORT))."; else echo "Frontend not running."; fi
	@echo "(Postgres left running — 'make pg-down' to stop it too.)"

dev-restart: dev-down dev-up

dev-status:
	@echo "Postgres:"
	@docker ps --filter name=^/$(PG_CONTAINER)$$ --format '  {{.Names}}: {{.Status}}' 2>/dev/null | grep . || echo "  not running"
	@echo "Backend (:$(BACKEND_PORT)):"
	@docker ps --filter name=^/$(BACKEND_CONTAINER)$$ --format '  {{.Names}}: {{.Status}}' 2>/dev/null | grep . || echo "  not running"
	@echo "Frontend (:$(FRONTEND_PORT)):"
	@lsof -ti :$(FRONTEND_PORT) >/dev/null 2>&1 && echo "  running" || echo "  not running"

dev-logs:
	@touch $(FRONTEND_LOG)
	@echo "Tailing backend (docker logs) + frontend logs — Ctrl+C to stop watching, services keep running."
	@trap 'kill $$(jobs -p) 2>/dev/null' EXIT; \
	docker logs -f $(BACKEND_CONTAINER) 2>&1 | sed -u 's/^/[backend] /' & \
	tail -n 40 -f $(FRONTEND_LOG) | sed -u 's/^/[frontend] /' & \
	wait
