#!/usr/bin/env bash
# Create the two local databases. Production lives only on DigitalOcean.
set -euo pipefail
for db in lockwords_dev lockwords_test; do
  if psql -lqt | cut -d'|' -f1 | grep -qw "$db"; then echo "$db exists"; else createdb "$db" && echo "$db created"; fi
done
