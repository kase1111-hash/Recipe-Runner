@echo off
echo ======================================
echo    Recipe Runner - Development Server
echo ======================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start the development server
echo Starting development server...
echo.
echo The app will open at http://localhost:5173
echo Press Ctrl+C to stop the server
echo.
call npm run dev
