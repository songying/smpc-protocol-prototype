#!/bin/bash

# Health check script for MP-SPDZ node
# This script verifies the node is healthy and ready to accept computations

set -e

# Configuration
NODE_PORT=${NODE_PORT:-9999}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-5}
MAX_RETRIES=${MAX_RETRIES:-3}

# Health check function
check_health() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Health check attempt $attempt/$MAX_RETRIES..."
        
        # Check if the HTTP server is responding
        if curl -f -s -m $HEALTH_TIMEOUT "http://localhost:$NODE_PORT/health" > /dev/null 2>&1; then
            echo "✓ HTTP server is healthy"
            
            # Check if MP-SPDZ binaries exist
            if [ -f "/opt/mp-spdz/shamir-party.x" ] && [ -f "/opt/mp-spdz/replicated-ring-party.x" ]; then
                echo "✓ MP-SPDZ binaries are available"
                
                # Check if required directories are writable
                if [ -w "/app/data" ] && [ -w "/app/logs" ]; then
                    echo "✓ Required directories are writable"
                    
                    # Check memory usage (fail if > 90%)
                    local memory_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
                    if (( $(echo "$memory_usage < 90" | bc -l) )); then
                        echo "✓ Memory usage is acceptable ($memory_usage%)"
                        
                        # Check disk space (fail if < 100MB free)
                        local disk_free=$(df /app | tail -1 | awk '{print $4}')
                        if [ $disk_free -gt 100000 ]; then  # 100MB in KB
                            echo "✓ Sufficient disk space available"
                            
                            # Final API health check
                            local response=$(curl -s -m $HEALTH_TIMEOUT "http://localhost:$NODE_PORT/status" | jq -r '.status' 2>/dev/null || echo "unknown")
                            
                            if [ "$response" = "ready" ] || [ "$response" = "computing" ]; then
                                echo "✓ Node status: $response"
                                echo "Health check PASSED"
                                exit 0
                            else
                                echo "✗ Node status is not ready: $response"
                            fi
                        else
                            echo "✗ Insufficient disk space: ${disk_free}KB available"
                        fi
                    else
                        echo "✗ Memory usage too high: $memory_usage%"
                    fi
                else
                    echo "✗ Required directories are not writable"
                fi
            else
                echo "✗ MP-SPDZ binaries not found"
            fi
        else
            echo "✗ HTTP server not responding"
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "Retrying in 2 seconds..."
            sleep 2
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo "Health check FAILED after $MAX_RETRIES attempts"
    exit 1
}

# Install jq if not available (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo "Installing jq for JSON parsing..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y jq
    elif command -v apk &> /dev/null; then
        apk add --no-cache jq
    fi
fi

# Install bc if not available (for floating point arithmetic)
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y bc
    elif command -v apk &> /dev/null; then
        apk add --no-cache bc
    fi
fi

# Run health check
check_health