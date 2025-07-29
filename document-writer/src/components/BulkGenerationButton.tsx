import { useAppContext } from '../contexts/useAppContext';
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

interface BulkGenerationButtonProps {
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  onRetryGeneration: () => void;
  disabled?: boolean;
}

export function BulkGenerationButton({
  onStartGeneration,
  onStopGeneration,
  onRetryGeneration,
  disabled = false
}: BulkGenerationButtonProps) {
  const { state } = useAppContext();
  const { 
    isBulkGenerating,
    bulkGenerationStopped,
    bulkGenerationError
  } = state;
  
  const handleClick = () => {
    if (isBulkGenerating) {
      onStopGeneration();
    } else if (bulkGenerationStopped || bulkGenerationError) {
      onRetryGeneration();
    } else {
      onStartGeneration();
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