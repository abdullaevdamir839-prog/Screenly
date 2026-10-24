@echo off
setlocal
cd /d "%~dp0"
title Screenly 1.6 - Collaboration
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Install LTS from https://nodejs.org/
  pause
  exit /b 1
)
if not exist ".env.local" (
  echo Missing .env.local
  copy ".env.example" ".env.local" >nul
  echo Fill in .env.local with your LiveKit credentials and secrets first.
  notepad ".env.local"
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Installation failed.
    pause
    exit /b 1
  )
)
echo.
echo Checking local category art...
node scripts\sync-category-art.mjs
if errorlevel 1 ( pause & exit /b 1 )
echo Running local checks...
call npm.cmd run check
if errorlevel 1 (
  echo Checks failed. See errors above.
  pause
  exit /b 1
)
echo Starting Screenly at http://localhost:3000
echo Keep this window open while using the site.
echo.
call npm.cmd run dev
pause
