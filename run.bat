@echo off
title Run mind-free-ai Dev Server
echo ===================================================
echo Starting mind-free-ai development environment...
echo ===================================================

:: Navigate to the mind-free-ai directory
cd /d "%~dp0mind-free-ai"

:: Check if bun is installed on the system
where bun >nul 2>nul
if %errorlevel% equ 0 (
    echo [System] Bun detected. Using Bun...
    if not exist node_modules (
        echo [System] node_modules not found. Installing dependencies...
        call bun install
    )
    echo [System] Starting development server...
    call bun run dev
) else (
    echo [System] Bun not detected. Falling back to Node/npm...
    if not exist node_modules (
        echo [System] node_modules not found. Installing dependencies...
        call npm install
    )
    echo [System] Starting development server...
    call npm run dev
)

pause
