#!/bin/sh
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
POSTGRES_DB="${POSTGRES_DB:-taela_ai}"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "==> initializing Postgres data directory at $PGDATA"
  su-exec postgres initdb -D "$PGDATA" --username="$POSTGRES_USER" --auth=trust >/dev/null
fi

echo "==> starting Postgres"
su-exec postgres pg_ctl -D "$PGDATA" -w -o "-c listen_addresses=localhost -c port=5432" start

if [ ! -f "$PGDATA/.provisioned" ]; then
  echo "==> setting role password and creating database $POSTGRES_DB"
  su-exec postgres psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres \
    -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';"
  su-exec postgres psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1 \
    || su-exec postgres createdb -O "$POSTGRES_USER" "$POSTGRES_DB"
  touch "$PGDATA/.provisioned"
fi

export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"

shutdown() {
  echo "==> shutting down"
  [ -n "$API_PID" ] && kill -TERM "$API_PID" 2>/dev/null
  su-exec postgres pg_ctl -D "$PGDATA" -m fast stop
  exit 0
}
trap shutdown TERM INT

api &
API_PID=$!
wait "$API_PID"
