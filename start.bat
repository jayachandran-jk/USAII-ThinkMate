@echo off
SETLOCAL EnableDelayedExpansion
title Launching Traveloop / Mind-Free AI Development Server

:: Color configuration: 0A is Light Green on Black, 0B is Light Aqua, etc.
color 0B

echo =======================================================================
echo               M I N D - F R E E   A I   /   T R A V E L O O P
echo                    Development Environment Launcher
echo =======================================================================
echo.

:: Define the target directory relative to the batch file path
set "PROJECT_DIR=%~dp0mind-free-ai"

:: Check if the project directory exists
if not exist "%PROJECT_DIR%" (
    color 0C
    echo [ERROR] The folder "mind-free-ai" was not found at:
    echo         "%PROJECT_DIR%"
    echo.
    echo Please make sure this script is located in the root workspace folder.
    goto error_exit
)

cd /d "%PROJECT_DIR%"
echo [Info] Working directory set to: %CD%
echo.

:: Detect package manager
set "PKG_MANAGER="
set "RUN_CMD="

:: 1. Check for Bun
where bun >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PKG_MANAGER=Bun"
    set "RUN_CMD=bun"
    goto pkg_found
)

:: 2. Check for pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PKG_MANAGER=pnpm"
    set "RUN_CMD=pnpm"
    goto pkg_found
)

:: 3. Check for Yarn
where yarn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PKG_MANAGER=Yarn"
    set "RUN_CMD=yarn"
    goto pkg_found
)

:: 4. Check for npm / Node
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PKG_MANAGER=npm"
    set "RUN_CMD=npm"
    goto pkg_found
)

color 0C
echo [ERROR] No package manager detected (Bun, pnpm, Yarn, or npm).
echo         Please install Node.js (which includes npm) or Bun.
echo         Visit: https://nodejs.org/ or https://bun.sh/
goto error_exit

:pkg_found
color 0B
echo [System] Detected %PKG_MANAGER%. Utilizing %RUN_CMD% for operations.
echo.

:: Check for node_modules and install if missing
if not exist "node_modules\" (
    echo [System] "node_modules" folder not found.
    echo [System] Installing project dependencies now...
    echo.
    if "!RUN_CMD!"=="bun" (
        call bun install
    ) else if "!RUN_CMD!"=="pnpm" (
        call pnpm install
    ) else if "!RUN_CMD!"=="yarn" (
        call yarn install
    ) else (
        call npm install
    )
    
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo [ERROR] Dependency installation failed. Please check the logs above.
        goto error_exit
    )
    echo.
    echo [System] Dependencies successfully installed.
    echo.
)

:: Start the development server
color 0A
echo =======================================================================
echo          Starting development server with "%RUN_CMD% run dev"
echo          Press Ctrl+C inside this window to stop the server
echo =======================================================================
echo.

if "!RUN_CMD!"=="bun" (
    call bun run dev
) else (
    call !RUN_CMD! run dev
)

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo [WARNING] The development server exited with an error code: %ERRORLEVEL%
)

:error_exit
echo.
echo Press any key to close this window...
pause >nul
ENDLOCAL
