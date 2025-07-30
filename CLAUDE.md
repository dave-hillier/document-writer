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

### CSS and Styling Guidelines

This project follows a **classless CSS approach** using Pico.css as the foundation:

- **Taxonomic Classes Only**: Use classes to describe what a component IS, not how it looks
  - ✅ Good: `className="query-tester"`, `className="document-editor"`, `className="secondary"`
  - ❌ Bad: `className="small"`, `className="spinning"`, `className="primary"` (when used for styling)
- **Semantic HTML First**: Use proper semantic elements as the primary structure
  - `<article>`, `<section>`, `<header>`, `<footer>`, `<nav>`, `<aside>`, `<fieldset>`
- **CSS Selector Strategy**: Target semantic elements within taxonomic contexts
  - ✅ Good: `.query-tester form fieldset`, `.document-editor section header`
  - ❌ Bad: `.search-form .search-options`, `.result-item .result-header`
- **No Embedded Styles**: Never use `<style>` blocks in components - all CSS goes in App.css
- **State via Data Attributes**: Use `data-*` attributes only for actual state, not styling
  - ✅ Good: `data-loading="true"`, `data-completed="true"`
  - ❌ Bad: `data-primary`, `data-small` (these are styling, not state)

### Accessibility Guidelines

- Use semantic HTML elements (`<main>`, `<article>`, `<section>`, `<nav>`, etc.)
- Provide proper ARIA labels and descriptions for interactive elements
- Include skip links for keyboard navigation
- Use `<dialog>` for modals with proper focus management
- Ensure all form inputs have associated labels
- Maintain proper heading hierarchy
- Prefer Pico.css default styles over custom classes.

## Development Guidelines

- Avoid using useMemo or useCallback unless you've benchmarked and confirmed a performance issue—unnecessary use often leads to worse performance and added complexity.
- Prefer Semantic HTML, use class names for taxonomy rather than styling (classless CSS approach), and include appropriate WCAG and ARIA attributes for accessibility.
- Prefer a functional style - avoid using classes.
- Do use reducers, prefer to use the useReducer hook over libraries
- When using a reducer, dispatch single events at a time to represent domain events/meaningful business events.
- Use an event-driven approach when it comes to reducers, focusing on past-tense events that have happened.
