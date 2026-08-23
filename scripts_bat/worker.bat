@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\worker.log
rem skip when there is nothing to do - claude costs tokens even to say 'no work'
findstr /C:"- [ ]" BACKLOG.md >nul
if errorlevel 1 (
  echo [skip] nothing to do >> logs\worker.log
  goto :eof
)

claude -p "CLAUDE.md의 워커 규칙에 따라 진행해. 보고는 간결하게 — 무엇을 왜 했는지와 검증 결과만." --model fable --allowedTools "Read,Edit,Write,Bash" >> logs\worker.log 2>&1
python tools\check_model_limit.py logs\worker.log
rem exit 3 = model limit hit; retry once on sonnet so the loop does not skip a turn
if errorlevel 3 (
  claude -p "CLAUDE.md의 워커 규칙에 따라 진행해. 보고는 간결하게 — 무엇을 왜 했는지와 검증 결과만." --model sonnet --allowedTools "Read,Edit,Write,Bash" >> logs\worker.log 2>&1
)
