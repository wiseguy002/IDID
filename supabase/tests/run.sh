#!/usr/bin/env bash
# Runs the schema + RLS tests against a throwaway local Postgres 16 cluster.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
TMP="$(mktemp -d)"
# initdb refuses to run as root; use the postgres OS user when we are root.
RUN=""
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown postgres "$TMP"; chmod 755 "$TMP"; fi
trap '$RUN "$BIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
$RUN "$BIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
$RUN "$BIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
P="psql -h $TMP -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A"
$P -f "$HERE/auth_stub.sql"
for f in "$HERE"/../migrations/*.sql; do $P -f "$f"; done
$P -f "$HERE/rls_test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
