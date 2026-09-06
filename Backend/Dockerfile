FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

# Single container running both the API and its own Postgres server, since
# this service is deployed without a separate managed database. Postgres
# only listens on localhost — nothing outside the container talks to it.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tini su-exec postgresql16

ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

COPY --from=build /out/api /usr/local/bin/api
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Mount a Railway Volume at $PGDATA so the database survives redeploys —
# without one, every deploy starts from an empty database.
VOLUME ["/var/lib/postgresql/data"]

EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
