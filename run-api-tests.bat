@echo off
REM PayTask Worker API - Newman Test Runner (Windows)
REM This script runs automated API tests using newman (Postman CLI)

echo ========================================
echo PayTask Worker API - Automated Testing
echo ========================================

REM Check if newman is installed
where newman >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Newman is not installed
    echo Installing newman...
    call npm install -g newman
)

REM Check if server is running
echo.
echo Checking if server is running...
curl -s http://localhost:3000/health >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Server is not running
    echo Please start the server first: npm run dev
    exit /b 1
) else (
    echo Server is running
)

REM Run tests
echo.
echo Running API tests...
echo.

newman run PayTask-Worker-API.postman_collection.json ^
    -e PayTask-Development.postman_environment.json ^
    --reporters cli,html ^
    --reporter-html-export newman-report.html ^
    --color on ^
    --delay-request 500 ^
    --timeout-request 10000

if %errorlevel% equ 0 (
    echo.
    echo All tests passed!
    echo HTML Report: newman-report.html
) else (
    echo.
    echo Some tests failed
    echo Check newman-report.html for details
    exit /b 1
)
