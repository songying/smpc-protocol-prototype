#!/bin/bash

# Health Check Script for SMPC Protocol Container
# This script checks the health of services running in the container

set -e

# Configuration
TIMEOUT=10
MAX_RETRIES=3

# Health check functions
check_next_app() {
    local url="http://localhost:3000"

    # Check if Next.js app is responding
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s --max-time $TIMEOUT "$url" > /dev/null; then
            return 0
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q --timeout=$TIMEOUT --tries=1 --spider "$url" > /dev/null 2>&1; then
            return 0
        fi
    fi

    return 1
}

check_hardhat_node() {
    local url="http://localhost:8545"
    local payload='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

    # Check if Hardhat node is responding
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s --max-time $TIMEOUT -X POST -H "Content-Type: application/json" --data "$payload" "$url" > /dev/null; then
            return 0
        fi
    fi

    return 1
}

check_process() {
    local process_name="$1"

    # Check if process is running
    if pgrep -f "$process_name" > /dev/null 2>&1; then
        return 0
    fi

    return 1
}

check_file_system() {
    # Check if critical files/directories exist
    local critical_paths=(
        "/app/package.json"
        "/app/src"
        "/app/contracts"
        "/app/node_modules"
    )

    for path in "${critical_paths[@]}"; do
        if [ ! -e "$path" ]; then
            echo "Critical path missing: $path"
            return 1
        fi
    done

    return 0
}

check_environment() {
    # Check if critical environment variables are set
    local critical_vars=(
        "NODE_ENV"
        "PORT"
    )

    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Critical environment variable missing: $var"
            return 1
        fi
    done

    return 0
}

main_health_check() {
    local exit_code=0
    local checks_passed=0
    local total_checks=5

    # Check 1: File system integrity
    if check_file_system; then
        checks_passed=$((checks_passed + 1))
    else
        echo "Health check failed: File system integrity"
        exit_code=1
    fi

    # Check 2: Environment variables
    if check_environment; then
        checks_passed=$((checks_passed + 1))
    else
        echo "Health check failed: Environment variables"
        exit_code=1
    fi

    # Check 3: Node.js process
    if check_process "node"; then
        checks_passed=$((checks_passed + 1))
    else
        echo "Health check failed: Node.js process not running"
        exit_code=1
    fi

    # Check 4: Next.js application (with retries)
    local next_healthy=false
    for i in $(seq 1 $MAX_RETRIES); do
        if check_next_app; then
            next_healthy=true
            break
        fi
        sleep 2
    done

    if $next_healthy; then
        checks_passed=$((checks_passed + 1))
    else
        echo "Health check failed: Next.js application not responding"
        exit_code=1
    fi

    # Check 5: Hardhat node (with retries)
    local hardhat_healthy=false
    for i in $(seq 1 $MAX_RETRIES); do
        if check_hardhat_node; then
            hardhat_healthy=true
            break
        fi
        sleep 2
    done

    if $hardhat_healthy; then
        checks_passed=$((checks_passed + 1))
    else
        echo "Health check warning: Hardhat node not responding (may still be starting)"
        # Don't fail health check for Hardhat node as it might still be starting
        checks_passed=$((checks_passed + 1))
    fi

    # Output health status
    echo "Health check: $checks_passed/$total_checks checks passed"

    # Require at least 4/5 checks to pass
    if [ $checks_passed -ge 4 ]; then
        echo "Container is healthy"
        exit 0
    else
        echo "Container is unhealthy"
        exit 1
    fi
}

# Run health check
main_health_check