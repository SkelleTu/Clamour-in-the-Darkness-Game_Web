@echo off
setlocal
cd /d "%~dp0"

title Clamour in the Darkness - Local Web Player

echo ==========================================
echo   CLAMOUR IN THE DARKNESS
echo   Local Web Player
echo ==========================================
echo.

node --version >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in this launch environment.
  echo Trying common Node.js installation paths...
  set "NODE_EXE="
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
  if not defined NODE_EXE (
    echo Node.js installation could not be located.
    echo Please restart Windows after installing Node.js LTS.
    echo.
    pause
    exit /b 1
  )
  set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LocalAppData%\Programs\nodejs;%PATH%"
)

node --version
npm --version

if not exist "node_modules" (
  echo.
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
echo Close the Clamour Server window to stop it.
echo.
endlocal
