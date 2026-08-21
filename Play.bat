@echo off
setlocal
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player

echo ==========================================
echo   CLAMOUR IN THE DARKNESS
 e﻿cho   Local Web Player
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale o Node.js LTS e execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o servidor local...
start "Clamour Server" /min cmd /c "npm run dev -- --host 127.0.0.1 > .clamour-server.log 2>&1"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo Clamour foi iniciado no navegador.
echo Feche a janela 'Clamour Server' para encerrar o servidor.
echo.
endlocal
