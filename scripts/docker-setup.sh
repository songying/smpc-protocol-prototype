#!/bin/bash

# Docker Setup Script for SMPC Protocol
# This script sets up and initializes the Docker environment

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
ENV_FILE="$PROJECT_DIR/.env.docker"

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

# Function to check if Docker is running
check_docker() {
    print_status "Checking Docker availability..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "Docker is available and running"
}

# Function to check Docker Compose
check_docker_compose() {
    print_status "Checking Docker Compose availability..."
    
    if ! command -v docker-compose &> /dev/null; then
        if ! docker compose version &> /dev/null; then
            print_error "Docker Compose is not available"
            exit 1
        fi
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    print_success "Docker Compose is available: $DOCKER_COMPOSE_CMD"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    cd "$PROJECT_DIR"
    
    # Create directories if they don't exist
    mkdir -p logs
    mkdir -p deployments
    mkdir -p uploads
    mkdir -p monitoring
    
    print_success "Directories created"
}

# Function to copy environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Export environment variables for docker-compose
    set -a  # Automatically export all variables
    source "$ENV_FILE"
    set +a  # Stop automatically exporting
    
    print_success "Environment configuration loaded"
}

# Function to pull required Docker images
pull_images() {
    print_status "Pulling required Docker images..."
    
    cd "$PROJECT_DIR"
    
    # Pull images specified in docker-compose
    $DOCKER_COMPOSE_CMD pull smpc-redis smpc-ipfs
    
    print_success "Docker images pulled"
}

# Function to build application image
build_application() {
    print_status "Building SMPC application image..."
    
    cd "$PROJECT_DIR"
    
    # Build the application image
    $DOCKER_COMPOSE_CMD build smpc-app
    
    print_success "SMPC application image built"
}

# Function to create Docker network
create_network() {
    print_status "Creating Docker network..."
    
    # Check if network already exists
    if docker network ls | grep -q smpc-network; then
        print_warning "Network smpc-network already exists"
    else
        docker network create smpc-network --driver bridge --subnet=172.20.0.0/16
        print_success "Docker network created: smpc-network"
    fi
}

# Function to initialize services
initialize_services() {
    print_status "Initializing services..."
    
    cd "$PROJECT_DIR"
    
    # Start Redis and IPFS first
    print_status "Starting Redis and IPFS services..."
    $DOCKER_COMPOSE_CMD up -d smpc-redis smpc-ipfs
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are healthy
    if ! docker exec smpc-redis redis-cli ping > /dev/null 2>&1; then
        print_error "Redis service is not responding"
        return 1
    fi
    print_success "Redis service is ready"
    
    # Check IPFS
    if ! docker exec smpc-ipfs wget -q --spider http://localhost:5001/api/v0/version; then
        print_error "IPFS service is not responding"
        return 1
    fi
    print_success "IPFS service is ready"
    
    print_success "Services initialized successfully"
}

# Function to setup smart contracts
setup_contracts() {
    print_status "Setting up smart contracts..."
    
    cd "$PROJECT_DIR"
    
    # Start the main application
    print_status "Starting SMPC application..."
    $DOCKER_COMPOSE_CMD up -d smpc-app
    
    # Wait for the application to start
    print_status "Waiting for application to start..."
    sleep 60
    
    # Check if contracts are deployed
    if docker exec smpc-app test -f /app/deployments/localhost-addresses.json; then
        print_success "Smart contracts are already deployed"
    else
        print_status "Deploying smart contracts..."
        if docker exec smpc-app node scripts/simple-deploy.cjs; then
            print_success "Smart contracts deployed successfully"
        else
            print_error "Failed to deploy smart contracts"
            return 1
        fi
    fi
}

# Function to verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Check if all services are running
    local services=("smpc-app" "smpc-redis" "smpc-ipfs")
    
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            return 1
        fi
    done
    
    # Check if application is responding
    print_status "Checking application health..."
    sleep 10
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Application is responding on http://localhost:3000"
    else
        print_warning "Application may still be starting up"
    fi
    
    # Check blockchain node
    if curl -f -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
        print_success "Blockchain node is responding on http://localhost:8545"
    else
        print_warning "Blockchain node may still be starting up"
    fi
}

# Function to show status
show_status() {
    print_status "SMPC Protocol Docker Setup Complete!"
    echo ""
    echo -e "${GREEN}Services:${NC}"
    echo "  • Next.js Application: http://localhost:3000"
    echo "  • Hardhat Blockchain:  http://localhost:8545"
    echo "  • Redis Cache:         http://localhost:6379"
    echo "  • IPFS Gateway:        http://localhost:8080"
    echo "  • IPFS API:            http://localhost:5001"
    echo ""
    echo -e "${GREEN}Useful Commands:${NC}"
    echo "  • View logs:           $DOCKER_COMPOSE_CMD logs -f"
    echo "  • Stop services:       $DOCKER_COMPOSE_CMD down"
    echo "  • Restart:             $DOCKER_COMPOSE_CMD restart"
    echo "  • Run tests:           ./scripts/docker-test.sh"
    echo ""
    echo -e "${YELLOW}Note:${NC} If this is the first run, the application may take a few minutes to fully initialize."
}

# Main execution
main() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  SMPC Protocol Docker Setup Script${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    
    check_docker
    check_docker_compose
    create_directories
    setup_environment
    create_network
    pull_images
    build_application
    initialize_services
    setup_contracts
    verify_setup
    show_status
    
    echo ""
    print_success "Setup completed successfully!"
}

# Run main function
main "$@"