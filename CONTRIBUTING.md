# Contributing to DARKMOON

Thank you for your interest in contributing to DARKMOON! This guide will help you get started with development, testing, and deployment.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone git@github.com:nitsuah/darkmoon.git
cd darkmoon

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:4444`.

## 💻 Development Workflow

### Available Scripts

| Script                 | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Start development server with hot reload                 |
| `npm run build`        | Build for production                                     |
| `npm start`            | Start production server                                  |
| `npm run lint`         | Lint code with ESLint (auto-fix enabled)                 |
| `npm run format`       | Format code with Prettier                                |
| `npm run format:check` | Check code formatting                                    |
| `npm run typecheck`    | Run TypeScript type checking                             |
| `npm test`             | Run test suite with Vitest                               |
| `npm run test:ci`      | Run tests with coverage for CI                           |
| `npm run ci`           | Run all CI checks locally (typecheck, lint, test, build) |

### Pre-commit Hooks

This project uses Husky and lint-staged to enforce code quality:

- Prettier formatting
- ESLint checks (with `--max-warnings=0`)
- TypeScript type checking

Hooks run automatically on commit. To bypass (not recommended):

```bash
git commit --no-verify
```

### Manual CI Check

Before pushing, you can run the full CI pipeline locally:

```bash
# PowerShell (Windows)
.\scripts\ci-check.ps1

# Bash (Linux/Mac)
./scripts/ci-check.sh
```

## 🎨 Code Quality

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Formatting**: Prettier with 4-space indentation (see `.prettierrc`)
- **Linting**: ESLint with React, TypeScript, and a11y rules

### Project Structure

```bash
darkmoon/
├── .github/              # GitHub Actions CI/CD workflows
├── .husky/               # Git hooks (pre-commit, pre-push)
├── config/               # Configuration files (ESLint, Prettier, Vitest)
├── docs/                 # Documentation
├── scripts/              # Developer utility scripts
├── server/               # WebSocket server code
├── src/
│   ├── __tests__/        # Test files
│   ├── assets/           # Static assets
│   ├── components/       # Reusable React components
│   │   ├── characters/   # Character components (Player, Bot)
│   │   ├── CollisionSystem.ts
│   │   ├── GameManager.ts
│   │   └── ...
│   ├── contexts/         # React contexts (Theme, etc.)
│   ├── lib/              # Utilities and constants
│   ├── pages/            # Main application pages
│   │   ├── App.tsx       # Root component with routing
│   │   ├── Home.tsx      # Landing page
│   │   ├── Lobby.tsx     # Multiplayer lobby
│   │   └── Solo.tsx      # Single-player mode
│   ├── styles/           # CSS stylesheets
│   ├── types/            # TypeScript type definitions
│   └── index.tsx         # Application entry point
├── develop.js            # Development server with Vite
├── server.js             # Production server with Socket.io
├── netlify.toml          # Netlify deployment configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.js        # Vite build configuration
```

## 🧪 Testing

### Running Tests

```bash
# Run test suite in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci

# Generate coverage report
npm test -- --coverage
```

### Writing Tests

- Place test files in `src/__tests__/`
- Use Vitest and React Testing Library
- Follow existing test patterns in the codebase
- Aim for meaningful test coverage, not 100%

### Vitest (CI) and Windows / CI stability

We run tests in-process to avoid intermittent worker IPC crashes (EPIPE / ERR_IPC_CHANNEL_CLOSED) that can occur on some CI runners and Windows/node combinations. The project exposes a stable programmatic runner at:

```
node ./scripts/run-tests-inprocess.js
```

Use the npm helper for CI:

```
npm run test:ci
```

This script runs the programmatic (in-process) Vitest runner with the repository's `config/vitest.config.ts` and produces coverage. Prefer this in CI and for pre-push checks.

### jest-dom matcher registration

The repository registers the vitest-compatible jest-dom entry in `config/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Do not import `@testing-library/jest-dom` directly inside test files — it targets Jest and can run before Vitest sets up globals, which causes errors like `ReferenceError: expect is not defined`. ESLint enforces this rule via `no-restricted-imports`.

If you hit test ordering or `expect` errors locally, run:

```powershell
# Windows (PowerShell)
npm run test:ci

# Linux/macOS
npm run test:ci
```

If problems persist, try clearing caches and re-running:

```
npm test -- --clearCache
rm -rf node_modules/.cache
```

## 🚢 Deployment

### Environment Variables

#### Frontend (Netlify)

Add in Netlify dashboard (Site settings → Environment variables):

```bash
# WebSocket Server URL (optional)
VITE_SOCKET_SERVER_URL=https://your-websocket-server.com

# Or leave empty to use the same domain as frontend
```

#### WebSocket Server

For Node.js server deployment:

```bash
# Server Port
PORT=4444

# Allowed CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://darkmoon.dev,https://deploy-preview-*--darkmoon.netlify.app
```

### Netlify Deployment

This project auto-deploys to Netlify:

1. **Build Settings:**

   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18.x or higher

2. **Configuration:**
   - See `netlify.toml` for SPA routing and headers

### WebSocket Server Deployment

Deploy `server.js` to platforms like:

- **Render.com** (recommended for WebSockets)
- **Railway.app**
- **Fly.io**

**Required settings:**

- Start command: `npm start`
- Port: Set by platform (default 4444)
- Environment: Add `ALLOWED_ORIGINS` with your Netlify URL

### Health Check

The server exposes a `/health` endpoint:

```json
{
  "status": "ok",
  "timestamp": "2025-11-02T...",
  "connections": 0
}
```

Use this for monitoring and uptime checks.

## 🔧 Troubleshooting

### WebSocket Connection Failed

**Symptoms:** "Disconnected - Reconnecting..." message

**Solutions:**

1. Check server is running: `curl https://your-server.com/health`
2. Verify CORS origins include your Netlify URL
3. Check browser console for specific errors
4. Ensure server supports WebSocket upgrades (not just HTTP)

### CORS Errors

**Symptoms:** Browser blocks requests with CORS error

**Solutions:**

1. Add Netlify URL to `ALLOWED_ORIGINS` on server
2. Use wildcard for preview deploys: `https://deploy-preview-*--darkmoon.netlify.app`
3. Restart server after changing environment variables

### Build Failures

**Symptoms:** Build fails locally or in CI

**Solutions:**

1. Check Node version is 18.x or higher
2. Run `npm install` to verify dependencies
3. Check build logs for specific errors
4. Ensure all required files are committed to git
5. Run `npm run ci` locally to reproduce CI checks

### Test Failures

**Symptoms:** Tests fail in CI but pass locally

**Solutions:**

1. Run `npm run test:ci` locally
2. Check for timing issues or environment-specific code
3. Ensure all mocks are properly configured
4. Clear test cache: `npm test -- --clearCache`

### Coverage Issues

**Symptoms:** Coverage report fails with ENOENT error

**Solutions:**

1. Clean coverage directory: `rm -rf coverage`
2. Run tests again: `npm run test:ci`
3. Check `.gitignore` doesn't block coverage files

## 🤝 Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run local checks: `npm run ci`
5. Commit your changes (pre-commit hooks will run automatically)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### PR Checklist

Before submitting your PR, ensure:

- ✅ All tests pass (`npm test`)
- ✅ Code is linted (`npm run lint`)
- ✅ Types are valid (`npm run typecheck`)
- ✅ Build succeeds (`npm run build`)
- ✅ Changes are documented (if needed)
- ✅ Commits follow conventional commit format

## 📚 Additional Resources

- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)

## 📝 License

MIT © 2025 Nitsuah Labs

---

For questions or issues, please open an issue on GitHub or reach out to the maintainers.
