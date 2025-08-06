import { useAutoSave } from '../../hooks/useAutoSave';
import { ChevronRight, FileText, Download, RotateCcw, Eye } from 'lucide-react';
import { useAppContext } from '../../contexts/useAppContext';
import { generateSection } from '../../business/documentOperations';
import { exportDocumentAsMarkdown } from '../../business/exportUtils';
import { BulkGenerationButton } from '../editor/BulkGenerationButton';
import { CacheMetrics } from '../common/CacheMetrics';
import { EditableText } from '../editor/EditableText';
import { EditableList } from '../editor/EditableList';

export function DocumentEditor() {
  const { state, dispatch } = useAppContext();
  const { 
    outline, 
    sections, 
    isGenerating,
    isStreaming,
    streamingContent,
    currentlyGeneratingSectionId,
    outlineCacheMetrics,
    sectionCacheMetrics
  } = state;
  // Auto-save document when sections are updated
  useAutoSave(state, dispatch);

  if (!outline) {
    return null;
  }

  const handleGenerateSection = async (sectionId: string, isRegeneration = false) => {
    dispatch({ 
      type: isRegeneration ? 'SECTION_REGENERATION_STARTED' : 'SECTION_GENERATION_STARTED', 
      payload: { sectionId } 
    });

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

  const handlePreview = () => {
    dispatch({ type: 'DOCUMENT_PREVIEW_OPENED' });
  };

  const totalWordCount = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  

  return (
    <article className="document-editor" aria-label="Document editor">
      <header>
        <hgroup>
          <EditableText
            value={outline.title}
            onSave={(newTitle) => dispatch({ type: 'OUTLINE_TITLE_UPDATED', payload: { title: newTitle } })}
            ariaLabel="Document title"
            element="h1"
          />
          <p>
            <span aria-label="Total word count">{totalWordCount} words</span> • 
            <span aria-label="Sections completed">{sections.filter(s => s.content).length} of {sections.length} sections completed</span>
          </p>
        </hgroup>
        <nav aria-label="Document actions">
        <BulkGenerationButton />
          <button
            onClick={handlePreview}
            disabled={isStreaming || sections.every(s => !s.content)}
            className="secondary"
            aria-label="Preview complete document"
          >
            <Eye size={18} aria-hidden="true" />
            Preview Document
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

      <CacheMetrics cacheMetrics={outlineCacheMetrics} label="Outline cache performance" />

      <ol>
        {sections.map((section, index) => (
          <li key={section.id}>
            <section className="document-section" aria-labelledby={`section-${section.id}-title`}>
              <header>
                <div data-completed={section.content ? "true" : "false"} aria-hidden="true">
                  {section.content ? (
                    <FileText size={20} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                
                <hgroup>
                  <EditableText
                    value={section.title}
                    onSave={(newTitle) => dispatch({ 
                      type: 'SECTION_UPDATED', 
                      payload: { sectionId: section.id, updates: { title: newTitle } } 
                    })}
                    ariaLabel={`Section ${index + 1} title`}
                    element="h3"
                  />
                  <p>
                    <small>Role: </small>
                    <EditableText
                      value={section.role}
                      onSave={(newRole) => dispatch({ 
                        type: 'SECTION_UPDATED', 
                        payload: { sectionId: section.id, updates: { role: newRole } } 
                      })}
                      ariaLabel={`Section ${index + 1} role`}
                    />
                  </p>
                </hgroup>
              </header>
              
              <details open={!section.content}>
                <summary>Sub-steps</summary>
                <EditableList
                  items={section.subSteps}
                  onSave={(newSubSteps) => dispatch({ 
                    type: 'SECTION_UPDATED', 
                    payload: { sectionId: section.id, updates: { subSteps: newSubSteps } } 
                  })}
                  ariaLabel={`Sub-steps for section ${index + 1}`}
                />
              </details>

              {section.cues && section.cues.length > 0 && (
                <details open={!section.content}>
                  <summary>Writing Cues</summary>
                  <EditableList
                    items={section.cues}
                    onSave={(newCues) => dispatch({ 
                      type: 'SECTION_UPDATED', 
                      payload: { sectionId: section.id, updates: { cues: newCues } } 
                    })}
                    ariaLabel={`Writing cues for section ${index + 1}`}
                  />
                </details>
              )}

              {isStreaming && isGenerating && currentlyGeneratingSectionId === section.id ? (
                <pre>
                  {streamingContent}
                  <span aria-label="Generating content">▋</span>
                </pre>
              ) : section.content ? (
                <>
                  <pre>
                    {section.content}
                  </pre>
                  <div className="section-footer">
                    <CacheMetrics 
                      cacheMetrics={sectionCacheMetrics[section.id]} 
                      label="Section cache"
                    />
                    <button
                      onClick={() => handleGenerateSection(section.id, true)}
                      disabled={isStreaming || isGenerating}
                      className="outline"
                      aria-label={`Regenerate content for section: ${section.title}`}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Regenerate
                    </button>
                  </div>
                </>
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