@echo off
setlocal enabledelayedexpansion

REM ========================================
REM CONTACT360 DASHBOARD - CODEBASE STATE CHECK
REM ========================================
REM Run from app folder: double-click or run codebase_state.bat from this directory.
REM
REM Pipeline - local full audit; order differs slightly from npm run ci:
REM   0 CSS inventory optional, 1 clean+install, 2 codegen, 3 typecheck,
REM   4 Prettier (npx prettier --check / write), 5 lint, 6 unit tests, 6b coverage if RUN_TEST_COVERAGE=1,
REM   7 check-best-practices ~86 checks, 8 final format, 9 build, then optional dev.
REM
REM npm run ci is: lint, typecheck, test, css:inventory, check:best-practices, build.
REM No clean, install, codegen, or format. For CI parity only: SKIP_CSS_INVENTORY=1 then npm run ci.
REM
REM Optional environment variables:
REM SKIP_CSS_INVENTORY=1     Skip step 0 css-inventory.mjs
REM SKIP_BEST_PRACTICES=1    Skip step 7 scored checklist
REM BEST_PRACTICES_NO_FAIL=1 Run checker with --no-fail advisory exit 0
REM BEST_PRACTICES_THRESHOLD=N  Pass --threshold default 80 in script
REM BEST_PRACTICES_FORMAT=text or json or both
REM RUN_TEST_COVERAGE=1      After tests run npm run test:coverage warn-only on fail
REM SKIP_FINAL_FORMAT=1      Skip step 8 npm run format
REM SKIP_PRETTIER=1          Skip step 4 Prettier (npx prettier --check / --write)
REM
REM Best-practices: scripts\check-best-practices.mjs - ~86 points, categories include
REM Project Structure, Security, Code Organization, Quality Tooling, Testing, Performance,
REM Deployment, Styling/CSS, TypeScript Discipline, Code Architecture, GraphQL and API Contract,
REM Error Handling and UX. JSON under reports\check_report_*.json
REM Config file .next-checker-config.json: ignore_points, skip_categories, max_inline_style_files,
REM max_any_count, max_console_logs, require_playwright_config, require_middleware,
REM require_coverage_script, require_ci_script, localstorage_allow_files.
REM
REM Codegen needs reachable schema CODEGEN_SCHEMA_URL or NEXT_PUBLIC_GRAPHQL_URL warn-only on fail.
REM CSS report: reports\css-inventory.txt - import graph, inline styles, no Tailwind in this app.
REM ========================================

set "DASHBOARD_DIR=%~dp0"
set "ERROR_COUNT=0"
set "WARNING_COUNT=0"
set "START_TIME=%TIME%"
set "TOTAL_SECTIONS=10"
set "SECTION6_COVERAGE_STATUS=SKIPPED"

REM Enable ANSI color support - Windows 10 or newer (PowerShell is reliable; "prompt $E|cmd" often fails under echo-on / tracing)
set "ESC="
for /f "delims=" %%E in ('powershell -NoProfile -NoLogo -Command "Write-Output ([char]27)" 2^>nul') do set "ESC=%%E"
if not defined ESC (
  set "GREEN="
  set "RED="
  set "YELLOW="
  set "BLUE="
  set "CYAN="
  set "RESET="
) else (
  set "GREEN=!ESC![92m"
  set "RED=!ESC![91m"
  set "YELLOW=!ESC![93m"
  set "BLUE=!ESC![94m"
  set "CYAN=!ESC![96m"
  set "RESET=!ESC![0m"
)

goto :main

:color_echo
setlocal enabledelayedexpansion
set "color_code=%~1"
set "text=%~2"
echo !color_code!!text!
endlocal
goto :eof

:main
echo.
call :color_echo "%CYAN%" "========================================"
call :color_echo "%CYAN%" "  CONTACT360 DASHBOARD STATE CHECK"
call :color_echo "%CYAN%" "========================================"
echo.

if not exist "%DASHBOARD_DIR%" (
    call :color_echo "%RED%" "ERROR: Dashboard directory not found: %DASHBOARD_DIR%"
    exit /b 1
)

cd /d "%DASHBOARD_DIR%"
call :color_echo "%BLUE%" "Current directory: %CD%"
echo.

if /i "%SKIP_CSS_INVENTORY%"=="1" (
  call :color_echo "%YELLOW%" "[0] CSS inventory skipped (SKIP_CSS_INVENTORY=1)"
  echo.
) else (
  call :color_echo "%CYAN%" "[0] CSS styling inventory..."
  echo ----------------------------------------
  call :color_echo "%BLUE%" "  Lists @import graph, Tailwind signals, inline style={{}} locations."
  call :color_echo "%BLUE%" "  Output: reports\css-inventory.txt"
  if exist "scripts\css-inventory.mjs" (
    call node scripts\css-inventory.mjs
    if errorlevel 1 (
      call :color_echo "%YELLOW%" "  ! CSS inventory script exited with error"
    ) else (
      call :color_echo "%GREEN%" "  OK CSS inventory written"
    )
  ) else (
    call :color_echo "%YELLOW%" "  ! scripts\css-inventory.mjs not found"
  )
  echo.
)

set "SECTION2_STATUS=SKIPPED"
set "SECTION3_STATUS=SKIPPED"
set "SECTION4_STATUS=SKIPPED"
set "SECTION5_STATUS=SKIPPED"
set "SECTION6_STATUS=SKIPPED"
set "SECTION7_STATUS=SKIPPED"
set "SECTION8_STATUS=SKIPPED"
set "SECTION9_STATUS=SKIPPED"
echo.

call :color_echo "%CYAN%" "[1/10] Cleaning and preparing..."
echo ----------------------------------------
call :color_echo "%YELLOW%" "  Running: npm run clean:all"
call npm run clean:all
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION1_STATUS=FAILED"
    call :color_echo "%RED%" "  X Clean failed"
) else (
    set "SECTION1_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK Clean completed"
)
echo.
call :color_echo "%YELLOW%" "  Running: npm install"
call npm install
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION1_STATUS=FAILED"
    call :color_echo "%RED%" "  X npm install failed"
    goto :summary
) else (
    call :color_echo "%GREEN%" "  OK Dependencies installed"
)
echo.

call :color_echo "%CYAN%" "[2/10] GraphQL Codegen..."
echo ----------------------------------------
call :color_echo "%BLUE%" "  Regenerates graphql/generated from graphql/schema.graphql + graphql/documents (offline)."
call :color_echo "%BLUE%" "  Optional: set CODEGEN_SCHEMA_URL for introspection instead of local SDL (.env.example)."
call :color_echo "%YELLOW%" "  Running: npm run codegen"
call npm run codegen
if errorlevel 1 (
    set /a WARNING_COUNT+=1
    set "SECTION2_STATUS=WARNING"
    call :color_echo "%YELLOW%" "  ! Codegen failed  -  check graphql-codegen install / codegen.yml; continuing with existing generated types"
) else (
    set "SECTION2_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK GraphQL types regenerated"
)
echo.

call :color_echo "%CYAN%" "[3/10] Type checking..."
echo ----------------------------------------
call :color_echo "%BLUE%" "  Same as npm run typecheck (tsc --noEmit); duplicates removed vs older bat."
call :color_echo "%YELLOW%" "  Running: npm run typecheck"
call npm run typecheck
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION3_STATUS=FAILED"
    call :color_echo "%RED%" "  X Type check failed"
) else (
    set "SECTION3_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK Type check passed"
)
echo.

call :color_echo "%CYAN%" "[4/10] Prettier (format check)..."
echo ----------------------------------------
if /i "%SKIP_PRETTIER%"=="1" (
    call :color_echo "%YELLOW%" "  Skipped (SKIP_PRETTIER=1)"
    set "SECTION4_STATUS=SKIPPED"
) else (
    call :color_echo "%BLUE%" "  Formatter: Prettier (respects .prettierrc / .prettierignore if present)"
    call :color_echo "%YELLOW%" "  Running: npx prettier --check ."
    call npx prettier --check .
    if errorlevel 1 (
        set /a WARNING_COUNT+=1
        set "SECTION4_STATUS=WARNING"
        call :color_echo "%YELLOW%" "  Prettier found issues  -  running: npx prettier --write ."
        call npx prettier --write .
        if errorlevel 1 (
            set /a ERROR_COUNT+=1
            set "SECTION4_STATUS=FAILED"
            call :color_echo "%RED%" "  X Prettier --write failed"
        ) else (
            call :color_echo "%YELLOW%" "  Verifying: npx prettier --check ."
            call npx prettier --check .
            if errorlevel 1 (
                set /a ERROR_COUNT+=1
                set "SECTION4_STATUS=FAILED"
                call :color_echo "%RED%" "  X Prettier check still failing after write"
            ) else (
                set "SECTION4_STATUS=WARNING_FIXED"
                call :color_echo "%GREEN%" "  OK Prettier formatted and verified"
            )
        )
    ) else (
        set "SECTION4_STATUS=PASSED"
        call :color_echo "%GREEN%" "  OK Prettier check passed"
    )
)
echo.

call :color_echo "%CYAN%" "[5/10] Linting..."
echo ----------------------------------------
call :color_echo "%YELLOW%" "  Running: npm run lint"
call npm run lint
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION5_STATUS=FAILED"
    call :color_echo "%RED%" "  X Linting errors found"
    call npm run lint:fix
    if not errorlevel 1 (
        call npm run lint
        if not errorlevel 1 (
            set /a ERROR_COUNT-=1
            set "SECTION5_STATUS=WARNING_FIXED"
            call :color_echo "%GREEN%" "  OK Linting issues resolved"
        )
    )
) else (
    set "SECTION5_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK No linting errors"
)
echo.

call :color_echo "%CYAN%" "[6/10] Running tests..."
echo ----------------------------------------
call :color_echo "%YELLOW%" "  Running: npm run test"
call npm run test
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION6_STATUS=FAILED"
    call :color_echo "%RED%" "  X Tests failed"
) else (
    set "SECTION6_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK All tests passed"
)
echo.

if /i "%RUN_TEST_COVERAGE%"=="1" (
  call :color_echo "%CYAN%" "[6b] Vitest coverage (RUN_TEST_COVERAGE=1)..."
  echo ----------------------------------------
  call :color_echo "%YELLOW%" "  Running: npm run test:coverage"
  call npm run test:coverage
  if errorlevel 1 (
    set /a WARNING_COUNT+=1
    set "SECTION6_COVERAGE_STATUS=WARNING"
    call :color_echo "%YELLOW%" "  Warning: Coverage run failed or below thresholds  -  fix when tightening quality gates"
  ) else (
    set "SECTION6_COVERAGE_STATUS=PASSED"
    call :color_echo "%GREEN%" "  OK Coverage run completed"
  )
  echo.
) else (
  call :color_echo "%BLUE%" "[6b] Coverage skipped (set RUN_TEST_COVERAGE=1 to run npm run test:coverage)"
  echo.
)

if /i "%SKIP_BEST_PRACTICES%"=="1" (
  call :color_echo "%YELLOW%" "[7/10] Best practices skipped (SKIP_BEST_PRACTICES=1)"
  set "SECTION7_STATUS=SKIPPED"
  echo.
) else (
  call :color_echo "%CYAN%" "[7/10] Next.js best-practices checklist..."
  echo ----------------------------------------
  call :color_echo "%BLUE%" "  ~86 scored checks (default threshold 80%%). Output: reports\check_report_*.json"
  call :color_echo "%BLUE%" "  Config: .next-checker-config.json  -  env BEST_PRACTICES_THRESHOLD, BEST_PRACTICES_FORMAT, BEST_PRACTICES_NO_FAIL"
  if exist "scripts\check-best-practices.mjs" (
    set "BP_ARGS="
    if not "!BEST_PRACTICES_THRESHOLD!"=="" set "BP_ARGS=!BP_ARGS! --threshold !BEST_PRACTICES_THRESHOLD!"
    if /i "!BEST_PRACTICES_FORMAT!"=="text" set "BP_ARGS=!BP_ARGS! --format text"
    if /i "!BEST_PRACTICES_FORMAT!"=="json" set "BP_ARGS=!BP_ARGS! --format json"
    if /i "!BEST_PRACTICES_FORMAT!"=="both" set "BP_ARGS=!BP_ARGS! --format both"
    if /i "%BEST_PRACTICES_NO_FAIL%"=="1" (
      call :color_echo "%YELLOW%" "  Running: node scripts\check-best-practices.mjs --no-fail !BP_ARGS! (advisory)"
      call node scripts\check-best-practices.mjs --no-fail !BP_ARGS!
    ) else (
      call :color_echo "%YELLOW%" "  Running: node scripts\check-best-practices.mjs !BP_ARGS!"
      call node scripts\check-best-practices.mjs !BP_ARGS!
    )
    if errorlevel 1 (
      set /a ERROR_COUNT+=1
      set "SECTION7_STATUS=FAILED"
      call :color_echo "%RED%" "  X Best-practices score below threshold or script error"
    ) else (
      set "SECTION7_STATUS=PASSED"
      call :color_echo "%GREEN%" "  OK Best-practices check passed"
    )
  ) else (
    set /a WARNING_COUNT+=1
    set "SECTION7_STATUS=WARNING"
    call :color_echo "%YELLOW%" "  ! scripts\check-best-practices.mjs not found"
  )
  echo.
)

if /i "%SKIP_FINAL_FORMAT%"=="1" (
  call :color_echo "%YELLOW%" "[8/10] Final format skipped (SKIP_FINAL_FORMAT=1)"
  set "SECTION8_STATUS=SKIPPED"
  echo.
) else (
  call :color_echo "%CYAN%" "[8/10] Final format verification (Prettier via npm)..."
  echo ----------------------------------------
  call :color_echo "%YELLOW%" "  Running: npm run format"
  call npm run format
  if errorlevel 1 (
      set /a WARNING_COUNT+=1
      set "SECTION8_STATUS=WARNING"
  ) else (
      set "SECTION8_STATUS=PASSED"
      call :color_echo "%GREEN%" "  OK Final formatting applied"
  )
  echo.
)

call :color_echo "%CYAN%" "[9/10] Production build check..."
echo ----------------------------------------
call :color_echo "%YELLOW%" "  Running: npm run build"
call npm run build
if errorlevel 1 (
    set /a ERROR_COUNT+=1
    set "SECTION9_STATUS=FAILED"
    call :color_echo "%RED%" "  X Build failed"
) else (
    if exist ".next" (
        set "SECTION9_STATUS=PASSED"
        call :color_echo "%GREEN%" "  OK Build successful"
    ) else (
        set /a ERROR_COUNT+=1
        set "SECTION9_STATUS=FAILED"
        call :color_echo "%RED%" "  X .next directory not found"
    )
)
echo.

:summary
echo.
call :color_echo "%CYAN%" "========================================"
call :color_echo "%CYAN%" "  SUMMARY"
call :color_echo "%CYAN%" "========================================"
echo.
set "END_TIME=%TIME%"
call :color_echo "%BLUE%" "Section Status:"
echo   [0] CSS inventory:                  see reports\css-inventory.txt if not skipped
echo   [1] Cleanup and Preparation:        !SECTION1_STATUS!
echo   [2] GraphQL Codegen:                !SECTION2_STATUS!
echo   [3] Type Checking:                  !SECTION3_STATUS!
echo   [4] Prettier:                       !SECTION4_STATUS!
echo   [5] Linting:                        !SECTION5_STATUS!
echo   [6] Testing:                        !SECTION6_STATUS!
echo   [6b] Vitest coverage:               !SECTION6_COVERAGE_STATUS!
echo   [7] Best practices ~86 checks:      !SECTION7_STATUS!
echo   [8] Final Format:                   !SECTION8_STATUS!
echo   [9] Build Verification:             !SECTION9_STATUS!
echo.

if %ERROR_COUNT% EQU 0 (
    call :color_echo "%GREEN%" "  OK All checks passed!"
    if %WARNING_COUNT% GTR 0 call :color_echo "%YELLOW%" "  Found %WARNING_COUNT% warning(s)"
    echo.
    call :color_echo "%CYAN%" "  Start development server? (Y/N)"
    choice /C YN /N /M ""
    if errorlevel 2 goto :end
    if errorlevel 1 goto :dev_server
) else (
    call :color_echo "%RED%" "  X Found %ERROR_COUNT% error(s)"
    if %WARNING_COUNT% GTR 0 call :color_echo "%YELLOW%" "  Found %WARNING_COUNT% warning(s)"
    echo.
    call :color_echo "%YELLOW%" "  Please fix the errors before proceeding."
)
goto :end

:dev_server
echo.
call :color_echo "%CYAN%" "[10/10] Starting development server..."
call :color_echo "%BLUE%" "  Press Ctrl+C to stop the server"
call :color_echo "%BLUE%" "  If port 3000 is busy, set PORT=3001 (or another free port) before npm run dev."
echo.
call npm run dev

:end
echo.
call :color_echo "%CYAN%" "========================================"
call :color_echo "%CYAN%" "  CHECK COMPLETE"
call :color_echo "%CYAN%" "========================================"
echo.
if %ERROR_COUNT% GTR 0 (exit /b 1) else (exit /b 0)
