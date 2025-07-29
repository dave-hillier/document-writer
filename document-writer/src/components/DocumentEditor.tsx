import type { DocumentOutline, Section } from '../types';
import { ChevronRight, FileText, Download, Play, Square, RotateCcw } from 'lucide-react';

interface DocumentEditorProps {
  outline: DocumentOutline;
  sections: Section[];
  isGenerating: boolean;
  isStreaming: boolean;
  streamingContent: string;
  isBulkGenerating: boolean;
  currentBulkSectionIndex: number | null;
  bulkGenerationStopped: boolean;
  bulkGenerationError: string | null;
  onGenerateSection: (sectionId: string) => void;
  onGenerateAllSections: () => void;
  onStopBulkGeneration: () => void;
  onRetryBulkGeneration: () => void;
  onExport: () => void;
}

export function DocumentEditor({ 
  outline, 
  sections, 
  isGenerating,
  isStreaming,
  streamingContent,
  isBulkGenerating,
  currentBulkSectionIndex,
  bulkGenerationStopped,
  bulkGenerationError,
  onGenerateSection,
  onGenerateAllSections,
  onStopBulkGeneration,
  onRetryBulkGeneration,
  onExport
}: DocumentEditorProps) {
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={isBulkGenerating ? onStopBulkGeneration : (bulkGenerationStopped || bulkGenerationError) ? onRetryBulkGeneration : onGenerateAllSections}
            disabled={incompleteSections.length === 0 && !isBulkGenerating && !bulkGenerationStopped && !bulkGenerationError}
            className="secondary"
            aria-label={isBulkGenerating ? "Stop bulk generation" : (bulkGenerationStopped || bulkGenerationError) ? "Retry bulk generation" : "Generate all incomplete sections"}
          >
            {getBulkGenerationButtonContent()}
          </button>
          <button
            onClick={onExport}
            disabled={sections.every(s => !s.content)}
            className="export-button contrast"
            aria-label="Export document as Markdown"
          >
            <Download size={18} aria-hidden="true" />
            Export Document
          </button>
        </div>
      </header>

      {bulkGenerationError && (
        <div role="alert" className="error-message" aria-live="assertive" style={{ marginBottom: '24px' }}>
          Bulk generation failed: {bulkGenerationError}
        </div>
      )}

      <div role="list">
        {sections.map((section, index) => (
          <section key={section.id} className="document-section" role="listitem" aria-labelledby={`section-${section.id}-title`}>
            <div className="section-header">
              <div className={`section-indicator ${section.content ? 'completed' : ''}`} aria-hidden="true">
                {section.content ? (
                  <FileText size={20} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              <div className="section-content">
                <h3 id={`section-${section.id}-title`}>{section.title}</h3>
                <p><small>Role: {section.role}</small></p>
                
                <details>
                  <summary>Sub-steps</summary>
                  <ul>
                    {section.subSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </details>

                {section.content ? (
                  <div>
                    <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
                      {section.content}
                    </div>
                    <p className="word-count" aria-label={`Section word count: ${section.wordCount}`}>
                      {section.wordCount} words
                    </p>
                  </div>
                ) : isStreaming && isGenerating && sections.findIndex(s => s.id === section.id) === sections.findIndex(s => !s.content) ? (
                  <div>
                    <div className="content" style={{ whiteSpace: 'pre-wrap' }}>
                      {streamingContent}
                      <span className="cursor" aria-label="Generating content">▋</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onGenerateSection(section.id)}
                    disabled={isGenerating || isBulkGenerating || (index > 0 && !sections[index - 1].content)}
                    aria-busy={isGenerating}
                    aria-label={`Generate content for section: ${section.title}`}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                    {isGenerating ? 'Generating...' : 'Generate Section'}
                  </button>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}