# Workflow: Verification & Quality Assurance

Follow this verification workflow prior to reporting completion on any code changes.

> [!IMPORTANT]
> **Pre-requisite Check**: `package.json` must be present in the workspace before npm scripts can be executed. Always verify script existence before running commands. If a script or `package.json` does not exist, explicitly report that the check could not be run rather than claiming it passed.

---

## Verification Pipeline

Execute each check sequentially and inspect actual console outputs.

### 1. TypeScript Strict Typecheck
Verifies that no type errors, implicit `any`, or invalid type assertions exist:
```bash
npm run typecheck
# or: npx tsc --noEmit
```
*Pass Criteria*: Zero errors reported; exit code 0.

### 2. Code Linting & Formatting
Checks for unused imports, styling issues, and React hook dependencies:
```bash
npm run lint
```
*Pass Criteria*: Zero linter errors or unhandled warnings; exit code 0.

### 3. Unit & Integration Tests
Runs test suite via Vitest covering pure domain logic (`src/lib/planner.ts`, `src/lib/streaks.ts`, `src/lib/dates.ts`, Zod schemas):
```bash
npm test
# or: npx vitest run
```
*Pass Criteria*: All test suites passing (100% green); exit code 0.

### 4. Production Build Validation
Verifies that Server and Client component bundling, dynamic route generation, and Next.js optimization succeed:
```bash
npm run build
```
*Pass Criteria*: Production bundle compiles without build-time errors; exit code 0.

### 5. Playwright End-to-End Tests
Executes browser regression specs covering authentication, onboarding, workout player execution, and calendar history:
```bash
npx playwright test
```
*Pass Criteria*: All E2E scenarios pass; exit code 0.

---

## Reporting Standards
When completing work, report verification results using this structure:
- **Checks Executed**: Explicit list of commands invoked.
- **Actual Results**: Real exit codes and summary output (e.g. `Tests: 14 passed, 14 total`).
- **Skipped / Unrun Checks**: Any checks that could not be run (e.g. due to missing dependencies or uninitialized `package.json`), with clear justification.
