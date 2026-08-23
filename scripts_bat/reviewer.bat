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

claude -p "CLAUDE.md의 리뷰어 규칙에 따라 검수해. 보고는 간결하게 — 검증한 사실과 판정만." --model sonnet --allowedTools "Read,Edit,Write,Bash" >> logs\reviewer.log 2>&1
python tools\check_model_limit.py logs\reviewer.log
rem exit 3 = model limit hit; retry once on sonnet so the loop does not skip a turn
if errorlevel 3 (
  claude -p "CLAUDE.md의 리뷰어 규칙에 따라 검수해. 보고는 간결하게 — 검증한 사실과 판정만." --model sonnet --allowedTools "Read,Edit,Write,Bash" >> logs\reviewer.log 2>&1
)
