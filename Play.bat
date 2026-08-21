@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player
echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player
echo ==========================================
echo.

echo Node: 
node --version || goto :node_error
echo.
echo Installing/checking dependencies...
call npm install
if errorlevel 1 goto :npm_error

echo.
echo Starting Vite server...
start "Clamour Server" cmd /k "cd /d "%~dp0" && npm run dev -- --host 127.0.0.1"
echo Waiting for the server...

for /L %%N in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}; exit 1 } catch { exit 1 }"
  if not errorlevel 1 goto :ready
  timeout /t 1 /nobreak >nul
)

echo.
echo Server did not become ready after 30 seconds.
echo Check the Clamour Server window for the real error.
pause
exit /b 1

:ready
echo Server ready. Opening browser...
start "" "http://127.0.0.1:5173"
echo.
echo Game is running at http://127.0.0.1:5173
echo Keep this window and the Clamour Server window open while playing.
cmd /k
exit /b 0

:node_error
echo.
echo Node.js was not found by this launcher.
echo But if 'node --version' works in CMD, run this file from that same CMD.
pause
exit /b 1

:npm_error
echo.
echo npm install failed. The window will stay open so you can read the error.
pause
exit /b 1
