import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { AppProvider } from './contexts/AppContext';
import { useAppContext } from './contexts/useAppContext';
import { SettingsModal } from './components/SettingsModal';
import { DocumentConfig } from './components/DocumentConfig';
import { DocumentEditor } from './components/DocumentEditor';
import { generateOutline } from './business/documentOperations';
import type { DocumentConfig as IDocumentConfig } from './types';
import './App.css';

function AppContent() {
  const { state, dispatch } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleGenerateOutline = async (config: IDocumentConfig, prompt: string) => {
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
  };


  useEffect(() => {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey && !isSettingsOpen) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsOpen]);


  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header container">
        <nav aria-label="Main navigation">
          <ul>
            <li><h1>Document Writer</h1></li>
          </ul>
          <ul>
            <li>
              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open settings"
                data-tooltip="Settings"
                className="contrast outline"
              >
                <Settings size={24} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content" className="container" style={{ flex: 1 }}>
        {state.error && (
          <div role="alert" aria-live="assertive">
            {state.error}
          </div>
        )}

        {!state.outline ? (
          <section aria-labelledby="config-heading">
            <h2 id="config-heading" className="visually-hidden">Document Configuration</h2>
            <DocumentConfig
              onSubmit={handleGenerateOutline}
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
              <DocumentEditor />
            </section>
          </>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
