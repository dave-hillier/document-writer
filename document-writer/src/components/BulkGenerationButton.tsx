import { useAppContext } from '../contexts/useAppContext';
import { generateAllSections } from '../business/documentOperations';
import { Play, Square, RotateCcw } from 'lucide-react';
import type { AppState, AppAction } from '../types';
import { useRef, useEffect, useReducer } from 'react';

interface BulkGenerationUIState {
  buttonState: 'generating' | 'stopped' | 'error' | 'idle';
  disabled: boolean;
  ariaLabel: string;
  currentSectionIndex: number | null;
}

type BulkGenerationUIAction = 
  | { type: 'START_GENERATION' }
  | { type: 'STOP_GENERATION' }
  | { type: 'GENERATION_FAILED'; error: string }
  | { type: 'GENERATION_COMPLETED' }
  | { type: 'SECTION_STARTED'; sectionIndex: number }
  | { type: 'CHECK_AVAILABILITY'; canGenerate: boolean };

const initialUIState: BulkGenerationUIState = {
  buttonState: 'idle',
  disabled: true,
  ariaLabel: 'Generate all incomplete sections',
  currentSectionIndex: null
};

function bulkGenerationUIReducer(state: BulkGenerationUIState, action: BulkGenerationUIAction): BulkGenerationUIState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        buttonState: 'generating',
        disabled: false,
        ariaLabel: 'Stop bulk generation'
      };
    
    case 'STOP_GENERATION':
      return {
        ...state,
        buttonState: 'stopped',
        disabled: false,
        ariaLabel: 'Retry bulk generation',
        currentSectionIndex: null
      };
    
    case 'GENERATION_FAILED':
      return {
        ...state,
        buttonState: 'error',
        disabled: false,
        ariaLabel: 'Retry bulk generation',
        currentSectionIndex: null
      };
    
    case 'GENERATION_COMPLETED':
      return {
        ...state,
        buttonState: 'idle',
        disabled: true,
        ariaLabel: 'Generate all incomplete sections',
        currentSectionIndex: null
      };
    
    case 'SECTION_STARTED':
      return {
        ...state,
        currentSectionIndex: action.sectionIndex
      };
    
    case 'CHECK_AVAILABILITY':
      if (state.buttonState === 'idle') {
        return {
          ...state,
          disabled: !action.canGenerate
        };
      }
      return state;
    
    default:
      return state;
  }
}

async function executeBulkGeneration(
  state: AppState, 
  dispatch: (action: AppAction) => void,
  dispatchUI: (action: BulkGenerationUIAction) => void,
  shouldStop: () => boolean
): Promise<void> {
  const { outline, sections } = state;
  const incompleteSections = sections.filter(s => !s.content);
  
  if (incompleteSections.length === 0 || !outline) return;

  try {
    await generateAllSections(
      {
        outline,
        sections,
        documentConfig: state.documentConfig,
        responseId: state.responseId,
        onSectionStart: (sectionIndex) => {
          dispatchUI({ type: 'SECTION_STARTED', sectionIndex });
        },
        shouldStop
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
  } catch (error) {
    if (error instanceof Error && error.message === 'Generation stopped by user') {
      throw error; // Re-throw to be handled by caller
    } else {
      throw error;
    }
  }
}

function BulkGenerationButtonContent({ uiState }: { uiState: BulkGenerationUIState }) {
  const { state } = useAppContext();
  const { sections } = state;
  
  if (uiState.buttonState === 'generating') {
    const currentSection = uiState.currentSectionIndex !== null ? sections[uiState.currentSectionIndex] : null;
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

function useBulkGeneration() {
  const { state, dispatch } = useAppContext();
  const [uiState, dispatchUI] = useReducer(bulkGenerationUIReducer, initialUIState);
  const stopRequestedRef = useRef(false);
  
  // Check if generation is available
  useEffect(() => {
    const incompleteSections = state.sections.filter(s => !s.content).length;
    const canGenerate = !state.isStreaming && incompleteSections > 0;
    dispatchUI({ type: 'CHECK_AVAILABILITY', canGenerate });
  }, [state.isStreaming, state.sections]);

  const handleClick = async () => {
    switch (uiState.buttonState) {
      case 'idle':
        stopRequestedRef.current = false;
        dispatchUI({ type: 'START_GENERATION' });
        try {
          await executeBulkGeneration(
            state, 
            dispatch, 
            dispatchUI,
            () => stopRequestedRef.current
          );
          if (stopRequestedRef.current) {
            dispatchUI({ type: 'STOP_GENERATION' });
          } else {
            dispatchUI({ type: 'GENERATION_COMPLETED' });
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Generation stopped by user') {
            dispatchUI({ type: 'STOP_GENERATION' });
          } else {
            dispatchUI({ 
              type: 'GENERATION_FAILED', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
        break;
      case 'generating':
        stopRequestedRef.current = true;
        dispatch({ type: 'SECTION_GENERATION_ABORTED' });
        break;
      case 'stopped':
      case 'error':
        stopRequestedRef.current = false;
        dispatchUI({ type: 'START_GENERATION' });
        try {
          await executeBulkGeneration(
            state, 
            dispatch, 
            dispatchUI,
            () => stopRequestedRef.current
          );
          if (stopRequestedRef.current) {
            dispatchUI({ type: 'STOP_GENERATION' });
          } else {
            dispatchUI({ type: 'GENERATION_COMPLETED' });
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Generation stopped by user') {
            dispatchUI({ type: 'STOP_GENERATION' });
          } else {
            dispatchUI({ 
              type: 'GENERATION_FAILED', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
        break;
    }
  };

  return { uiState, handleClick };
}

export function BulkGenerationButton() {
  const { uiState, handleClick } = useBulkGeneration();

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