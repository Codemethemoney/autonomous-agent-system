#!/bin/bash

# Test API endpoints
echo "Testing API endpoints..."

# Test database connection
curl -X GET "http://localhost:3000/api/health" \
    -H "Content-Type: application/json"

# Test authentication
curl -X POST "http://localhost:3000/api/auth" \
    -H "Content-Type: application/json" \
    -d '{"test": true}'

