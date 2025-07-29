import { useAppContext } from '../contexts/useAppContext';
import { generateAllSections } from '../business/documentOperations';
import { Play, Square, RotateCcw } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { useRef, useEffect, useReducer } from 'react';

interface BulkGenerationUIState {
  buttonState: 'generating' | 'stopped' | 'error' | 'idle';
  disabled: boolean;
  ariaLabel: string;
}

const initialUIState: BulkGenerationUIState = {
  buttonState: 'idle',
  disabled: true,
  ariaLabel: 'Generate all incomplete sections'
};

function bulkGenerationUIReducer(_: BulkGenerationUIState, appState: AppState): BulkGenerationUIState {
  const { isBulkGenerating, bulkGenerationStopped, bulkGenerationError, isStreaming, sections } = appState;
  const incompleteSections = sections.filter(s => !s.content).length;
  
  if (isBulkGenerating) {
    return {
      buttonState: 'generating',
      disabled: false,
      ariaLabel: 'Stop bulk generation'
    };
  }
  
  if (bulkGenerationStopped) {
    return {
      buttonState: 'stopped',
      disabled: false,
      ariaLabel: 'Retry bulk generation'
    };
  }
  
  if (bulkGenerationError) {
    return {
      buttonState: 'error',
      disabled: false,
      ariaLabel: 'Retry bulk generation'
    };
  }
  
  return {
    buttonState: 'idle',
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
  
  if (uiState.buttonState === 'generating') {
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
  } else if (uiState.buttonState === 'stopped' || uiState.buttonState === 'error') {
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
  const [uiState, updateUIState] = useReducer(bulkGenerationUIReducer, initialUIState);
  
  useEffect(() => {
    stateRef.current = state;
    updateUIState(state);
  }, [state]);
  
  const getCurrentState = () => stateRef.current;

  const handleClick = async () => {
    switch (uiState.buttonState) {
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