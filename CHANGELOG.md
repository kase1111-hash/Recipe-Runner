# Changelog

All notable changes to Recipe Runner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Recipe labels and cookbook organization features
- Meal planning functionality
- Inventory management system
- Side dish suggestions
- Recipe scaling capabilities
- Dietary adaptation services
- Cost estimation features
- Nutrition tracking
- Export and sharing functionality

### Fixed
- Image generation now uses placeholder mode as default
- TypeScript compilation errors causing blank page resolved

## [0.1.0] - 2026-01-XX

### Added
- Initial release of Recipe Runner
- Single-step recipe execution interface
- Grocery checklist with completion gate
- Recipe selection with metadata display
- Step-by-step cooking mode with:
  - One step per screen display
  - Time estimates with active/passive indicators
  - Optional tips display
  - Temperature cards for food safety
  - Linear navigation (previous/next)
  - Progress indicator
- Dark mode support
- Keyboard shortcuts for navigation
- Multi-cookbook architecture (Cookbooks, Bookshelves)
- IndexedDB persistence with Dexie.js
- Sample cookbook with example recipes
- PDF import capability
- OCR support via Tesseract.js
- Chef Ollama AI assistant integration (requires local Ollama)
- AI-powered recipe parsing
- Visual generation service for step images (requires Stable Diffusion)

### Technical
- React 19 with functional components and hooks
- TypeScript for type safety
- Vite for fast development and builds
- Comprehensive type system for recipes, cookbooks, and sessions
