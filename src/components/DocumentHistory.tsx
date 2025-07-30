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
        <aside data-search-container>
          <input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
        </aside>

        {filteredDocuments.length === 0 ? (
          <section data-empty-state>
            <FileText size={48} data-empty-icon aria-hidden="true" />
            <p>
              {searchQuery ? 'No documents match your search.' : 'No documents saved yet.'}
            </p>
            <Link to="/" role="button" data-variant="contrast">
              Create New Document
            </Link>
          </section>
        ) : (
          <section data-documents-grid>
            {filteredDocuments.map((document) => (
              <article
                key={document.id}
                data-document-card
              >
                <header data-card-header>
                  <section data-card-header-content>
                    <header>
                      <h3>
                        <Link to={document.url} data-document-link>
                          {document.title}
                        </Link>
                      </h3>
                      <small data-timestamp>
                        <Clock size={14} />
                        Updated {formatDate(document.updatedAt)}
                      </small>
                    </header>
                    <button
                      onClick={() => handleDeleteDocument(document.id)}
                      data-outline
                      data-variant="secondary"
                      data-icon-button
                      aria-label={`Delete document: ${document.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </section>
                </header>

                <footer data-document-stats>
                  <small>
                    {document.sections.length} sections • 
                    {document.sections.filter(s => s.content).length} completed • 
                    Target: {document.config.targetWordCount} words
                  </small>
                </footer>

                <details>
                  <summary>Sections</summary>
                  <ul data-sections-list>
                    {document.outline.sections.map((section, index) => (
                      <li key={section.id} data-section-item>
                        <small>
                          {index + 1}. {section.title}
                          {document.sections.find(s => s.id === section.id)?.content && 
                            <span data-completed-check>✓</span>
                          }
                        </small>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </section>
        )}
      </section>
    </article>
  );
}