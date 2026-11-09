@echo off
rem Starts the demo using the portable Node in this folder. No PATH changes needed.
cd /d "%~dp0"
set "PATH=%~dp0node-v26.13.0-win-x64;%PATH%"
start "" http://localhost:5173
call npm run dev
pause
