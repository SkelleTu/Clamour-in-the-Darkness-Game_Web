@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player

echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player
echo ==========================================
echo.

echo Checking Node.js...
node --version
if errorlevel 1 (
  echo.
  echo Node.js was not found in this launch environment.
  echo.
  echo Try opening CMD and running: node --version
  echo If that works there, restart Windows or launch this file from CMD.
  echo.
  pause
  exit /b 1
)

npm --version
if errorlevel 1 (
  echo.
  echo npm was not found.
  pause
  exit /b 1
)

echo.
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
echo Keep this window open while playing.
echo.
start "Clamour Server" /min cmd /c "npm run dev -- --host 127.0.0.1 > .clamour-server.log 2>&1"

set "READY="
for /L %%N in (1,1,20) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}; exit 1 } catch { exit 1 }"
  if not errorlevel 1 (
    set "READY=1"
    goto :server_ready
  )
  timeout /t 1 /nobreak >nul
)

:server_failed
echo.
echo The web server did not become ready.
echo.
echo ----- SERVER LOG -----
if exist ".clamour-server.log" type ".clamour-server.log"
echo ----- END SERVER LOG -----
echo.
echo The launcher will stay open so the error can be read.
pause
exit /b 1

:server_ready
echo.
echo Server is ready. Opening browser...
start "" "http://127.0.0.1:5173"
echo.
echo Clamour is running at http://127.0.0.1:5173
 echo Keep this window open while playing.
echo Press Ctrl+C here to stop the launcher.
echo.
cmd /k
endlocal
