#!/bin/bash
# PayTask Worker API - Newman Test Runner
# This script runs automated API tests using newman (Postman CLI)

echo "🚀 PayTask Worker API - Automated Testing"
echo "=========================================="

# Check if newman is installed
if ! command -v newman &> /dev/null
then
    echo "❌ Newman is not installed"
    echo "📦 Installing newman..."
    npm install -g newman
fi

# Check if server is running
echo ""
echo "🔍 Checking if server is running..."
SERVER_URL="http://localhost:3000/health"
if curl -s "$SERVER_URL" > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running"
    echo "🚀 Please start the server first: npm run dev"
    exit 1
fi

# Run tests
echo ""
echo "🧪 Running API tests..."
echo ""

newman run PayTask-Worker-API.postman_collection.json \
    -e PayTask-Development.postman_environment.json \
    --reporters cli,html \
    --reporter-html-export newman-report.html \
    --color on \
    --delay-request 500 \
    --timeout-request 10000

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo "📊 HTML Report: newman-report.html"
else
    echo ""
    echo "❌ Some tests failed"
    echo "📊 Check newman-report.html for details"
    exit 1
fi
