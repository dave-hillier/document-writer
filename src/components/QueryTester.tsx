import { useState } from 'react';
import { Search, Copy, RotateCw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppContext } from '../contexts/useAppContext';
import * as knowledgeBaseService from '../services/knowledgeBase';

interface QueryTesterProps {
  knowledgeBaseId: string;
  knowledgeBaseService: typeof knowledgeBaseService;
}

// Removed fixed list - narrative elements are now dynamically generated based on content

export function QueryTester({ knowledgeBaseId, knowledgeBaseService }: QueryTesterProps) {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [rewriteQuery, setRewriteQuery] = useState(true);
  const [maxResults, setMaxResults] = useState(10);
  const [showRawJson, setShowRawJson] = useState(false);
  const [searchOutlines, setSearchOutlines] = useState(false);
  const [selectedNarrativeElements, setSelectedNarrativeElements] = useState<string[]>([]);
  const [fuzzyMatchNarratives, setFuzzyMatchNarratives] = useState(true);
  const [availableNarrativeElements, setAvailableNarrativeElements] = useState<string[]>([]);
  const [customNarrativeElement, setCustomNarrativeElement] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const narrativeOptions = selectedNarrativeElements.length > 0 ? {
        includeElements: selectedNarrativeElements,
        fuzzyMatch: fuzzyMatchNarratives
      } : undefined;

      const result = await knowledgeBaseService.search(knowledgeBaseId, query, {
        maxResults,
        rewriteQuery,
        searchOutlines,
        narrativeOptions
      });
      
      // Extract available narrative elements from search results
      if (searchOutlines && result.results.length > 0) {
        const allElements = new Set<string>();
        result.results.forEach(result => {
          const elements = result.attributes?.narrativeElements as string[] || [];
          elements.forEach(element => allElements.add(element));
        });
        setAvailableNarrativeElements(Array.from(allElements).sort());
      }
      
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

  const toggleNarrativeElement = (element: string) => {
    setSelectedNarrativeElements(prev => 
      prev.includes(element) 
        ? prev.filter(e => e !== element)
        : [...prev, element]
    );
  };

  const addCustomNarrativeElement = () => {
    const element = customNarrativeElement.trim().toLowerCase();
    if (element && !selectedNarrativeElements.includes(element)) {
      setSelectedNarrativeElements(prev => [...prev, element]);
      setCustomNarrativeElement('');
    }
  };

  const handleCustomElementKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomNarrativeElement();
    }
  };

  const removeNarrativeElement = (element: string) => {
    setSelectedNarrativeElements(prev => prev.filter(e => e !== element));
  };

  const latestResult = state.queryTestResults[0];

  return (
    <article className="query-tester">
      <form onSubmit={handleSearch}>
        <div>
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
            disabled={!query.trim() || isSearching}
            aria-label="Search"
            data-loading={isSearching}
          >
            {isSearching ? (
              <RotateCw size={20} aria-hidden="true" />
            ) : (
              <Search size={20} aria-hidden="true" />
            )}
          </button>
        </div>

        <fieldset>
          <label>
            <input
              type="checkbox"
              role="switch"
              checked={searchOutlines}
              onChange={(e) => setSearchOutlines(e.target.checked)}
            />
            Search outlines {searchOutlines ? '(for generating document structure)' : '(search content examples)'}
          </label>

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
            />
          </label>
        </fieldset>

        {searchOutlines && (
          <fieldset>
            <legend>Narrative Elements Filter</legend>
            <label>
              <input
                type="checkbox"
                checked={fuzzyMatchNarratives}
                onChange={(e) => setFuzzyMatchNarratives(e.target.checked)}
              />
              Enable fuzzy matching for narrative elements
            </label>
            
            <div>
              <label>
                Add custom element:
                <input
                  type="text"
                  value={customNarrativeElement}
                  onChange={(e) => setCustomNarrativeElement(e.target.value)}
                  onKeyPress={handleCustomElementKeyPress}
                  placeholder="Enter single word (e.g., examples, statistics, stories)"
                />
              </label>
              <button type="button" onClick={addCustomNarrativeElement} disabled={!customNarrativeElement.trim()}>Add</button>
            </div>
            
            {availableNarrativeElements.length > 0 && (
              <div>
                <p><strong>Available elements from search results:</strong></p>
                <div data-narrative-elements-grid>
                  {availableNarrativeElements.map(element => (
                    <label key={element} data-narrative-element>
                      <input
                        type="checkbox"
                        checked={selectedNarrativeElements.includes(element)}
                        onChange={() => toggleNarrativeElement(element)}
                      />
                      {element}
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {selectedNarrativeElements.length > 0 && (
              <div>
                <p><strong>Selected elements:</strong></p>
                <div>
                  {selectedNarrativeElements.map(element => (
                    <span key={element} style={{display: 'inline-block', margin: '2px', padding: '4px 8px', background: 'var(--pico-primary)', color: 'white', borderRadius: '4px', fontSize: '0.9em'}}>
                      {element}
                      <button 
                        type="button" 
                        onClick={() => removeNarrativeElement(element)}
                        style={{marginLeft: '8px', background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}
                        aria-label={`Remove ${element}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        )}
      </form>

      {state.queryTestResults.length > 0 && (
        <section>
          <header>
            <h3>Search Results</h3>
            <div>
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
            <article>
              <section>
                <p><strong>Query:</strong> {latestResult.query}</p>
                {latestResult.rewrittenQuery && (
                  <p><strong>Rewritten:</strong> {latestResult.rewrittenQuery}</p>
                )}
                <p><strong>Search time:</strong> {latestResult.searchTime}ms</p>
                <p><strong>Results found:</strong> {latestResult.results.length}</p>
              </section>

              {showRawJson ? (
                <section>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(latestResult, null, 2))}
                    type="button"
                    aria-label="Copy JSON"
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                  <pre>{JSON.stringify(latestResult, null, 2)}</pre>
                </section>
              ) : (
                <section>
                  {latestResult.results.length === 0 ? (
                    <p>No results found. Try a different query or upload more files.</p>
                  ) : (
                    <ul>
                      {latestResult.results.map((result, index) => (
                        <li key={index}>
                          <header>
                            <span>{result.filename}</span>
                            <span>Score: {(result.score * 100).toFixed(1)}%</span>
                          </header>
                          <div>
                            {result.content.map((chunk, chunkIndex) => (
                              <div key={chunkIndex}>
                                {searchOutlines ? (
                                  <ReactMarkdown>{chunk.text}</ReactMarkdown>
                                ) : (
                                  <p>{chunk.text}</p>
                                )}
                              </div>
                            ))}
                          </div>
                          {result.attributes && Object.keys(result.attributes).length > 0 && (
                            <footer>
                              <div><strong>Attributes:</strong> {JSON.stringify(result.attributes)}</div>
                              {searchOutlines && result.attributes.narrativeElements && Array.isArray(result.attributes.narrativeElements) ? (
                                <div>
                                  <strong>Narrative Elements:</strong> {(result.attributes.narrativeElements as string[]).filter(el => typeof el === 'string').join(', ')}
                                </div>
                              ) : null}
                            </footer>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </article>
          )}

          {state.queryTestResults.length > 1 && (
            <details>
              <summary>Previous searches ({state.queryTestResults.length - 1})</summary>
              <ul>
                {state.queryTestResults.slice(1).map((result, index) => (
                  <li key={index}>
                    <span>{result.query}</span>
                    <small>
                      {result.results.length} results • {new Date(result.timestamp).toLocaleTimeString()}
                    </small>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

    </article>
  );
}