import { useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { Settings, History, FileText, Database } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AppProvider } from './contexts/AppContext';
import { useAppContext } from './contexts/useAppContext';
import { SettingsModal } from './components/SettingsModal';
import { DocumentConfig } from './components/DocumentConfig';
import { DocumentEditor } from './components/DocumentEditor';
import { DocumentHistory } from './components/DocumentHistory';
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { KnowledgeBaseDetails } from './components/KnowledgeBaseDetails';
import { generateOutline } from './business/documentOperations';
import { indexedDBService } from './services/indexeddb';
import { migrateModelSettings } from './utils/migration';
import type { DocumentConfig as IDocumentConfig, DocumentHistoryItem } from './types';
import './App.css';

function HomePage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

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
      
      // Generate document ID and navigate to document URL
      const documentId = uuidv4();
      dispatch({ type: 'DOCUMENT_ID_ASSIGNED', payload: { documentId } });
      dispatch({ type: 'OUTLINE_GENERATED', payload: result });
      
      // Save to IndexedDB
      const documentItem: DocumentHistoryItem = {
        id: documentId,
        title: result.outline.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config,
        outline: result.outline,
        sections: result.outline.sections.map(s => ({ ...s, content: '', wordCount: 0 })),
        url: `/document/${documentId}`
      };
      
      try {
        await indexedDBService.saveDocument(documentItem);
        dispatch({ type: 'DOCUMENT_SAVED_TO_HISTORY', payload: { document: documentItem } });
      } catch (error) {
        console.error('Failed to save document to IndexedDB:', error);
      }
      
      navigate(`/document/${documentId}`);
    } catch (error) {
      dispatch({ 
        type: 'OUTLINE_GENERATION_FAILED', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  return (
    <section aria-label="Document Configuration">
      <DocumentConfig onSubmit={handleGenerateOutline} />
    </section>
  );
}

function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) return;
      
      try {
        const document = await indexedDBService.getDocument(documentId);
        if (document) {
          dispatch({ type: 'DOCUMENT_LOADED_FROM_HISTORY', payload: { document } });
        } else {
          // Document not found, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        navigate('/');
      }
    };

    if (documentId && (!state.currentDocumentId || state.currentDocumentId !== documentId)) {
      loadDocument();
    }
  }, [documentId, state.currentDocumentId, dispatch, navigate]);

  if (!state.outline) {
    return <section>Loading document...</section>;
  }

  return (
    <>
      <nav aria-label="Document actions">
        <button
          onClick={() => {
            dispatch({ type: 'RESET_DOCUMENT' });
            navigate('/');
          }}
          data-variant="secondary"
        >
          ← Start New Document
        </button>
      </nav>
      
      <section aria-label="Document Editor">
        <DocumentEditor />
      </section>
    </>
  );
}

function AppContent() {
  const { state, dispatch } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey && !isSettingsOpen) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    // Initialize database and load document history on app start
    const initializeApp = async () => {
      try {
        // Run migrations
        migrateModelSettings();
        
        // Ensure database is initialized
        await indexedDBService.init();
        console.log('Database initialized successfully');
        
        // Load document history
        const documents = await indexedDBService.getAllDocuments();
        dispatch({ type: 'HISTORY_LOADED', payload: { documents } });
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [dispatch]);

  return (
    <>
      <a href="#main-content" data-skip-link>Skip to main content</a>
      <header data-app-header className="container">
        <nav aria-label="Main navigation">
          <ul>
            <li><h1>Document Writer</h1></li>
          </ul>
          <ul>
            <li>
              <Link to="/knowledge-bases" aria-label="Knowledge bases" data-tooltip="Knowledge Bases">
                <Database size={24} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link to="/history" aria-label="Document history" data-tooltip="History">
                <History size={24} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link to="/" aria-label="New document" data-tooltip="New Document">
                <FileText size={24} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open settings"
                data-tooltip="Settings"
                data-variant="contrast"
                data-outline
              >
                <Settings size={24} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content" className="container" data-flex>
        {state.error && (
          <section role="alert" aria-live="assertive">
            {state.error}
          </section>
        )}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/document/:documentId" element={<DocumentPage />} />
          <Route path="/history" element={<DocumentHistory />} />
          <Route path="/knowledge-bases" element={<KnowledgeBaseManager />} />
          <Route path="/knowledge-bases/:knowledgeBaseId" element={<KnowledgeBaseDetails />} />
        </Routes>
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
