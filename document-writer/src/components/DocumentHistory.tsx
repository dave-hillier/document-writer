import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Trash2 } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import { indexedDBService } from '../services/indexeddb';
import type { DocumentHistoryItem } from '../types';

export function DocumentHistory() {
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentHistoryItem[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const documents = await indexedDBService.getAllDocuments();
        dispatch({ type: 'HISTORY_LOADED', payload: { documents } });
      } catch (error) {
        console.error('Failed to load document history:', error);
      }
    };

    loadHistory();
  }, [dispatch]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = state.documentHistory.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.outline.sections.some(section =>
          section.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(state.documentHistory);
    }
  }, [searchQuery, state.documentHistory]);

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await indexedDBService.deleteDocument(documentId);
        dispatch({ type: 'DOCUMENT_DELETED_FROM_HISTORY', payload: { documentId } });
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <article>
      <header>
        <h1>Document History</h1>
        <p>Manage your saved documents and continue working on them.</p>
      </header>

      <section>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
        </div>

        {filteredDocuments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>
              {searchQuery ? 'No documents match your search.' : 'No documents saved yet.'}
            </p>
            <Link to="/" role="button" className="contrast">
              Create New Document
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredDocuments.map((document) => (
              <article
                key={document.id}
                style={{
                  border: '1px solid var(--pico-muted-border-color)',
                  borderRadius: 'var(--pico-border-radius)',
                  padding: '1rem'
                }}
              >
                <header style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>
                        <Link to={document.url} style={{ textDecoration: 'none' }}>
                          {document.title}
                        </Link>
                      </h3>
                      <small style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <Clock size={14} />
                        Updated {formatDate(document.updatedAt)}
                      </small>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(document.id)}
                      className="outline secondary"
                      style={{ padding: '0.25rem', minWidth: 'auto' }}
                      aria-label={`Delete document: ${document.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </header>

                <div style={{ marginBottom: '0.5rem' }}>
                  <small>
                    {document.sections.length} sections • 
                    {document.sections.filter(s => s.content).length} completed • 
                    Target: {document.config.targetWordCount} words
                  </small>
                </div>

                <details>
                  <summary>Sections</summary>
                  <ul style={{ marginTop: '0.5rem' }}>
                    {document.outline.sections.map((section, index) => (
                      <li key={section.id} style={{ marginBottom: '0.25rem' }}>
                        <small>
                          {index + 1}. {section.title}
                          {document.sections.find(s => s.id === section.id)?.content && 
                            <span style={{ color: 'var(--pico-primary-color)', marginLeft: '0.5rem' }}>✓</span>
                          }
                        </small>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}