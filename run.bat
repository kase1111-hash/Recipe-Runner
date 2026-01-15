@echo off
setlocal enabledelayedexpansion

echo ======================================
echo    Recipe Runner - Development Server
echo ======================================
echo.

:: ============================================
:: CONFIGURATION - Edit these paths as needed
:: ============================================
:: Set your Stable Diffusion WebUI path here:
set "SDWEBUI_PATH=C:\stable-diffusion-webui"
:: Alternative common paths (uncomment the one you use):
:: set "SDWEBUI_PATH=%USERPROFILE%\stable-diffusion-webui"
:: set "SDWEBUI_PATH=D:\stable-diffusion-webui"

:: Check if Node.js is installed
echo [1/4] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart your command prompt and try again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo        Node.js %NODE_VERSION% found.
echo.

:: Check if npm is available
echo [2/4] Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm is not installed or not in PATH.
    echo.
    echo npm usually comes with Node.js. Try reinstalling Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo        npm v%NPM_VERSION% found.
echo.

:: Install/update dependencies
echo [3/4] Installing dependencies...
if not exist "node_modules" (
    echo        First run - installing all dependencies...
) else (
    echo        Checking for updates...
)
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies.
    echo.
    echo Possible causes:
    echo   - No internet connection
    echo   - npm registry is unreachable
    echo   - Package.json has invalid dependencies
    echo   - Insufficient disk space
    echo.
    echo Try these solutions:
    echo   1. Check your internet connection
    echo   2. Run 'npm cache clean --force' then try again
    echo   3. Delete node_modules folder and try again
    echo.
    pause
    exit /b 1
)
echo.
echo        Dependencies ready.
echo.

:: Start Stable Diffusion WebUI for image generation
echo [4/4] Starting Stable Diffusion WebUI...
if exist "%SDWEBUI_PATH%\webui-user.bat" (
    :: Check if SD WebUI is already running
    powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:7860/sdapi/v1/sd-models' -UseBasicParsing -TimeoutSec 2).StatusCode" >nul 2>&1
    if %errorlevel% equ 0 (
        echo        SD WebUI already running at http://localhost:7860
    ) else (
        echo        Starting SD WebUI from %SDWEBUI_PATH%...
        echo        (This runs in background - may take 30-60 seconds to load)
        pushd "%SDWEBUI_PATH%"
        start "SD WebUI" cmd /c "webui-user.bat --api"
        popd
        echo        SD WebUI starting in background...
    )
) else (
    echo        SD WebUI not found at: %SDWEBUI_PATH%
    echo.
    echo        To enable image generation:
    echo        1. Install SD WebUI from: https://github.com/AUTOMATIC1111/stable-diffusion-webui
    echo        2. Edit this file (run.bat) and set SDWEBUI_PATH to your install location
    echo.
    echo        Continuing without image generation...
)
echo.

:: Start the development server
echo ======================================
echo    Starting Development Server...
echo ======================================
echo.
echo    Recipe Runner: http://localhost:5173
echo    SD WebUI:      http://localhost:7860
echo.
echo    Press Ctrl+C to stop the server
echo.
echo ======================================
echo.

call npm run dev

:: Handle server exit
if %errorlevel% neq 0 (
    echo.
    echo ======================================
    echo    SERVER STOPPED WITH ERROR
    echo ======================================
    echo.
    echo Error code: %errorlevel%
    echo.
    echo Possible causes:
    echo   - Port 5173 is already in use
    echo   - Missing or corrupted dependencies
    echo   - Syntax error in source files
    echo.
    echo Try these solutions:
    echo   1. Close other dev servers using port 5173
    echo   2. Delete node_modules and run this script again
    echo   3. Check the error messages above for details
    echo.
    pause
    exit /b %errorlevel%
)

pause
