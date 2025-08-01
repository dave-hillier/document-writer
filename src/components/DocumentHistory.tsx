import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Trash2, Check } from 'lucide-react';
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
    <article className="document-history">
      <header>
        <h1>Document History</h1>
        <p>Manage your saved documents and continue working on them.</p>
      </header>

      <section>
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
        </form>

        {filteredDocuments.length === 0 ? (
          <section className="empty-state">
            <FileText size={48} aria-hidden="true" />
            <p>
              {searchQuery ? 'No documents match your search.' : 'No documents saved yet.'}
            </p>
            <Link to="/" role="button" className="contrast">
              Create New Document
            </Link>
          </section>
        ) : (
          <section>
            {filteredDocuments.map((document) => (
              <article key={document.id}>
                <header>
                  <hgroup>
                    <h3>
                      <Link to={document.url}>
                        {document.title}
                      </Link>
                    </h3>
                    <p>
                      <small>
                        <Clock size={14} />
                        <time dateTime={new Date(document.updatedAt).toISOString()}>
                          Updated {formatDate(document.updatedAt)}
                        </time>
                      </small>
                    </p>
                  </hgroup>
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="outline secondary"
                    aria-label={`Delete document: ${document.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </header>

                <footer>
                  <small>
                    {document.sections.length} sections • 
                    {document.sections.filter(s => s.content).length} completed • 
                    Target: {document.config.targetWordCount} words
                  </small>
                </footer>

                <details>
                  <summary>Sections</summary>
                  <ul>
                    {document.outline.sections.map((section, index) => (
                      <li key={section.id}>
                        <small>
                          {index + 1}. {section.title}
                          {document.sections.find(s => s.id === section.id)?.content && 
                            <Check size={12} />
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