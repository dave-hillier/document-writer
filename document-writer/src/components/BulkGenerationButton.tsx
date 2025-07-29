import { useAppContext } from '../contexts/useAppContext';
import { generateAllSections } from '../business/documentOperations';
import { Play, Square, RotateCcw } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { useRef, useEffect } from 'react';

type BulkGenerationButtonState = 'generating' | 'stopped' | 'error' | 'idle';

interface BulkGenerationUIState {
  state: BulkGenerationButtonState;
  disabled: boolean;
  ariaLabel: string;
}

function getBulkGenerationUIState(state: AppState): BulkGenerationUIState {
  const { isBulkGenerating, bulkGenerationStopped, bulkGenerationError, isStreaming, sections } = state;
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

async function executeBulkGeneration(
  state: AppState, 
  dispatch: (action: AppAction) => void,
  getCurrentState: () => AppState
): Promise<void> {
  const { outline, sections } = state;
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
        shouldStop: () => getCurrentState().bulkGenerationStopped
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

    const currentState = getCurrentState();
    if (currentState.bulkGenerationStopped) {
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
}

function stopBulkGeneration(dispatch: (action: AppAction) => void): void {
  dispatch({ type: 'BULK_GENERATION_STOPPED' });
}

async function retryBulkGeneration(
  state: AppState, 
  dispatch: (action: AppAction) => void,
  getCurrentState: () => AppState
): Promise<void> {
  await executeBulkGeneration(state, dispatch, getCurrentState);
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
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  const uiState = getBulkGenerationUIState(state);
  const getCurrentState = () => stateRef.current;

  const handleClick = async () => {
    switch (uiState.state) {
      case 'idle':
        await executeBulkGeneration(state, dispatch, getCurrentState);
        break;
      case 'generating':
        stopBulkGeneration(dispatch);
        break;
      case 'stopped':
      case 'error':
        await retryBulkGeneration(state, dispatch, getCurrentState);
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