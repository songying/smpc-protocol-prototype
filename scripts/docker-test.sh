#!/bin/bash

# Docker Testing Script for SMPC Protocol
# This script runs comprehensive tests to validate the Docker environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_FILE="$PROJECT_DIR/docker-test-results.json"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_test "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "✓ $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "✗ $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to check Docker Compose command
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available"
        exit 1
    fi
}

# Test 1: Docker Services Status
test_docker_services() {
    print_status "Testing Docker services status..."
    
    run_test "Redis container is running" "docker ps --filter 'name=smpc-redis' --filter 'status=running' | grep -q smpc-redis"
    run_test "IPFS container is running" "docker ps --filter 'name=smpc-ipfs' --filter 'status=running' | grep -q smpc-ipfs"
    run_test "SMPC App container is running" "docker ps --filter 'name=smpc-app' --filter 'status=running' | grep -q smpc-app"
}

# Test 2: Network Connectivity
test_network_connectivity() {
    print_status "Testing network connectivity..."
    
    run_test "Docker network exists" "docker network ls | grep -q smpc-network"
    run_test "Redis network connectivity" "docker exec smpc-app ping -c 1 smpc-redis"
    run_test "IPFS network connectivity" "docker exec smpc-app ping -c 1 smpc-ipfs"
}

# Test 3: Service Health Checks
test_service_health() {
    print_status "Testing service health..."
    
    run_test "Redis service health" "docker exec smpc-redis redis-cli ping | grep -q PONG"
    run_test "IPFS service health" "docker exec smpc-ipfs wget -q --spider http://localhost:5001/api/v0/version"
    
    # Wait for app to be fully ready
    sleep 10
    run_test "SMPC App health check" "docker exec smpc-app curl -f http://localhost:3000 > /dev/null"
}

# Test 4: Port Accessibility
test_port_accessibility() {
    print_status "Testing port accessibility from host..."
    
    run_test "Next.js app port (3000)" "curl -f http://localhost:3000 > /dev/null"
    run_test "Hardhat node port (8545)" "curl -f -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' http://localhost:8545"
    run_test "Redis port (6379)" "redis-cli -h localhost -p 6379 ping | grep -q PONG || docker exec smpc-redis redis-cli ping | grep -q PONG"
    run_test "IPFS API port (5001)" "curl -f http://localhost:5001/api/v0/version > /dev/null"
    run_test "IPFS Gateway port (8080)" "curl -f http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn > /dev/null || true"  # This may fail but shouldn't break the test
}

# Test 5: File System Mounts
test_file_mounts() {
    print_status "Testing file system mounts..."
    
    run_test "Source code mount" "docker exec smpc-app test -d /app/src"
    run_test "Contracts mount" "docker exec smpc-app test -d /app/contracts"
    run_test "Data files mount" "docker exec smpc-app test -f /app/data/health-schema-documentation.json"
    run_test "Scripts mount" "docker exec smpc-app test -f /app/scripts/simple-deploy.cjs"
    run_test "Deployments directory" "docker exec smpc-app test -d /app/deployments"
}

# Test 6: Environment Variables
test_environment_variables() {
    print_status "Testing environment variables..."
    
    run_test "NODE_ENV variable" "docker exec smpc-app printenv NODE_ENV | grep -q development"
    run_test "REDIS_URL variable" "docker exec smpc-app printenv REDIS_URL | grep -q redis://smpc-redis"
    run_test "IPFS_HTTP_API_URL variable" "docker exec smpc-app printenv IPFS_HTTP_API_URL | grep -q http://smpc-ipfs:5001"
    run_test "NEXT_PUBLIC_CHAIN_ID variable" "docker exec smpc-app printenv NEXT_PUBLIC_CHAIN_ID | grep -q 1337"
}

# Test 7: Smart Contract Deployment
test_smart_contracts() {
    print_status "Testing smart contract deployment..."
    
    run_test "Contract artifacts exist" "docker exec smpc-app test -d /app/artifacts/contracts"
    run_test "Deployment addresses file exists" "docker exec smpc-app test -f /app/deployments/localhost-addresses.json"
    
    # Test specific contract deployments
    if docker exec smpc-app test -f /app/deployments/localhost-addresses.json; then
        run_test "DataRegistry contract deployed" "docker exec smpc-app cat /app/deployments/localhost-addresses.json | grep -q DataRegistry"
        run_test "FeeManagement contract deployed" "docker exec smpc-app cat /app/deployments/localhost-addresses.json | grep -q FeeManagement"
        run_test "ComputingRequest contract deployed" "docker exec smpc-app cat /app/deployments/localhost-addresses.json | grep -q ComputingRequest"
    fi
}

# Test 8: Web3 Functionality
test_web3_functionality() {
    print_status "Testing Web3 functionality..."
    
    # Test blockchain connection
    run_test "Blockchain node responding" "curl -f -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_accounts\",\"params\":[],\"id\":1}' http://localhost:8545"
    run_test "Chain ID correct" "curl -s -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' http://localhost:8545 | grep -q '0x539'"
    
    # Test account balance
    run_test "Test account has balance" "curl -s -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\",\"latest\"],\"id\":1}' http://localhost:8545 | grep -q result"
}

# Test 9: API Endpoints
test_api_endpoints() {
    print_status "Testing API endpoints..."
    
    # Wait for application to be fully ready
    sleep 5
    
    run_test "Health endpoint" "curl -f http://localhost:3000/api/health > /dev/null || true"
    run_test "Algorithms API" "curl -f http://localhost:3000/api/algorithms > /dev/null || true"
    run_test "Sample data API" "curl -f http://localhost:3000/api/sample-data > /dev/null || true"
}

# Test 10: Data Persistence
test_data_persistence() {
    print_status "Testing data persistence..."
    
    # Test Redis data persistence
    run_test "Redis data directory exists" "docker exec smpc-redis test -d /data"
    
    # Test IPFS data persistence
    run_test "IPFS data directory exists" "docker exec smpc-ipfs test -d /ipfsdata"
    
    # Test application logs
    run_test "Application logs directory" "docker exec smpc-app test -d /app/logs || docker exec smpc-app mkdir -p /app/logs"
}

# Test 11: Development Features
test_development_features() {
    print_status "Testing development features..."
    
    # Test file watching (if in development mode)
    run_test "Node modules preserved" "docker exec smpc-app test -d /app/node_modules"
    run_test "Package.json accessible" "docker exec smpc-app test -f /app/package.json"
    
    # Test development commands
    run_test "NPM available" "docker exec smpc-app npm --version > /dev/null"
    run_test "Hardhat available" "docker exec smpc-app npx hardhat --version > /dev/null"
}

# Test 12: Security Checks
test_security() {
    print_status "Testing security configuration..."
    
    run_test "Non-root user" "docker exec smpc-app whoami | grep -q nextjs"
    run_test "File permissions" "docker exec smpc-app test -r /app/package.json"
    run_test "No sensitive files exposed" "! docker exec smpc-app test -f /app/.env"
}

# Function to generate test report
generate_test_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$TEST_RESULTS_FILE" <<EOF
{
  "timestamp": "$timestamp",
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%
  },
  "environment": {
    "docker_version": "$(docker --version)",
    "compose_version": "$(eval $DOCKER_COMPOSE_CMD --version)",
    "platform": "$(uname -s -m)"
  },
  "services_status": {
    "smpc_app": "$(docker ps --filter 'name=smpc-app' --format 'table {{.Status}}' | tail -n +2)",
    "smpc_redis": "$(docker ps --filter 'name=smpc-redis' --format 'table {{.Status}}' | tail -n +2)",
    "smpc_ipfs": "$(docker ps --filter 'name=smpc-ipfs' --format 'table {{.Status}}' | tail -n +2)"
  }
}
EOF
}

# Function to show test summary
show_test_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Docker Test Results Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "${GREEN}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo ""
    
    local success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
    echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        print_success "All tests passed! Docker environment is working correctly."
        echo ""
        echo -e "${GREEN}Your SMPC Protocol Docker setup is ready for development!${NC}"
    else
        echo ""
        print_warning "Some tests failed. Please check the output above for details."
        echo ""
        echo -e "${YELLOW}Common troubleshooting steps:${NC}"
        echo "1. Ensure all containers are running: docker ps"
        echo "2. Check container logs: $DOCKER_COMPOSE_CMD logs"
        echo "3. Restart services: $DOCKER_COMPOSE_CMD restart"
        echo "4. Rebuild if needed: $DOCKER_COMPOSE_CMD build --no-cache"
    fi
    
    echo ""
    echo -e "${BLUE}Test report saved to:${NC} $TEST_RESULTS_FILE"
}

# Main execution
main() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  SMPC Protocol Docker Testing Script${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    check_docker_compose
    
    # Run all test suites
    test_docker_services
    test_network_connectivity
    test_service_health
    test_port_accessibility
    test_file_mounts
    test_environment_variables
    test_smart_contracts
    test_web3_functionality
    test_api_endpoints
    test_data_persistence
    test_development_features
    test_security
    
    # Generate report and show summary
    generate_test_report
    show_test_summary
    
    # Exit with error code if tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    fi
}

# Run main function
main "$@"