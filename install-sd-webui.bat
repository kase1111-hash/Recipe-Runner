@echo off
setlocal enabledelayedexpansion

echo ================================================
echo    Stable Diffusion WebUI Installer
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

:: Check if Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python is not installed.
    echo.
    echo Please install Python 3.10.6 (REQUIRED - newer versions won't work!)
    echo.
    echo Download: https://www.python.org/ftp/python/3.10.6/python-3.10.6-amd64.exe
    echo.
    echo IMPORTANT during installation:
    echo   [x] Check "Add Python to PATH"
    echo   [x] Check "Install for all users" (optional)
    echo.
    echo After installing Python 3.10.6, run this installer again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo        Python found: %PYTHON_VERSION%

:: Check Python version - MUST be 3.10.x (PyTorch doesn't support 3.11+)
python -c "import sys; exit(0 if sys.version_info[:2] == (3, 10) else 1)" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ================================================
    echo    ERROR: Wrong Python Version!
    echo ================================================
    echo.
    echo    You have: %PYTHON_VERSION%
    echo    Required: Python 3.10.x
    echo.
    echo    SD WebUI requires Python 3.10 because PyTorch
    echo    doesn't have packages for newer versions yet.
    echo.
    echo    Python 3.11, 3.12, 3.13, 3.14 will NOT work!
    echo.
    echo ================================================
    echo.
    echo To fix this:
    echo   1. Uninstall your current Python (optional)
    echo   2. Download Python 3.10.6:
    echo      https://www.python.org/ftp/python/3.10.6/python-3.10.6-amd64.exe
    echo   3. Install with "Add Python to PATH" checked
    echo   4. Run this installer again
    echo.
    echo If you have multiple Python versions, you can set
    echo the path manually in webui-user.bat after install.
    echo.
    pause
    exit /b 1
)
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

:: Clone the repository
echo [3/5] Downloading Stable Diffusion WebUI...
echo        This may take a few minutes...
echo.
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git "%INSTALL_PATH%"
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

:: Create/modify webui-user.bat to include --api flag
echo @echo off> "%INSTALL_PATH%\webui-user.bat"
echo.>> "%INSTALL_PATH%\webui-user.bat"
echo set PYTHON=>> "%INSTALL_PATH%\webui-user.bat"
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
