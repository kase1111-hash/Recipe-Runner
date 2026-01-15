#!/bin/bash

echo "======================================"
echo "   Recipe Runner - Development Server"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "[1/3] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo ""
    echo -e "${RED}ERROR: Node.js is not installed.${NC}"
    echo ""
    echo "Please install Node.js:"
    echo "  - macOS: brew install node"
    echo "  - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  - Or download from https://nodejs.org/"
    echo ""
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "       Node.js ${GREEN}${NODE_VERSION}${NC} found."
echo ""

# Check if npm is available
echo "[2/3] Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo ""
    echo -e "${RED}ERROR: npm is not installed.${NC}"
    echo ""
    echo "npm usually comes with Node.js. Try reinstalling Node.js."
    echo ""
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "       npm ${GREEN}v${NPM_VERSION}${NC} found."
echo ""

# Install/update dependencies
echo "[3/3] Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "       First run - installing all dependencies..."
else
    echo "       Checking for updates..."
fi
echo ""

npm install
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}ERROR: Failed to install dependencies.${NC}"
    echo ""
    echo "Possible causes:"
    echo "  - No internet connection"
    echo "  - npm registry is unreachable"
    echo "  - Package.json has invalid dependencies"
    echo "  - Insufficient disk space"
    echo ""
    echo "Try these solutions:"
    echo "  1. Check your internet connection"
    echo "  2. Run 'npm cache clean --force' then try again"
    echo "  3. Delete node_modules folder and try again"
    echo ""
    exit 1
fi
echo ""
echo -e "       ${GREEN}Dependencies ready.${NC}"
echo ""

# Start the development server
echo "======================================"
echo "   Starting Development Server..."
echo "======================================"
echo ""
echo -e "   URL: ${GREEN}http://localhost:5173${NC}"
echo "   Press Ctrl+C to stop the server"
echo ""
echo "======================================"
echo ""

npm run dev
EXIT_CODE=$?

# Handle server exit
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "======================================"
    echo -e "   ${RED}SERVER STOPPED WITH ERROR${NC}"
    echo "======================================"
    echo ""
    echo "Error code: $EXIT_CODE"
    echo ""
    echo "Possible causes:"
    echo "  - Port 5173 is already in use"
    echo "  - Missing or corrupted dependencies"
    echo "  - Syntax error in source files"
    echo ""
    echo "Try these solutions:"
    echo "  1. Close other dev servers using port 5173"
    echo "  2. Delete node_modules and run this script again"
    echo "  3. Check the error messages above for details"
    echo ""
    exit $EXIT_CODE
fi
