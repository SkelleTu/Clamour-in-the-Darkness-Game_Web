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
call node --version
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo.
  pause
  exit /b 1
)

echo Checking npm...
call npm --version
if errorlevel 1 (
  echo.
  echo npm was not found.
  echo.
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
echo.
start "Clamour Server" /min cmd /c "call npm run dev -- --host 127.0.0.1 > .clamour-server.log 2>&1"

echo Waiting for server...
for /L %%N in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}; exit 1 } catch { exit 1 }"
  if not errorlevel 1 goto :server_ready
  timeout /t 1 /nobreak >nul
)

echo.
echo The web server did not become ready.
echo.
echo ----- SERVER LOG -----
if exist ".clamour-server.log" type ".clamour-server.log"
echo ----- END SERVER LOG -----
echo.
pause
exit /b 1

:server_ready
echo.
echo Server is ready. Opening browser...
start "" "http://127.0.0.1:5173"
echo.
echo Clamour is running at http://127.0.0.1:5173
echo Keep this launcher window open while playing.
echo.
pause
endlocal
