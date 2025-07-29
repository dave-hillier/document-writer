import { useReducer, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { appReducer, initialState } from './reducer';
import { SettingsModal } from './components/SettingsModal';
import { DocumentConfig } from './components/DocumentConfig';
import { DocumentEditor } from './components/DocumentEditor';
import { DocumentGenerator } from './services/openai';
import type { DocumentConfig as IDocumentConfig } from './types';
import './App.css';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const handleGenerateOutline = useCallback(async (config: IDocumentConfig, prompt: string) => {
    if (!state.apiKey) {
      dispatch({ type: 'SET_ERROR', payload: 'Please set your OpenAI API key in settings' });
      return;
    }

    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_DOCUMENT_CONFIG', payload: config });
    dispatch({ type: 'START_STREAMING' });

    const generator = new DocumentGenerator(state.apiKey);
    await generator.generateOutline(
      config,
      prompt,
      state.responseId,
      (chunk) => {
        dispatch({ type: 'APPEND_STREAM', payload: chunk });
      },
      (responseId, outline) => {
        dispatch({ type: 'SET_RESPONSE_ID', payload: responseId });
        dispatch({ type: 'SET_OUTLINE', payload: outline });
        dispatch({ type: 'FINISH_STREAMING' });
        dispatch({ type: 'SET_GENERATING', payload: false });
      },
      (error) => {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        dispatch({ type: 'FINISH_STREAMING' });
        dispatch({ type: 'SET_GENERATING', payload: false });
      }
    );
  }, [state.apiKey, state.responseId]);

  const handleGenerateSection = useCallback(async (sectionId: string) => {
    if (!state.outline || !state.apiKey) return;

    const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
    const section = state.sections[sectionIndex];
    if (!section) return;

    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'START_STREAMING' });

    const generator = new DocumentGenerator(state.apiKey);
    const previousSections = state.sections.slice(0, sectionIndex).filter(s => s.content);
    
    await generator.generateSection(
      section,
      state.documentConfig,
      state.outline,
      previousSections,
      state.responseId,
      (chunk) => {
        dispatch({ type: 'APPEND_STREAM', payload: chunk });
      },
      (responseId, content, wordCount) => {
        dispatch({ type: 'SET_RESPONSE_ID', payload: responseId });
        dispatch({ 
          type: 'UPDATE_SECTION', 
          payload: { id: sectionId, content, wordCount } 
        });
        dispatch({ type: 'FINISH_STREAMING' });
        dispatch({ type: 'SET_GENERATING', payload: false });
      },
      (error) => {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        dispatch({ type: 'FINISH_STREAMING' });
        dispatch({ type: 'SET_GENERATING', payload: false });
      }
    );
  }, [state.apiKey, state.outline, state.sections, state.documentConfig, state.responseId]);

  const handleExport = useCallback(() => {
    if (!state.outline) return;

    const content = [
      `# ${state.outline.title}`,
      '',
      ...state.sections.map(section => [
        `## ${section.title}`,
        '',
        section.content || '[Section not generated]',
        ''
      ]).flat()
    ].join('\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.outline.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.outline, state.sections]);

  useEffect(() => {
    if (!state.apiKey && !state.isSettingsOpen) {
      dispatch({ type: 'TOGGLE_SETTINGS' });
    }
  }, [state.apiKey, state.isSettingsOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <div className="container">
          <nav aria-label="Main navigation">
            <ul>
              <li><h1>Document Writer</h1></li>
            </ul>
            <ul>
              <li>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
                  aria-label="Open settings"
                  data-tooltip="Settings"
                  className="contrast outline"
                >
                  <Settings size={24} aria-hidden="true" />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main-content" className="container" style={{ flex: 1 }}>
        {state.error && (
          <div role="alert" className="error-message" aria-live="assertive">
            {state.error}
          </div>
        )}

        {!state.outline ? (
          <section aria-labelledby="config-heading">
            <h2 id="config-heading" className="visually-hidden">Document Configuration</h2>
            <DocumentConfig
              config={state.documentConfig}
              onSubmit={handleGenerateOutline}
              isGenerating={state.isGenerating}
              isStreaming={state.isStreaming}
              streamingContent={state.streamingContent}
            />
          </section>
        ) : (
          <>
            <nav aria-label="Document actions">
              <button
                onClick={() => dispatch({ type: 'RESET_DOCUMENT' })}
                className="secondary"
              >
                ← Start New Document
              </button>
            </nav>
            
            <section aria-labelledby="editor-heading">
              <h2 id="editor-heading" className="visually-hidden">Document Editor</h2>
              <DocumentEditor
                outline={state.outline}
                sections={state.sections}
                isGenerating={state.isGenerating}
                isStreaming={state.isStreaming}
                streamingContent={state.streamingContent}
                onGenerateSection={handleGenerateSection}
                onExport={handleExport}
              />
            </section>
          </>
        )}
      </main>

      <SettingsModal
        isOpen={state.isSettingsOpen}
        apiKey={state.apiKey}
        onClose={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
        onSave={(key) => dispatch({ type: 'SET_API_KEY', payload: key })}
      />
    </>
  );
}

export default App;
