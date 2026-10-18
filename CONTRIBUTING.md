# Contributing to SpecForge Studio

Thank you for your interest in contributing to **SpecForge Studio**!

SpecForge is a local-first API client, `.har` network trace interceptor, and deterministic Claude MCP / TypeScript SDK compiler.

## Development Setup

### Prerequisites
- **Node.js**: `20.x` or `22.x` (LTS recommended)
- **npm**: `10.x` or higher

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/NeuralithDev/SpecForge.git
cd SpecForge

# 2. Install dependencies
npm install

# 3. Start the Next.js local development server
npm run dev:web
```

The studio will be available at `http://localhost:3000` (or `http://localhost:3001`).

## Running Tests

Before submitting a Pull Request, ensure that all test suites and type checks pass:

```bash
# Run unit and feature tests
npm test

# Run Next.js production build check
npm run build:web
```

## Pull Request Guidelines

1. **Focus**: Keep Pull Requests focused on a single bug fix, feature, or enhancement.
2. **Deterministic & Local-First**: Preserve local-first architecture. Any new features must respect user privacy, offline execution, and zero mandatory cloud sync.
3. **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add GraphQL query parser`, `fix: handle binary multipart responses`).

Thank you for helping make API engineering deterministic for developers and AI agents!
