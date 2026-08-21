@echo off
setlocal
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player

echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js LTS, then close and reopen this folder.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting local web server...
start "Clamour Server" /min cmd /c "npm run dev -- --host 127.0.0.1 > .clamour-server.log 2>&1"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo Clamour was started in your browser.
echo Close the 'Clamour Server' window to stop it.
echo.
endlocal
