import { useReducer, useCallback, useEffect, useRef } from 'react';
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
  const bulkGenerationStoppedRef = useRef(false);

  const handleGenerateOutline = useCallback(async (config: IDocumentConfig, prompt: string) => {
    if (!state.apiKey) {
      dispatch({ type: 'OUTLINE_GENERATION_FAILED', payload: 'Please set your OpenAI API key in settings' });
      return;
    }

    dispatch({ type: 'OUTLINE_GENERATION_STARTED', payload: { config } });

    const generator = new DocumentGenerator(state.apiKey);
    await generator.generateOutline(
      config,
      prompt,
      state.responseId,
      (chunk) => {
        dispatch({ type: 'OUTLINE_CONTENT_STREAMED', payload: chunk });
      },
      (responseId, outline) => {
        dispatch({ type: 'OUTLINE_GENERATED', payload: { responseId, outline } });
      },
      (error) => {
        dispatch({ type: 'OUTLINE_GENERATION_FAILED', payload: error.message });
      }
    );
  }, [state.apiKey, state.responseId]);

  const handleGenerateSection = useCallback(async (sectionId: string) => {
    if (!state.outline || !state.apiKey) return;

    const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
    const section = state.sections[sectionIndex];
    if (!section) return;

    dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });

    const generator = new DocumentGenerator(state.apiKey);
    const previousSections = state.sections.slice(0, sectionIndex).filter(s => s.content);
    
    await generator.generateSection(
      section,
      state.documentConfig,
      state.outline,
      previousSections,
      state.responseId,
      (chunk) => {
        dispatch({ type: 'SECTION_CONTENT_STREAMED', payload: chunk });
      },
      (responseId, content, wordCount) => {
        dispatch({ type: 'SECTION_GENERATED', payload: { responseId, sectionId, content, wordCount } });
      },
      (error) => {
        dispatch({ type: 'SECTION_GENERATION_FAILED', payload: error.message });
      }
    );
  }, [state.apiKey, state.outline, state.sections, state.documentConfig, state.responseId]);

  const handleGenerateAllSections = useCallback(async () => {
    if (!state.outline || !state.apiKey) return;

    const incompleteSections = state.sections.filter(s => !s.content);
    if (incompleteSections.length === 0) return;

    bulkGenerationStoppedRef.current = false;
    dispatch({ type: 'BULK_GENERATION_STARTED' });

    const generateSectionPromise = (sectionId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!state.outline || !state.apiKey) {
          reject(new Error('Missing outline or API key'));
          return;
        }

        const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
        const section = state.sections[sectionIndex];
        if (!section) {
          reject(new Error('Section not found'));
          return;
        }

        dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });

        const generator = new DocumentGenerator(state.apiKey);
        const previousSections = state.sections.slice(0, sectionIndex).filter(s => s.content);
        
        generator.generateSection(
          section,
          state.documentConfig,
          state.outline,
          previousSections,
          state.responseId,
          (chunk) => {
            dispatch({ type: 'SECTION_CONTENT_STREAMED', payload: chunk });
          },
          (responseId, content, wordCount) => {
            dispatch({ type: 'SECTION_GENERATED', payload: { responseId, sectionId, content, wordCount } });
            resolve();
          },
          (error) => {
            dispatch({ type: 'SECTION_GENERATION_FAILED', payload: error.message });
            reject(error);
          }
        );
      });
    };

    try {
      for (let i = 0; i < state.sections.length; i++) {
        const section = state.sections[i];
        
        if (bulkGenerationStoppedRef.current) {
          dispatch({ type: 'BULK_GENERATION_STOPPED' });
          return;
        }

        if (section.content) continue;

        dispatch({ type: 'BULK_SECTION_STARTED', payload: { sectionIndex: i } });

        await generateSectionPromise(section.id);
        
        // Check again after generation completes
        if (bulkGenerationStoppedRef.current) {
          dispatch({ type: 'BULK_GENERATION_STOPPED' });
          return;
        }
      }

      dispatch({ type: 'BULK_GENERATION_COMPLETED' });
    } catch (error) {
      dispatch({ 
        type: 'BULK_GENERATION_FAILED', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, [state.outline, state.apiKey, state.sections, state.documentConfig, state.responseId]);

  const handleStopBulkGeneration = useCallback(() => {
    bulkGenerationStoppedRef.current = true;
    dispatch({ type: 'BULK_GENERATION_STOPPED' });
  }, []);

  const handleRetryBulkGeneration = useCallback(() => {
    handleGenerateAllSections();
  }, [handleGenerateAllSections]);

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

  useEffect(() => {
    bulkGenerationStoppedRef.current = state.bulkGenerationStopped;
  }, [state.bulkGenerationStopped]);

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
                isBulkGenerating={state.isBulkGenerating}
                currentBulkSectionIndex={state.currentBulkSectionIndex}
                bulkGenerationStopped={state.bulkGenerationStopped}
                bulkGenerationError={state.bulkGenerationError}
                onGenerateSection={handleGenerateSection}
                onGenerateAllSections={handleGenerateAllSections}
                onStopBulkGeneration={handleStopBulkGeneration}
                onRetryBulkGeneration={handleRetryBulkGeneration}
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
