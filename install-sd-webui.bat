@echo off
setlocal enabledelayedexpansion

echo ================================================
echo    Stable Diffusion WebUI Forge Installer
echo    For Recipe Runner Image Generation
echo ================================================
echo.

:: ============================================
:: CONFIGURATION
:: ============================================
set "INSTALL_PATH=C:\stable-diffusion-webui"

:: Check for admin rights (optional but recommended)
echo [1/5] Checking system requirements...
echo.

:: Check if Git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed.
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo During installation, select "Add to PATH"
    echo.
    echo After installing Git, run this installer again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
echo        Git found: %GIT_VERSION%

:: Find Python 3.10 specifically (user may have multiple versions)
set "PYTHON_CMD="

:: First try the py launcher with -3.10
py -3.10 --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3.10"
    for /f "tokens=*" %%i in ('py -3.10 --version') do set PYTHON_VERSION=%%i
    echo        Found via py launcher: !PYTHON_VERSION!
    goto :python_found
)

:: Try common Python 3.10 installation paths
if exist "C:\Python310\python.exe" (
    set "PYTHON_CMD=C:\Python310\python.exe"
    for /f "tokens=*" %%i in ('"C:\Python310\python.exe" --version') do set PYTHON_VERSION=%%i
    echo        Found at C:\Python310: !PYTHON_VERSION!
    goto :python_found
)

if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    for /f "tokens=*" %%i in ('"%LOCALAPPDATA%\Programs\Python\Python310\python.exe" --version') do set PYTHON_VERSION=%%i
    echo        Found in AppData: !PYTHON_VERSION!
    goto :python_found
)

:: Check default python command as last resort
where python >nul 2>&1
if %errorlevel% equ 0 (
    python -c "import sys; exit(0 if sys.version_info[:2] == (3, 10) else 1)" >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=python"
        for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
        echo        Found in PATH: !PYTHON_VERSION!
        goto :python_found
    )
)

:: Python 3.10 not found
echo.
echo ================================================
echo    ERROR: Python 3.10 Not Found!
echo ================================================
echo.
echo    SD WebUI requires Python 3.10 specifically.
echo    PyTorch doesn't support Python 3.11+ yet.
echo.
echo    You may have Python installed, but not 3.10.
echo.
echo To fix this:
echo   1. Download Python 3.10.6:
echo      https://www.python.org/ftp/python/3.10.6/python-3.10.6-amd64.exe
echo   2. Install with "Add Python to PATH" checked
echo   3. Run this installer again
echo.
pause
exit /b 1

:python_found
echo        Using: %PYTHON_CMD%
echo.

:: Check if already installed
echo [2/5] Checking installation path...
if exist "%INSTALL_PATH%\webui-user.bat" (
    echo.
    echo SD WebUI is already installed at: %INSTALL_PATH%
    echo.
    choice /C YN /M "Reinstall? (This will delete the existing installation)"
    if errorlevel 2 (
        echo.
        echo Installation cancelled. Your existing installation is unchanged.
        echo.
        pause
        exit /b 0
    )
    echo.
    echo Removing existing installation...
    rmdir /s /q "%INSTALL_PATH%" 2>nul
)
echo        Install path: %INSTALL_PATH%
echo.

:: Clone the repository (using Forge - faster and more maintained than original A1111)
echo [3/5] Downloading Stable Diffusion WebUI Forge...
echo        (Forge is a faster, optimized fork of AUTOMATIC1111)
echo        This may take a few minutes...
echo.
git clone https://github.com/lllyasviel/stable-diffusion-webui-forge.git "%INSTALL_PATH%"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to clone repository.
    echo.
    echo Possible causes:
    echo   - No internet connection
    echo   - GitHub is unreachable
    echo   - Insufficient disk space
    echo.
    pause
    exit /b 1
)
echo.
echo        Download complete!
echo.

:: Configure for API access
echo [4/5] Configuring for Recipe Runner...
echo.

:: Create/modify webui-user.bat to include --api flag and Python path
echo @echo off> "%INSTALL_PATH%\webui-user.bat"
echo.>> "%INSTALL_PATH%\webui-user.bat"

:: Set the Python path if we found a specific one
if "%PYTHON_CMD%"=="py -3.10" (
    echo set PYTHON=py -3.10>> "%INSTALL_PATH%\webui-user.bat"
    echo        Python configured: py -3.10
) else if "%PYTHON_CMD%"=="python" (
    echo set PYTHON=>> "%INSTALL_PATH%\webui-user.bat"
    echo        Python configured: default
) else (
    echo set PYTHON=%PYTHON_CMD%>> "%INSTALL_PATH%\webui-user.bat"
    echo        Python configured: %PYTHON_CMD%
)

echo set GIT=>> "%INSTALL_PATH%\webui-user.bat"
echo set VENV_DIR=>> "%INSTALL_PATH%\webui-user.bat"
echo set COMMANDLINE_ARGS=--api --xformers>> "%INSTALL_PATH%\webui-user.bat"
echo.>> "%INSTALL_PATH%\webui-user.bat"
echo call webui.bat>> "%INSTALL_PATH%\webui-user.bat"

echo        API mode enabled (--api flag)
echo        xformers optimization enabled
echo.

:: First run notice
echo [5/5] Installation complete!
echo.
echo ================================================
echo    IMPORTANT: First Run Instructions
echo ================================================
echo.
echo The first time you run SD WebUI, it will:
echo   1. Download required Python packages (~2-5 GB)
echo   2. Download the base Stable Diffusion model (~4 GB)
echo   3. Set up the virtual environment
echo.
echo This initial setup takes 10-30 minutes depending on
echo your internet speed. Subsequent starts are much faster.
echo.
echo ================================================
echo.
choice /C YN /M "Run first-time setup now? (Recommended)"
if errorlevel 2 (
    echo.
    echo You can run SD WebUI later by:
    echo   1. Opening: %INSTALL_PATH%
    echo   2. Double-clicking: webui-user.bat
    echo.
    echo Or just run Recipe Runner's run.bat - it will start
    echo SD WebUI automatically!
    echo.
    pause
    exit /b 0
)

echo.
echo Starting first-time setup...
echo (This window will show download progress)
echo.
echo ================================================
echo    DO NOT CLOSE THIS WINDOW
echo    Wait for "Running on local URL" message
echo ================================================
echo.

pushd "%INSTALL_PATH%"
call webui-user.bat
popd

pause
