import { useState } from 'react';
import { Search, Copy, RotateCw, Trash2 } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import type { KnowledgeBaseService } from '../services/knowledgeBase';

interface QueryTesterProps {
  knowledgeBaseId: string;
  knowledgeBaseService: KnowledgeBaseService;
}

export function QueryTester({ knowledgeBaseId, knowledgeBaseService }: QueryTesterProps) {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [rewriteQuery, setRewriteQuery] = useState(true);
  const [maxResults, setMaxResults] = useState(10);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const result = await knowledgeBaseService.search(knowledgeBaseId, query, {
        maxResults,
        rewriteQuery
      });
      
      dispatch({ type: 'QUERY_TEST_EXECUTED', payload: { result } });
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearResults = () => {
    dispatch({ type: 'QUERY_TEST_RESULTS_CLEARED' });
  };

  const latestResult = state.queryTestResults[0];

  return (
    <div className="query-tester">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            aria-label="Search query"
            disabled={isSearching}
          />
          <button
            type="submit"
            className="primary"
            disabled={!query.trim() || isSearching}
            aria-label="Search"
          >
            {isSearching ? (
              <RotateCw className="spinning" size={20} aria-hidden="true" />
            ) : (
              <Search size={20} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="search-options">
          <label>
            <input
              type="checkbox"
              checked={rewriteQuery}
              onChange={(e) => setRewriteQuery(e.target.checked)}
            />
            Rewrite query for better results
          </label>
          
          <label>
            Max results:
            <input
              type="number"
              min="1"
              max="50"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
              style={{ width: '80px', marginLeft: '0.5rem' }}
            />
          </label>
        </div>
      </form>

      {state.queryTestResults.length > 0 && (
        <div className="results-section">
          <header>
            <h3>Search Results</h3>
            <div className="results-actions">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="secondary small"
              >
                {showRawJson ? 'Show Formatted' : 'Show Raw JSON'}
              </button>
              <button
                onClick={clearResults}
                className="secondary small"
                aria-label="Clear results"
              >
                <Trash2 size={16} aria-hidden="true" />
                Clear
              </button>
            </div>
          </header>

          {latestResult && (
            <div className="test-result">
              <div className="result-metadata">
                <p><strong>Query:</strong> {latestResult.query}</p>
                {latestResult.rewrittenQuery && (
                  <p><strong>Rewritten:</strong> {latestResult.rewrittenQuery}</p>
                )}
                <p><strong>Search time:</strong> {latestResult.searchTime}ms</p>
                <p><strong>Results found:</strong> {latestResult.results.length}</p>
              </div>

              {showRawJson ? (
                <div className="raw-json">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(latestResult, null, 2))}
                    className="copy-button"
                    aria-label="Copy JSON"
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                  <pre>{JSON.stringify(latestResult, null, 2)}</pre>
                </div>
              ) : (
                <div className="search-results">
                  {latestResult.results.length === 0 ? (
                    <p className="no-results">No results found. Try a different query or upload more files.</p>
                  ) : (
                    <ul className="result-list">
                      {latestResult.results.map((result, index) => (
                        <li key={index} className="result-item">
                          <header>
                            <span className="result-filename">{result.filename}</span>
                            <span className="result-score">Score: {(result.score * 100).toFixed(1)}%</span>
                          </header>
                          <div className="result-content">
                            {result.content.map((chunk, chunkIndex) => (
                              <p key={chunkIndex} className="content-chunk">
                                {chunk.text}
                              </p>
                            ))}
                          </div>
                          {result.attributes && Object.keys(result.attributes).length > 0 && (
                            <div className="result-attributes">
                              <strong>Attributes:</strong> {JSON.stringify(result.attributes)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {state.queryTestResults.length > 1 && (
            <details className="history-section">
              <summary>Previous searches ({state.queryTestResults.length - 1})</summary>
              <ul className="history-list">
                {state.queryTestResults.slice(1).map((result, index) => (
                  <li key={index}>
                    <span>{result.query}</span>
                    <span className="history-meta">
                      {result.results.length} results • {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <style>{`
        .query-tester {
          padding: 1rem 0;
        }

        .search-form {
          margin-bottom: 2rem;
        }

        .search-input-group {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .search-input-group input {
          flex: 1;
        }

        .search-options {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .search-options label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .results-section {
          background: var(--card-background-color);
          border-radius: var(--border-radius);
          padding: 1.5rem;
        }

        .results-section header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--muted-border-color);
        }

        .results-actions {
          display: flex;
          gap: 0.5rem;
        }

        .small {
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
        }

        .test-result {
          margin-top: 1rem;
        }

        .result-metadata {
          background: var(--card-sectionning-background-color);
          padding: 1rem;
          border-radius: var(--border-radius);
          margin-bottom: 1rem;
        }

        .result-metadata p {
          margin: 0.25rem 0;
        }

        .raw-json {
          position: relative;
          background: var(--code-background-color);
          border-radius: var(--border-radius);
          padding: 1rem;
          overflow: auto;
        }

        .copy-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: var(--border-radius);
          cursor: pointer;
        }

        .result-list {
          list-style: none;
          padding: 0;
        }

        .result-item {
          background: var(--card-sectionning-background-color);
          border-radius: var(--border-radius);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .result-item header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--muted-border-color);
        }

        .result-filename {
          font-weight: 600;
        }

        .result-score {
          color: var(--primary);
          font-size: 0.875rem;
        }

        .content-chunk {
          background: var(--code-background-color);
          padding: 0.75rem;
          border-radius: var(--border-radius);
          margin: 0.5rem 0;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .result-attributes {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: var(--muted-color);
        }

        .no-results {
          text-align: center;
          color: var(--muted-color);
          padding: 2rem;
        }

        .history-section {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--muted-border-color);
        }

        .history-list {
          list-style: none;
          padding: 0;
          margin-top: 1rem;
        }

        .history-list li {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--muted-border-color);
        }

        .history-meta {
          color: var(--muted-color);
          font-size: 0.875rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}