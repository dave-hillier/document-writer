import { useAppContext } from '../contexts/useAppContext';
import { generateAllSections } from '../business/documentOperations';
import { Play, Square, RotateCcw } from 'lucide-react';

function BulkGenerationButtonContent() {
  const { state } = useAppContext();
  const { 
    sections,
    isBulkGenerating,
    currentBulkSectionIndex,
    bulkGenerationStopped,
    bulkGenerationError
  } = state;
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
}

export function BulkGenerationButton() {
  const { state, dispatch } = useAppContext();
  const { 
    outline,
    sections,
    isStreaming,
    isBulkGenerating,
    bulkGenerationStopped,
    bulkGenerationError
  } = state;

  const handleGenerateAllSections = async () => {
    const incompleteSections = sections.filter(s => !s.content);
    if (incompleteSections.length === 0 || !outline) return;

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

  const incompleteSections = sections.filter(s => !s.content);
  const disabled = isStreaming || (incompleteSections.length === 0 && !isBulkGenerating && !bulkGenerationStopped && !bulkGenerationError);
  
  const handleClick = () => {
    if (isBulkGenerating) {
      handleStopBulkGeneration();
    } else if (bulkGenerationStopped || bulkGenerationError) {
      handleRetryBulkGeneration();
    } else {
      handleGenerateAllSections();
    }
  };


  const getAriaLabel = () => {
    if (isBulkGenerating) {
      return "Stop bulk generation";
    } else if (bulkGenerationStopped || bulkGenerationError) {
      return "Retry bulk generation";
    } else {
      return "Generate all incomplete sections";
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="secondary"
      aria-label={getAriaLabel()}
    >
      <BulkGenerationButtonContent />
    </button>
  );
}