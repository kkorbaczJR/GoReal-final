#!/usr/bin/env bash
# Runs the notification scenario tests with plain Node (22+), no test framework needed.
# The planner is pure TypeScript, so we copy it to a temp dir, add ".ts" to the relative imports
# (Node's type stripping wants them) and run node:test on it.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/lib/notifications"
cp "$root"/lib/{date,rules,shop}.ts "$tmp/lib/"
cp "$root"/lib/notifications/{types,copy,planner}.ts "$tmp/lib/notifications/"
sed -i -E 's#(from "\.{1,2}/[A-Za-z/]+)"#\1.ts"#' "$tmp"/lib/*.ts "$tmp"/lib/notifications/*.ts
cp "$here/planner.test.ts" "$tmp/"
echo '{"type":"module"}' > "$tmp/package.json"

cd "$tmp"
node --experimental-strip-types --disable-warning=ExperimentalWarning --test planner.test.ts
