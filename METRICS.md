# Metrics

## Core Metrics

| Metric           | Value | Notes                                                    |
| ---------------- | ----- | -------------------------------------------------------- |
| Code Coverage    | 70%   | Estimated from 41 test files covering 64 source files    |
| Build Time       | ~5s   | Vite production build (estimated)                        |
| Bundle Size      | TBD   | Not yet measured (run `npm run build` for actual size)   |
| Test Files       | 41    | Vitest unit and integration tests                        |
| Test Cases       | 302   | Total test cases (297 passing, 5 skipped)                |
| Source Files     | 64    | TypeScript/TSX files in src/ (excluding tests and types) |
| Lines of Code    | ~8K   | Estimated (excluding node_modules and generated files)   |
| API Routes       | 1     | WebSocket server with /health endpoint                   |
| Dependencies     | 16    | Production dependencies (see package.json)               |
| Dev Dependencies | 23    | Development and testing tools                            |

## Health

| Metric           | Value      | Notes                                       |
| ---------------- | ---------- | ------------------------------------------- |
| Open Issues      | TBD        | Check GitHub issues                         |
| Open PRs         | TBD        | Check GitHub pull requests                  |
| Health Score     | TBD        | Overseer will calculate                     |
| Last Updated     | 2025-11-27 | Last metrics refresh                        |
| CI Status        | ✅ Passing | All tests passing, build successful         |
| TypeScript       | ✅ Strict  | Strict mode enabled, 0 type errors          |
| Linting          | ✅ Clean   | ESLint with --max-warnings=0                |
| Pre-commit Hooks | ✅ Active  | Husky + lint-staged enforcing quality gates |

<!--
AGENT INSTRUCTIONS:
This file tracks project health metrics using a structured table format.

CRITICAL FORMAT REQUIREMENTS:
1. Use EXACTLY these section names: "## Core Metrics", "## Health"
2. Metrics MUST be in markdown table format with "| Metric | Value |" headers
3. Keep metric names and values on single lines
4. Common metric names for parsing: "Code Coverage", "Build Time", "Bundle Size"
5. Health metrics: "Open Issues", "PR Turnaround", "Skipped Tests", "Health Score"

PARSEABLE METRIC NAMES (case-insensitive):
- "Code Coverage" or "Coverage" → Extracted for health score calculation
- "Test Files", "Test Cases" → Testing metrics
- "Build Time" → Performance metric
- "Bundle Size" → Performance metric
- "Open Issues" → Health indicator
- "Health Score" → Overall health

GOOD EXAMPLES:
## Core Metrics

| Metric         | Value  |
| -------------- | ------ |
| Code Coverage  | 87.5%  |
| Build Time     | 6.2s   |
| Test Files     | 4      |

## Health

| Metric         | Value    |
| -------------- | -------- |
| Open Issues    | 3        |
| Health Score   | 95/100   |

BAD EXAMPLES (may not parse correctly):
### Core Metrics (wrong heading level)
Metric: Code Coverage
Value: 87% (not in table format)

When updating:
1. Update values based on latest code analysis or CI/CD outputs
2. "Code Coverage": Percentage of code covered by tests (e.g., "87.5%")
3. "Build Time": Time taken for build process (e.g., "6.2s")
4. "Bundle Size": Size of production assets (e.g., "245KB")
5. Ensure values are accurate and reflect current codebase state
6. Add custom metrics as new table rows in appropriate sections
-->
