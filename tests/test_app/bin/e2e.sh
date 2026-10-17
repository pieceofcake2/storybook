#!/usr/bin/env bash
# End-to-end tests with the test application (php -S):
#
# 1. Runs all the stories (and their play functions) with @storybook/addon-vitest, which proxies
#    the render requests to the application (as storybook dev does)
# 2. Builds Storybook into webroot/storybook/ and checks that all the stories render from the
#    static build, served on the same origin as the application (as when deployed)

set -o errexit
set -o pipefail
set -o nounset

APP_DIR="$(cd "$(dirname "${0}")/.." && pwd)"
PORT="${PORT:-8765}"
PHP="${PHP:-php}"

cd "${APP_DIR}"

"${PHP}" -S "127.0.0.1:${PORT}" -t webroot webroot/index.php 2> >(grep -v -E "(Accepted|Closing)$" 1>&2) &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
    if curl --silent --output /dev/null "http://127.0.0.1:${PORT}/"; then
        break
    fi
    sleep 0.2
done

npm run test-storybook
npm run build-storybook -- --quiet
npm run test-static
