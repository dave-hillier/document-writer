# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run lint      # Run ESLint
npm run dev       # Start development server at http://localhost:5173
npm run build     # TypeScript check + Vite production build
npm run preview   # Preview production build
```

## Architecture Overview

This is a React TypeScript application that generates structured documents using OpenAI's API through prompt chaining. The app follows a specific workflow:

1. **Document Configuration** → 2. **Outline Generation** → 3. **Section-by-Section Expansion** → 4. **Export**

### Core Architecture Patterns

- **State Management**: Uses `useReducer` pattern with a centralized reducer (`src/reducer.ts`) for all application state
- **API Integration**: OpenAI SDK is wrapped in a service class (`DocumentGenerator` in `src/services/openai.ts`)
- **Type Safety**: All imports use `import type` for TypeScript types due to `verbatimModuleSyntax: true` in tsconfig
- **Component Structure**: Presentational components receive callbacks and state as props from the main App component
- **Styling**: Uses Pico.css as a classless CSS framework with minimal custom styles for semantic HTML
- **Accessibility**: Implements WCAG patterns with semantic HTML, ARIA labels, and keyboard navigation

### Key Implementation Details

- **System Prompt**: The document generation logic relies on `src/system-prompt.md` which is imported as raw text using Vite's `?raw` import
- **Prompt Chaining**: Sections are generated sequentially, with each section receiving context from previously generated sections
- **Local Storage**: API keys are persisted in localStorage and loaded on app initialization
- **Export Format**: Documents are exported as Markdown files with proper heading structure

### TypeScript Configuration

The project uses strict TypeScript settings with `verbatimModuleSyntax` enabled, requiring:
- Use `import type` for all type-only imports
- No unused React imports (uses React's new JSX transform)

### Document Generation Flow

1. `DocumentConfig` component collects user requirements
2. `DocumentGenerator.generateOutline()` creates a JSON outline with sections
3. `DocumentGenerator.generateSection()` expands each section with 400-800 words
4. Each section generation includes all previous sections as context
5. Sections must be generated in order to maintain narrative consistency

### Accessibility Guidelines

- Use semantic HTML elements (`<main>`, `<article>`, `<section>`, `<nav>`, etc.)
- Provide proper ARIA labels and descriptions for interactive elements
- Include skip links for keyboard navigation
- Use `<dialog>` for modals with proper focus management
- Ensure all form inputs have associated labels
- Maintain proper heading hierarchy
- Prefer Pico.css default styles over custom classes.
