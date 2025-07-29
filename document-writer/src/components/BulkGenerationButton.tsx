import { useAppContext } from '../contexts/useAppContext';
import { generateAllSections } from '../business/documentOperations';
import { Play, Square, RotateCcw } from 'lucide-react';
import type { AppState, AppAction } from '../types';

type BulkGenerationButtonState = 'generating' | 'stopped' | 'error' | 'idle';

interface BulkGenerationUIState {
  state: BulkGenerationButtonState;
  disabled: boolean;
  ariaLabel: string;
}

class BulkGenerationStateMachine {
  private readonly state: AppState;
  private readonly dispatch: (action: AppAction) => void;
  
  constructor(state: AppState, dispatch: (action: AppAction) => void) {
    this.state = state;
    this.dispatch = dispatch;
  }

  getUIState(): BulkGenerationUIState {
    const { isBulkGenerating, bulkGenerationStopped, bulkGenerationError, isStreaming, sections } = this.state;
    const incompleteSections = sections.filter(s => !s.content).length;
    
    if (isBulkGenerating) {
      return {
        state: 'generating',
        disabled: false,
        ariaLabel: 'Stop bulk generation'
      };
    }
    
    if (bulkGenerationStopped || bulkGenerationError) {
      return {
        state: bulkGenerationStopped ? 'stopped' : 'error',
        disabled: false,
        ariaLabel: 'Retry bulk generation'
      };
    }
    
    return {
      state: 'idle',
      disabled: isStreaming || incompleteSections === 0,
      ariaLabel: 'Generate all incomplete sections'
    };
  }

  async execute(): Promise<void> {
    const { outline, sections } = this.state;
    const incompleteSections = sections.filter(s => !s.content);
    
    if (incompleteSections.length === 0 || !outline) return;

    this.dispatch({ type: 'BULK_GENERATION_STARTED' });

    try {
      await generateAllSections(
        {
          outline,
          sections,
          documentConfig: this.state.documentConfig,
          responseId: this.state.responseId,
          onSectionStart: (sectionIndex) => {
            this.dispatch({ type: 'BULK_SECTION_STARTED', payload: { sectionIndex } });
          },
          shouldStop: () => this.state.bulkGenerationStopped
        },
        {
          onChunk: (chunk) => {
            this.dispatch({ type: 'SECTION_CONTENT_STREAMED', payload: chunk });
          },
          onSectionGenerated: (result) => {
            this.dispatch({ type: 'SECTION_GENERATED', payload: result });
          },
          onSectionStarted: (sectionId) => {
            this.dispatch({ type: 'SECTION_GENERATION_STARTED', payload: { sectionId } });
          }
        }
      );

      if (this.state.bulkGenerationStopped) {
        this.dispatch({ type: 'BULK_GENERATION_STOPPED' });
      } else {
        this.dispatch({ type: 'BULK_GENERATION_COMPLETED' });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Generation stopped by user') {
        this.dispatch({ type: 'BULK_GENERATION_STOPPED' });
      } else {
        this.dispatch({ 
          type: 'BULK_GENERATION_FAILED', 
          payload: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  }

  stop(): void {
    this.dispatch({ type: 'BULK_GENERATION_STOPPED' });
  }

  async retry(): Promise<void> {
    await this.execute();
  }
}

function BulkGenerationButtonContent({ uiState }: { uiState: BulkGenerationUIState }) {
  const { state } = useAppContext();
  const { sections, currentBulkSectionIndex } = state;
  
  if (uiState.state === 'generating') {
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
  } else if (uiState.state === 'stopped' || uiState.state === 'error') {
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
  
  const stateMachine = new BulkGenerationStateMachine(state, dispatch);
  const uiState = stateMachine.getUIState();

  const handleClick = async () => {
    switch (uiState.state) {
      case 'idle':
        await stateMachine.execute();
        break;
      case 'generating':
        stateMachine.stop();
        break;
      case 'stopped':
      case 'error':
        await stateMachine.retry();
        break;
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={uiState.disabled}
      className="secondary"
      aria-label={uiState.ariaLabel}
    >
      <BulkGenerationButtonContent uiState={uiState} />
    </button>
  );
}