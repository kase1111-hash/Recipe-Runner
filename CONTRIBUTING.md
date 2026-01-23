# Contributing to Recipe Runner

Thank you for your interest in contributing to Recipe Runner! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Git

### Local Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Recipe-Runner.git
   cd Recipe-Runner
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint to check for code issues
- `npm run preview` - Preview the production build locally

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
1. Check existing issues to avoid duplicates
2. Use the bug report template when creating a new issue
3. Include steps to reproduce, expected behavior, and actual behavior
4. Add screenshots if applicable

### Suggesting Features

1. Check existing issues and the roadmap in `PHASES.md`
2. Use the feature request template
3. Explain the use case and why this feature would be valuable

### Submitting Pull Requests

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes:**
   - Run `npm run lint` to check for linting errors
   - Run `npm run build` to ensure TypeScript compiles
   - Test the feature manually in the browser

4. **Commit your changes:**
   - Write clear, descriptive commit messages
   - Reference related issues in your commits

5. **Push and create a Pull Request:**
   - Fill out the PR template completely
   - Link any related issues

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types in `src/types/index.ts`
- Avoid `any` type unless absolutely necessary

### React Components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Place components in appropriate directories under `src/components/`

### Styling

- Use inline styles for portability (no external CSS dependencies)
- Follow existing patterns in the codebase
- Support both light and dark themes

### File Organization

```
src/
├── components/     # React components organized by feature
│   ├── recipe/     # Recipe-related components
│   ├── step/       # Step execution components
│   ├── cookbook/   # Cookbook management
│   ├── common/     # Shared UI components
│   └── ...
├── contexts/       # React contexts
├── types/          # TypeScript type definitions
├── db/             # Database setup (Dexie/IndexedDB)
├── services/       # Business logic services
└── data/           # Sample/static data
```

## Development Priorities

See `PHASES.md` for the complete development roadmap. Current priorities:

1. Cookbook data structure - Multi-cookbook architecture
2. Recipe parser - AI-powered import from various formats
3. Visual generation integration - Connect step prompts to image generation
4. Offline support - Service worker + local persistence

## External Dependencies

### Optional: Ollama (for AI features)

Some features require [Ollama](https://ollama.ai/) for local AI processing:
- Chef Ollama AI assistant
- Recipe parsing from unstructured text
- Ingredient substitution suggestions

Install Ollama separately and ensure it's running on `http://localhost:11434`.

### Optional: Stable Diffusion WebUI (for image generation)

AI step visualization requires a local Stable Diffusion setup. See `install-sd-webui.bat` for Windows installation help.

## Questions?

If you have questions about contributing, feel free to open an issue with the "question" label.

## License

By contributing to Recipe Runner, you agree that your contributions will be licensed under the MIT License.
