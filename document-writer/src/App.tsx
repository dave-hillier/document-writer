import { useReducer, useCallback, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { appReducer, initialState } from './reducer';
import { SettingsModal } from './components/SettingsModal';
import { DocumentConfig } from './components/DocumentConfig';
import { DocumentEditor } from './components/DocumentEditor';
import { generateOutline, generateSection, generateAllSections } from './business/documentOperations';
import type { DocumentConfig as IDocumentConfig } from './types';
import './App.css';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const bulkGenerationStoppedRef = useRef(false);

  const handleGenerateOutline = useCallback(async (config: IDocumentConfig, prompt: string) => {
    dispatch({ type: 'OUTLINE_GENERATION_STARTED', payload: { config } });

    try {
      const result = await generateOutline(
        {
          config,
          prompt,
          responseId: state.responseId
        },
        {
          onChunk: (chunk) => {
            dispatch({ type: 'OUTLINE_CONTENT_STREAMED', payload: chunk });
          }
        }
      );
      
      dispatch({ type: 'OUTLINE_GENERATED', payload: result });
    } catch (error) {
      dispatch({ 
        type: 'OUTLINE_GENERATION_FAILED', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, [state.responseId]);

  const handleGenerateSection = useCallback(async (sectionId: string) => {
    if (!state.outline) return;

    dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });

    try {
      const result = await generateSection(
        {
          sectionId,
          outline: state.outline,
          sections: state.sections,
          documentConfig: state.documentConfig,
          responseId: state.responseId
        },
        {
          onChunk: (chunk) => {
            dispatch({ type: 'SECTION_CONTENT_STREAMED', payload: chunk });
          }
        }
      );
      
      dispatch({ type: 'SECTION_GENERATED', payload: result });
    } catch (error) {
      dispatch({ 
        type: 'SECTION_GENERATION_FAILED', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, [state.outline, state.sections, state.documentConfig, state.responseId]);

  const handleGenerateAllSections = useCallback(async () => {
    if (!state.outline) return;

    const incompleteSections = state.sections.filter(s => !s.content);
    if (incompleteSections.length === 0) return;

    bulkGenerationStoppedRef.current = false;
    dispatch({ type: 'BULK_GENERATION_STARTED' });

    try {
      await generateAllSections(
        {
          outline: state.outline,
          sections: state.sections,
          documentConfig: state.documentConfig,
          responseId: state.responseId,
          onSectionStart: (sectionIndex) => {
            dispatch({ type: 'BULK_SECTION_STARTED', payload: { sectionIndex } });
          },
          shouldStop: () => bulkGenerationStoppedRef.current
        },
        {
          onChunk: (chunk) => {
            dispatch({ type: 'SECTION_CONTENT_STREAMED', payload: chunk });
          },
          onSectionGenerated: (result) => {
            dispatch({ type: 'SECTION_GENERATED', payload: result });
          },
          onSectionStarted: (sectionId) => {
            dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });
          }
        }
      );

      if (bulkGenerationStoppedRef.current) {
        dispatch({ type: 'BULK_GENERATION_STOPPED' });
      } else {
        dispatch({ type: 'BULK_GENERATION_COMPLETED' });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Generation stopped by user') {
        dispatch({ type: 'BULK_GENERATION_STOPPED' });
      } else {
        dispatch({ 
          type: 'BULK_GENERATION_FAILED', 
          payload: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  }, [state.outline, state.sections, state.documentConfig, state.responseId]);

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
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey && !state.isSettingsOpen) {
      dispatch({ type: 'TOGGLE_SETTINGS' });
    }
  }, [state.isSettingsOpen]);

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
        onClose={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
      />
    </>
  );
}

export default App;
