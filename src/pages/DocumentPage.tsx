import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/useAppContext';
import { DocumentEditor } from '../components/document/DocumentEditor';
import { DocumentPreview } from '../components/document/DocumentPreview';
import { indexedDBService } from '../services/indexeddb';
import type { DocumentHistoryItem } from '../types';

export function DocumentPage() {
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

  const currentDocument: DocumentHistoryItem | null = state.currentDocumentId && state.outline ? {
    id: state.currentDocumentId,
    title: state.outline.title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    config: state.documentConfig,
    outline: state.outline,
    sections: state.sections,
    url: `/document/${state.currentDocumentId}`
  } : null;

  return (
    <>
      <nav aria-label="Document actions">
        <button
          onClick={() => {
            dispatch({ type: 'RESET_DOCUMENT' });
            navigate('/');
          }}
          className="secondary"
        >
          ← Start New Document
        </button>
      </nav>
      
      <section aria-label="Document Editor">
        <DocumentEditor />
      </section>

      {currentDocument && (
        <DocumentPreview
          document={currentDocument}
          isOpen={state.showDocumentPreview}
          onClose={() => dispatch({ type: 'DOCUMENT_PREVIEW_CLOSED' })}
          context="editor"
        />
      )}
    </>
  );
}