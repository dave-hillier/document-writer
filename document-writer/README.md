# Document Writer

A React TypeScript application that uses OpenAI's API to generate structured documents through prompt chaining. The app helps users create comprehensive documents by first generating an outline, then expanding each section into 400-800 word chunks while maintaining consistency and following specified guidelines.

## Features

- **AI-Powered Document Generation**: Uses OpenAI's GPT-4 to generate document outlines and expand sections
- **Prompt Chaining**: Generates documents section by section, maintaining context throughout
- **Customizable Document Configuration**:
  - Tone selection (professional, casual, academic, creative, technical)
  - Allowed and denied narrative elements
  - Target word count
- **Section-by-Section Generation**: Each section is generated based on its role and sub-steps
- **Export Functionality**: Export completed documents as Markdown files
- **Secure API Key Storage**: API keys are stored locally in browser storage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- An OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Configuration

1. Click the settings icon in the top right
2. Enter your OpenAI API key
3. The key will be stored securely in your browser's local storage

## Usage

1. **Configure Your Document**:
   - Enter a description of the document you want to create
   - Select the tone for your document
   - Add allowed narrative elements (e.g., examples, statistics, case studies)
   - Add denied narrative elements (e.g., personal opinions, speculation)
   - Set your target word count

2. **Generate Outline**:
   - Click "Generate Outline" to create a structured outline
   - The AI will create 4-8 sections, each with a specific role and sub-steps

3. **Expand Sections**:
   - Click "Generate Section" for each section to expand it
   - Sections must be generated in order to maintain context
   - Each section will be 400-800 words

4. **Export Document**:
   - Once all sections are complete, click "Export Document"
   - The document will be downloaded as a Markdown file

## Project Structure

```
src/
├── components/           # React components
│   ├── DocumentConfig.tsx    # Document configuration form
│   ├── DocumentEditor.tsx    # Document outline and section editor
│   └── SettingsModal.tsx     # API key settings modal
├── services/             # External services
│   └── openai.ts            # OpenAI API integration
├── types.ts              # TypeScript type definitions
├── reducer.ts            # State management with useReducer
├── system-prompt.md      # System prompt for document generation
└── App.tsx               # Main application component
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Technologies Used

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **OpenAI API** - Document generation
- **Lucide React** - Icons
