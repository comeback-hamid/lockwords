#!/bin/sh
# Managed Postgres signs its TLS certificate with DigitalOcean's own CA.
# App Platform gives us that CA as text (DATABASE_CA_CERT). Node needs it as a file.
# Usage: with-db-ca.sh <command...>
set -eu
if [ -n "${DATABASE_CA_CERT:-}" ]; then
  printf '%s\n' "$DATABASE_CA_CERT" > /tmp/db-ca.crt
  export NODE_EXTRA_CA_CERTS=/tmp/db-ca.crt
fi
exec "$@"
