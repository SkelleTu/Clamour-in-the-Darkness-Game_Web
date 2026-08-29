@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Clamour - Embedded Universal Server

echo ============================================
echo   Clamour - Embedded Universal Server
echo ============================================
echo.

set "REPO_DIR=%~dp0universal-server"
set "API_DIR=%REPO_DIR%\artifacts\api-server"
set "ENV_FILE=%REPO_DIR%\.env"
set "ENV_EXAMPLE=%REPO_DIR%\.env.example"

if not exist "%REPO_DIR%\package.json" (
    echo [ERROR] Embedded Universal Server not found:
    echo         %REPO_DIR%
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo       Node.js version: %%i
echo.

echo [2/5] Checking pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pnpm is not installed or not in PATH.
    echo       Install pnpm 10.x for the embedded Universal Server.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('pnpm --version') do echo       pnpm version: %%i
echo.

echo [3/5] Installing Universal Server dependencies...
pushd "%REPO_DIR%"
call pnpm install --frozen-lockfile
if errorlevel 1 (
    echo [ERROR] Failed to install Universal Server dependencies.
    popd
    pause
    exit /b 1
)
popd
echo.

echo [4/5] Checking environment...
if not exist "%ENV_FILE%" (
    if exist "%ENV_EXAMPLE%" (
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo       Created %ENV_FILE%
        echo       IMPORTANT: configure the required secrets in this file before running.
    ) else (
        echo [ERROR] Missing .env.example.
        pause
        exit /b 1
    )
) else (
    echo       .env already exists.
)
echo.

echo [5/5] Building and starting Universal Server...
set "DOTENV_CONFIG_PATH=%ENV_FILE%"
pushd "%REPO_DIR%"
call pnpm run build:render
if errorlevel 1 (
    echo [ERROR] Universal Server build failed.
    popd
    pause
    exit /b 1
)
echo.
echo       Dashboard: http://127.0.0.1:3000/dashboard
echo       Health:    http://127.0.0.1:3000/api/healthz
echo.
call pnpm start
popd

pause
