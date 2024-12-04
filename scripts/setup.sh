#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting MCP setup..."

# Install dependencies
echo "Installing dependencies..."
npm install \
    @supabase/supabase-js \
    puppeteer-extra \
    puppeteer-extra-plugin-stealth \
    dotenv \
    next \
    react \
    react-dom \
    express \
    selenium-webdriver \
    axios

# Install development dependencies
npm install --save-dev \
    typescript \
    @types/node \
    @types/react \
    eslint \
    prettier

# Create necessary directories
mkdir -p scripts/automation
mkdir -p config

# Set execute permissions
chmod +x scripts/setup.js

# Run the setup script
echo "Running setup script..."
node scripts/setup.js

# Create curl test script
cat > scripts/test-endpoints.sh << 'EOF'
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

EOF

chmod +x scripts/test-endpoints.sh

echo -e "${GREEN}✅ Setup complete!${NC}"
echo "Run 'npm run dev' to start the development server"
