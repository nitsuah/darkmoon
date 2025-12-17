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
| Dependencies     | 9     | Production dependencies (see package.json)               |
| Dev Dependencies | 22    | Development and testing tools                            |

## Health

| Metric           | Value      | Notes                                       |
| ---------------- | ---------- | ------------------------------------------- |
| Open Issues      | TBD        | Check GitHub issues                         |
| Open PRs         | TBD        | Check GitHub pull requests                  |
| Health Score     | TBD        | Overseer will calculate                     |
| Last Updated     | 2025-12-17 | Last metrics refresh                        |
| CI Status        | ✅ Passing | All tests passing, build successful         |
| TypeScript       | ✅ Strict  | Strict mode enabled, 0 type errors          |
| Linting          | ✅ Clean   | ESLint with --max-warnings=0                |
| Pre-commit Hooks | ✅ Active  | Husky + lint-staged enforcing quality gates |
