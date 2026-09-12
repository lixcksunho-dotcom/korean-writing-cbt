# 코덱스 샌드박스 예약 루프 실행기

2026-09-12 Fable 실측: 기존 bat은 `%USERPROFILE%\ops\codex-run.cmd`로 `codex exec --sandbox workspace-write`를 실행했다. 샌드박스의 `.git` 쓰기 제한 때문에 워커의 커밋은 index.lock 오류가 나고 리뷰어의 병합·브랜치 삭제도 막혔다. 규칙은 계속 Git 쓰기를 요구해 회차당 30분 제한을 소진했다. “커밋 금지·마지막 줄 WORKER_DONE” 지시와 바깥 감독의 커밋으로 바꾼 회차는 6~10분에 끝났다. 이는 전달받은 실측이며 이번 검사는 실제 Codex를 호출하지 않는다.

`node scripts/codex_loop_runner.mjs worker|reviewer`를 저장소에서 실행한다. 실행기는 저장소 루트로 이동하고 Git 쓰기를 담당한다. Codex에는 workspace-write와 오프라인 작업만 지시한다. `approval_policy`는 전달하지 않으며 stdin은 입력 직후 닫는다. 사용자 프로필의 `ops/codex-runtime.json` 안 `codexExecutable`이 없으면 PATH의 `codex`를 사용한다. 결제·유료 API·배포 권한을 추가하는 변경이 아니다.

- 워커: REVIEW 우선, 아니면 첫 미완료 항목(⏸ 항목 제외). 새 작업은 main에서 work 브랜치를 만들고, 반려 수정은 해당 브랜치를 다시 사용한다.
- 워커: 변경을 저장하고 완료 신호와 제안 메시지로 커밋한다. 신호가 없거나 실행이 실패하면 wip 커밋 후 “이어서” 한 번만 실행하고 main으로 돌아온다. 반려 문서는 완료 때 삭제한다.
- 리뷰어: 최신 work 브랜치 diff·REPORT 마지막 절·원래 항목을 받고 PASS/FAIL만 출력한다. 파일 변경이 감지되면 결과를 보존하고 자동 병합을 중단한다.
- PASS: main으로 no-ff 병합, 항목 앞 40자 일치로 BACKLOG 완료 표시, REPORT 추가와 후속 커밋, 브랜치 삭제. 항목 연결이 없거나 중복이면 반려한다.
- FAIL: REVIEW 기록, 브랜치별 이력 누적, 3회 반려 시 NEED_HUMAN. 충돌은 merge --abort 후 파일명을 REVIEW에 기록한다.
- 보호: 시작 전 모든 staged 변경과 REVIEW 외 미커밋 변경을 거부한다. 빈 diff는 반려하며, 기존 REVIEW의 내용 변경도 리뷰어 수정으로 감지한다. 미완료 반려 수정은 main 복귀 후 REVIEW를 복원해 다음 워커가 같은 브랜치에서 이어간다.
- 공통: NEED_HUMAN이면 즉시 종료. Codex 호출 한 번당 기본 15분(`CODEX_LOOP_MINUTES`, 소수 허용), Windows에서는 taskkill /T /F로 트리를 종료한다. 워커의 최대 두 호출에는 각각 제한이 적용된다.

로그는 `logs/codex-<역할>-<시각>-<pid>.events`, `.err`, `.last.txt`에 기록한다. `logs/loop-tasks.json`은 브랜치와 원래 BACKLOG 항목을 연결하고, `logs/review-count.json`은 브랜치별 반려 이력 배열을 저장한다. 실행기가 `.git/info/exclude`에 `/logs/`를 추가해 로그를 커밋에서 제외한다. 이 로컬 상태는 반려 수정과 재검수 사이에 보존해야 한다. 실행기 이전에 만든 브랜치는 항목 연결을 사람이 확인해야 한다.

`logs/codex-loop.lock`으로 중복 실행을 막는다. 실행기 자체가 강제 종료되어 잠금이 남으면 PID와 실행 종료를 확인한 뒤 잠금을 정리한다. REVIEW 외의 기존 미커밋 변경이 있으면 실행을 중단한다. 워커 미완료·실행 오류는 exit 1, 정상 판정 처리·대기는 exit 0이다. 네트워크 차단 자체는 호출 환경의 정책을 사용한다.

## bat 교체 제안 — 적용하지 않음

기존 bat의 저장소 이동·로그 설정을 유지하고 Codex 호출 줄만 아래로 교체한다. 실행기는 Git을 쓸 수 있는 바깥 예약 프로세스에서 실행해야 한다.

worker.bat:
```bat
node scripts/codex_loop_runner.mjs worker
```

reviewer.bat:
```bat
node scripts/codex_loop_runner.mjs reviewer
```

## CLAUDE.md 제안 diff — 사람 결정 후 적용

```diff
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ 워커 모드
-2. REVIEW.md가 존재하면: 그 수정 지시를 처리하고, 완료 후 REVIEW.md를 삭제
+2. REVIEW.md가 존재하면 그 수정 지시를 처리한다. 완료 신호를 확인한 실행기가 REVIEW.md를 삭제하고 커밋에 포함한다.
-4. 반드시 `work/작업요약` 브랜치를 만들어 작업한다. main 직접 수정 금지
-5. 완료 시: 커밋하고 REPORT.md에 작업 요약·변경 파일·테스트 방법과 **실제 실행 결과**를 기록
+4. 브랜치 생성·전환과 커밋은 바깥 실행기가 한다. Codex는 Git 쓰기를 하지 않고 준비된 work 브랜치에서 파일을 바로 저장한다.
+5. 오프라인 검사만 실행하고 REPORT.md에 작업 요약·변경 파일·테스트 방법과 실제 실행 결과를 기록한다. 마지막 메시지에 '커밋 메시지 제안: ...'을 적고 마지막 줄은 WORKER_DONE으로 끝낸다. 미완료이면 실행기가 wip 커밋 후 한 번만 이어서 실행한다.
@@ 리뷰어 모드
-3. 통과: main에 merge → BACKLOG 항목 [x] → work 브랜치 삭제 → REPORT에 "검수 통과" 추가
-4. 반려: REVIEW.md에 [무엇이 / 왜 문제이고 / 어떻게 고칠지]를 구체적으로 작성
-5. 같은 작업이 3회째 반려되면 NEED_HUMAN.md를 만들고 반려 이력을 적은 뒤 종료
-6. 리뷰어는 merge와 체크 표시 외에 코드를 직접 수정하지 않는다
+3. 통과: 마지막 메시지 첫 줄에 PASS. 실행기가 main 병합·BACKLOG 완료 표시·REPORT 추가·커밋·브랜치 삭제를 한다.
+4. 반려: 마지막 메시지 첫 줄에 FAIL, 아래에 REVIEW.md에 들어갈 [무엇이 / 왜 문제이고 / 어떻게 고칠지]를 쓴다. 파일 저장은 실행기가 한다.
+5. 실행기가 반려 이력을 세고 같은 브랜치의 3회째 반려에 NEED_HUMAN.md를 만든다. 병합 충돌도 실행기가 abort하고 반려 문서에 기록한다.
+6. Codex 리뷰어는 오프라인 검토와 판정만 한다. 코드·문서 수정 및 모든 Git 쓰기를 금지한다.
```

검사: `npm.cmd run check:loop-runner`. `CODEX_LOOP_FAKE=<절대경로.mjs>`를 지정하면 실제 Codex 대신 Node로 해당 스크립트를 실행한다. 가짜 스크립트도 stdin을 읽고 `--output-last-message` 다음 경로에 마지막 메시지를 저장해야 한다. 검사는 os.tmpdir() 아래 독립 Git 저장소만 만들며 실제 codex.exe·네트워크를 사용하지 않는다.
