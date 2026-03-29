# DARKMOON.DEV

[![CI](https://github.com/nitsuah/darkmoon/actions/workflows/ci.yml/badge.svg)](https://github.com/nitsuah/darkmoon/actions)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2ae05c81-761a-4d3a-91ac-dcd5980d48d3/deploy-status)](https://app.netlify.com/projects/darkmoon-dev/deploys)

> Solo-live 3D browser tag game built with React 19, Three Fiber, Socket.io, and Vite. **Solo mode is the live experience; multiplayer is planned.**


**Live Demo:** [darkmoon.dev](https://darkmoon.dev)

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): App boundaries, deployment, and contracts
- [API.md](API.md): HTTP and WebSocket interface reference

## ✨ Features

- `[shipped]` **Solo Mode with AI Bots** — Practice against intelligent bot opponents on the live site.
- `[in-progress]` **Multiplayer 3D Gameplay** — Multiplayer foundations exist, but the deployed experience is still solo-first.
- `[shipped]` **WebSocket Server Foundation** — Socket.io and server validation are in place for future live modes.
- `[in-progress]` **Mobile Support** — Responsive layout and touch controls exist, but device validation is still open.
- `[shipped]` **Modern Tooling** — Vite, Vitest, ESLint, Prettier, TypeScript, and CI are wired into the repo.

## 🚀 Quick Start

```bash
# Clone the repository
git clone git@github.com:nitsuah/darkmoon.git
cd darkmoon

# Install dependencies
npm install


# Start development server
npm run dev
```

Visit `http://localhost:4444` to play locally. **Solo mode is the only live experience; multiplayer is not yet available.**

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development workflow and available scripts
- Code quality standards and testing guidelines
- Deployment and troubleshooting tips

---

**Docker Production Build**

To build and run the production container:

```bash
docker build -t darkmoon-prod .
docker run --rm -p 4444:4444 darkmoon-prod
```

The app will be available at [http://localhost:4444](http://localhost:4444). Healthcheck: `GET /health`.
- Pull request process

## 📝 License

MIT © 2025 Nitsuah Labs

---

**Original boilerplate:** [R3F.Multiplayer](https://github.com/juniorxsound/R3F.Multiplayer) by [@juniorxsound](https://github.com/juniorxsound)
