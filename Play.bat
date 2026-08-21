@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player
echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player
echo ==========================================
echo.necho Node:
node --version || goto :node_error
echo.
echo Installing/checking dependencies...
call npm install
if errorlevel 1 goto :npm_error

echo.
echo Starting Vite server...
start "Clamour Server" cmd /k "cd /d "%~dp0" && npm run dev -- --host 127.0.0.1"
echo.
echo Opening browser at http://127.0.0.1:5173
start "" "http://127.0.0.1:5173"
echo.
echo Keep the Clamour Server window open while playing.
echo Close it to stop the game server.
echo.
pause
exit /b 0

:node_error
echo.
echo Node.js was not found by this launcher.
echo Run: node --version
pause
exit /b 1

:npm_error
echo.
echo npm install failed. Read the error above.
pause
exit /b 1
