import { useEffect } from 'react';
import { ChevronRight, FileText, Download } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import { generateSection } from '../business/documentOperations';
import { exportDocumentAsMarkdown } from '../business/exportUtils';
import { saveCurrentDocument } from '../business/historyOperations';
import { BulkGenerationButton } from './BulkGenerationButton';
import { CacheMetrics } from './CacheMetrics';

export function DocumentEditor() {
  const { state, dispatch } = useAppContext();
  const { 
    outline, 
    sections, 
    isGenerating,
    isStreaming,
    streamingContent,
    outlineCacheMetrics,
    sectionCacheMetrics
  } = state;
  // Auto-save document when sections are updated
  useEffect(() => {
    const autoSave = async () => {
      if (state.currentDocumentId && outline && !isGenerating && !isStreaming) {
        try {
          await saveCurrentDocument(state);
          dispatch({ 
            type: 'DOCUMENT_SAVED_TO_HISTORY', 
            payload: { 
              document: {
                id: state.currentDocumentId,
                title: outline.title,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                config: state.documentConfig,
                outline,
                sections,
                url: `/document/${state.currentDocumentId}`
              }
            }
          });
        } catch (error) {
          console.error('Failed to auto-save document:', error);
        }
      }
    };

    // Auto-save after a delay to avoid saving during streaming
    const timeoutId = setTimeout(autoSave, 1000);
    return () => clearTimeout(timeoutId);
  }, [sections, state, dispatch, outline, isGenerating, isStreaming]);

  if (!outline) {
    return null;
  }

  const handleGenerateSection = async (sectionId: string) => {
    dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });

    try {
      const result = await generateSection(
        {
          sectionId,
          outline,
          sections,
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
  };


  const handleExport = () => {
    exportDocumentAsMarkdown(outline, sections);
  };

  const totalWordCount = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  

  return (
    <article aria-label="Document editor">
      <header>
        <hgroup>
          <h1>{outline.title}</h1>
          <p>
            <span aria-label="Total word count">{totalWordCount} words</span> • 
            <span aria-label="Sections completed">{sections.filter(s => s.content).length} of {sections.length} sections completed</span>
          </p>
        </hgroup>
        <nav aria-label="Document actions" style={{ display: 'flex', gap: '12px' }}>
        <BulkGenerationButton />
          <button
            onClick={handleExport}
            disabled={isStreaming || sections.every(s => !s.content)}
            className="contrast"
            aria-label="Export document as Markdown"
          >
            <Download size={18} aria-hidden="true" />
            Export Document
          </button>
        </nav>
      </header>

      <CacheMetrics cacheMetrics={outlineCacheMetrics} label="Outline cache performance" />

      <ol>
        {sections.map((section, index) => (
          <li key={section.id}>
            <section className="document-section" aria-labelledby={`section-${section.id}-title`}>
              <header>
                <div className={`section-indicator ${section.content ? 'completed' : ''}`} aria-hidden="true">
                  {section.content ? (
                    <FileText size={20} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                
                <hgroup>
                  <h3 id={`section-${section.id}-title`}>{section.title}</h3>
                  <p><small>Role: {section.role}</small></p>
                </hgroup>
              </header>
              
              <details>
                <summary>Sub-steps</summary>
                <ul>
                  {section.subSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </details>

              {section.content ? (
                <>
                  <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
                    {section.content}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <output aria-label={`Section word count: ${section.wordCount}`}>
                      {section.wordCount} words
                    </output>
                    <CacheMetrics 
                      cacheMetrics={sectionCacheMetrics[section.id]} 
                      label="Section cache"
                    />
                  </div>
                </>
              ) : isStreaming && isGenerating && sections.findIndex(s => s.id === section.id) === sections.findIndex(s => !s.content) ? (
                <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
                  {streamingContent}
                  <span className="cursor" aria-label="Generating content">▋</span>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateSection(section.id)}
                  disabled={isStreaming || isGenerating || (index > 0 && !sections[index - 1].content)}
                  aria-busy={isGenerating}
                  aria-label={`Generate content for section: ${section.title}`}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                  {isGenerating ? 'Generating...' : 'Generate Section'}
                </button>
              )}
            </section>
          </li>
        ))}
      </ol>
    </article>
  );
}