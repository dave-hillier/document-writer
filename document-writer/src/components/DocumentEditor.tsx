import { ChevronRight, FileText, Download, Play, Square, RotateCcw } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import { generateSection, generateAllSections } from '../business/documentOperations';
import { exportDocumentAsMarkdown } from '../business/exportUtils';

export function DocumentEditor() {
  const { state, dispatch } = useAppContext();
  const { 
    outline, 
    sections, 
    isGenerating,
    isStreaming,
    streamingContent,
    isBulkGenerating,
    currentBulkSectionIndex,
    bulkGenerationStopped,
    bulkGenerationError
  } = state;
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

  const handleGenerateAllSections = async () => {
    const incompleteSections = sections.filter(s => !s.content);
    if (incompleteSections.length === 0) return;

    dispatch({ type: 'BULK_GENERATION_STARTED' });

    try {
      await generateAllSections(
        {
          outline,
          sections,
          documentConfig: state.documentConfig,
          responseId: state.responseId,
          onSectionStart: (sectionIndex) => {
            dispatch({ type: 'BULK_SECTION_STARTED', payload: { sectionIndex } });
          },
          shouldStop: () => state.bulkGenerationStopped
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

      if (state.bulkGenerationStopped) {
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
  };

  const handleStopBulkGeneration = () => {
    dispatch({ type: 'BULK_GENERATION_STOPPED' });
  };

  const handleRetryBulkGeneration = () => {
    handleGenerateAllSections();
  };

  const handleExport = () => {
    exportDocumentAsMarkdown(outline, sections);
  };

  const totalWordCount = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const incompleteSections = sections.filter(s => !s.content);
  
  const getBulkGenerationButtonContent = () => {
    if (isBulkGenerating) {
      const currentSection = currentBulkSectionIndex !== null ? sections[currentBulkSectionIndex] : null;
      return (
        <>
          <Square size={18} aria-hidden="true" />
          Stop Generation
          {currentSection && (
            <small style={{ display: 'block', marginTop: '4px' }}>
              Generating: {currentSection.title}
            </small>
          )}
        </>
      );
    } else if (bulkGenerationStopped || bulkGenerationError) {
      return (
        <>
          <RotateCcw size={18} aria-hidden="true" />
          Retry All Sections
        </>
      );
    } else {
      return (
        <>
          <Play size={18} aria-hidden="true" />
          Generate All Sections
        </>
      );
    }
  };

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
          <button
            onClick={isBulkGenerating ? handleStopBulkGeneration : (bulkGenerationStopped || bulkGenerationError) ? handleRetryBulkGeneration : handleGenerateAllSections}
            disabled={isStreaming || (incompleteSections.length === 0 && !isBulkGenerating && !bulkGenerationStopped && !bulkGenerationError)}
            className="secondary"
            aria-label={isBulkGenerating ? "Stop bulk generation" : (bulkGenerationStopped || bulkGenerationError) ? "Retry bulk generation" : "Generate all incomplete sections"}
          >
            {getBulkGenerationButtonContent()}
          </button>
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

      {bulkGenerationError && (
        <div role="alert" aria-live="assertive" style={{ marginBottom: '24px' }}>
          Bulk generation failed: {bulkGenerationError}
        </div>
      )}

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
                  <output aria-label={`Section word count: ${section.wordCount}`}>
                    {section.wordCount} words
                  </output>
                </>
              ) : isStreaming && isGenerating && sections.findIndex(s => s.id === section.id) === sections.findIndex(s => !s.content) ? (
                <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
                  {streamingContent}
                  <span className="cursor" aria-label="Generating content">▋</span>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateSection(section.id)}
                  disabled={isStreaming || isGenerating || isBulkGenerating || (index > 0 && !sections[index - 1].content)}
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