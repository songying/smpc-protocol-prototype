#!/bin/bash

# Health Check Script for SMPC Coordinator Service
set -e

# Check if the coordinator service is responding
curl -f http://localhost:8080/health || exit 1