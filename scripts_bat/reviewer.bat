@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\reviewer.log
rem skip when there is nothing to do - claude costs tokens even to say 'no work'
git branch --list "work/*" | findstr /R "." >nul
if errorlevel 1 (
  echo [skip] nothing to do >> logs\reviewer.log
  goto :eof
)

node scripts/codex_loop_runner.mjs reviewer >> logs\reviewer.log 2>&1
set "LOOP_EXIT=%errorlevel%"
exit /b %LOOP_EXIT%
