@echo off
rem Builds the static site into the dist folder using the portable Node in this folder.
cd /d "%~dp0"
set "PATH=%~dp0node-v26.13.0-win-x64;%PATH%"
call npm run build
pause
