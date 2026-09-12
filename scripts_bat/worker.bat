@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\worker.log
rem skip when there is nothing to do - claude costs tokens even to say 'no work'
findstr /C:"- [ ]" BACKLOG.md >nul
if errorlevel 1 if not exist REVIEW.md (
  echo [skip] nothing to do >> logs\worker.log
  goto :eof
)

node scripts/codex_loop_runner.mjs worker >> logs\worker.log 2>&1
set "LOOP_EXIT=%errorlevel%"
exit /b %LOOP_EXIT%
