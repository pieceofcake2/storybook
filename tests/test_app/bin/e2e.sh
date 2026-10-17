#!/usr/bin/env bash
# End-to-end tests with the test application (php -S):
#
# 1. Runs all the stories (and their play functions) with @storybook/addon-vitest, which proxies
#    the render requests to the application (as storybook dev does)
# 2. Builds Storybook into webroot/storybook/ and checks that all the stories render from the
#    build, served on the same origin as the application in debug mode
# 3. Checks that the render endpoint is not available with debug 0
# 4. Pre-renders the stories (storybook-cakephp prerender), stops the application, and checks that
#    all the stories render from the static files, without any render request
#
# PRERENDER_BROWSER sets the browser of the pre-rendering (default: chrome, the installed Google
# Chrome; chromium for the Chromium of Playwright).

set -o errexit
set -o pipefail
set -o nounset

APP_DIR="$(cd "$(dirname "${0}")/.." && pwd)"
PORT="${PORT:-8765}"
PHP="${PHP:-php}"
PRERENDER_BROWSER="${PRERENDER_BROWSER:-chrome}"

cd "${APP_DIR}"

SERVER_PIDS=()
trap 'kill "${SERVER_PIDS[@]}" 2>/dev/null || true' EXIT

# Starts the application on a port, with APP_DEBUG
start_app() {
    if curl --silent --output /dev/null "http://127.0.0.1:${1}/"; then
        echo "Port ${1} is already in use (set PORT)" 1>&2
        exit 1
    fi
    APP_DEBUG="${2}" "${PHP}" -S "127.0.0.1:${1}" -t webroot webroot/index.php 2> >(grep -v -E "(Accepted|Closing)$" 1>&2) &
    SERVER_PIDS+=($!)
    for _ in $(seq 1 50); do
        if curl --silent --output /dev/null "http://127.0.0.1:${1}/"; then
            return
        fi
        sleep 0.2
    done
}

start_app "${PORT}" 2
APP_PID="${SERVER_PIDS[0]}"

APP_URL="http://127.0.0.1:${PORT}"
export PORT

npm run test-storybook
npm run build-storybook -- --quiet
node bin/test-static.mjs "${APP_URL}/storybook/"

echo "Checking that the render endpoint is not available with debug 0"
start_app "$((PORT + 2))" 0
status="$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST -H 'Content-Type: application/json' \
    --data '{"element":"components/button","args":{"label":"A","url":"/"}}' \
    "http://127.0.0.1:$((PORT + 2))/_storybook/render/components-button--primary")"
if [ "${status}" != "404" ]; then
    echo "The render endpoint returned ${status} with debug 0 (expected 404)" 1>&2
    exit 1
fi
echo "ok - 404 with debug 0"

npx storybook-cakephp prerender --server "${APP_URL}" --dir webroot/storybook --browser "${PRERENDER_BROWSER}"

# The pre-rendered build works without the application
kill "${APP_PID}"
wait "${APP_PID}" 2>/dev/null || true
if curl --silent --output /dev/null "http://127.0.0.1:${PORT}/"; then
    echo "The application is still running" 1>&2
    exit 1
fi
# Served as static files on another port
node bin/test-static.mjs --prerendered webroot "http://127.0.0.1:$((PORT + 1))/storybook/"
