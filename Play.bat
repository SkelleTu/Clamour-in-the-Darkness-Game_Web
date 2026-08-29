@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Clamour in the Darkness - Local Web Player

echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player + Universal Server
echo ==========================================
echo.

if not exist "%~dp0universal-server\package.json" (
    echo [ERROR] Embedded Universal Server was not found.
    echo Expected: %~dp0universal-server
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0universal-server\.env" (
    echo [ERROR] Universal Server .env was not found.
    echo Create: %~dp0universal-server\.env
    echo A template is available at: %~dp0universal-server\.env.example
    echo Fill in the required secrets before running Clamour.
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando Node.js...
node --version
if errorlevel 1 goto :node_error
echo.

echo [2/4] Verificando pnpm...
call pnpm --version
if errorlevel 1 goto :pnpm_error
echo.

if not exist "%~dp0node_modules" (
    echo [3/4] Instalando dependencias do Clamour...
    call pnpm install
    if errorlevel 1 goto :install_error
) else (
    echo [3/4] Dependencias do Clamour ja instaladas.
)
echo.

echo [4/4] Iniciando Clamour + Universal Server...
echo.

start "" cmd /c "npm run dev"

node scripts\wait-for-stack.mjs
if errorlevel 1 (
    echo.
    echo [ERROR] Clamour + Universal Server nao ficaram online.
    echo O navegador nao sera aberto.
    echo Verifique a janela do servidor para o erro.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   TUDO PRONTO!
echo ==========================================
echo.
echo Pressione ENTER para abrir o jogo...

set "_SIMULATE_ENTER=%temp%\simulate_enter_%random%.vbs"
echo Set WshShell = CreateObject("WScript.Shell") > "%_SIMULATE_ENTER%"
echo WshShell.SendKeys "{ENTER}" >> "%_SIMULATE_ENTER%"
cscript //nologo "%_SIMULATE_ENTER%"
del /f /q "%_SIMULATE_ENTER%"

echo.
start http://localhost:5173/
echo Jogo aberto! Aproveite.

timeout /t 5 /nobreak >nul
exit /b 0

:node_error
echo.
echo [ERROR] Node.js nao foi encontrado no PATH.
echo Use Node.js 24.x e abra um novo CMD.
echo.
pause
exit /b 1

:pnpm_error
echo.
echo [ERROR] pnpm nao foi encontrado no PATH.
echo Instale pnpm 10.x e abra um novo CMD.
echo.
pause
exit /b 1

:install_error
echo.
echo [ERROR] Falha ao instalar as dependencias do Clamour.
echo.
pause
exit /b 1
