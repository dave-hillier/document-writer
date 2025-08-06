import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../contexts/useAppContext';
import { DocumentConfig } from '../components/document/DocumentConfig';
import { DocumentPreview } from '../components/document/DocumentPreview';
import { LuckyGenerationDialog } from '../components/document/LuckyGenerationDialog';
import { generateOutline } from '../business/documentOperations';
import { generateLuckyDocument } from '../business/luckyDocumentOperations';
import { indexedDBService } from '../services/indexeddb';
import type { DocumentConfig as IDocumentConfig, DocumentHistoryItem } from '../types';

export function HomePage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const luckyGenerationCancelRef = useRef<boolean>(false);

  const handleGenerateOutline = async (config: IDocumentConfig, prompt: string) => {
    dispatch({ type: 'OUTLINE_GENERATION_STARTED', payload: { config } });

    try {
      const result = await generateOutline(
        {
          config,
          prompt,
          responseId: state.responseId
        },
        {
          onChunk: (chunk) => {
            dispatch({ type: 'OUTLINE_CONTENT_STREAMED', payload: chunk });
          }
        }
      );
      
      
      // Generate document ID and navigate to document URL
      const documentId = uuidv4();
      dispatch({ type: 'DOCUMENT_ID_ASSIGNED', payload: { documentId } });
      dispatch({ type: 'OUTLINE_GENERATED', payload: result });
      
      // Save to IndexedDB
      const documentItem: DocumentHistoryItem = {
        id: documentId,
        title: result.outline.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config,
        outline: result.outline,
        sections: result.outline.sections.map(s => ({ ...s, content: '', wordCount: 0 })),
        url: `/document/${documentId}`
      };
      
      try {
        await indexedDBService.saveDocument(documentItem);
        dispatch({ type: 'DOCUMENT_SAVED_TO_HISTORY', payload: { document: documentItem } });
      } catch (error) {
        console.error('Failed to save document to history:', error);
        // Non-critical error - document generation can continue
      }
      
      navigate(`/document/${documentId}`);
    } catch (error) {
      dispatch({ 
        type: 'OUTLINE_GENERATION_FAILED', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleLuckyGeneration = async () => {
    dispatch({ type: 'LUCKY_GENERATION_STARTED' });
    luckyGenerationCancelRef.current = false;

    try {
      const document = await generateLuckyDocument(
        state.knowledgeBases,
        {
          onStepUpdate: (step, stepIndex, totalSteps) => {
            dispatch({ 
              type: 'LUCKY_GENERATION_STEP_UPDATED', 
              payload: { step, stepIndex, totalSteps } 
            });
          },
          onSectionProgress: () => {
            // Lucky generation doesn't show streaming content
          },
          shouldStop: () => luckyGenerationCancelRef.current
        },
        state.selectedKnowledgeBase || undefined
      );

      if (!luckyGenerationCancelRef.current) {
        dispatch({ type: 'LUCKY_GENERATION_COMPLETED', payload: { document } });
      }
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Generation cancelled by user') {
        dispatch({ type: 'LUCKY_GENERATION_CANCELLED' });
      } else {
        dispatch({ 
          type: 'LUCKY_GENERATION_FAILED', 
          payload: error instanceof Error ? error.message : 'Lucky generation failed'
        });
      }
    }
  };

  const handleCancelLuckyGeneration = () => {
    luckyGenerationCancelRef.current = true;
    dispatch({ type: 'LUCKY_GENERATION_CANCELLED' });
  };

  const handleCreateSimilarDocument = () => {
    const luckyDoc = state.luckyGeneration.generatedDocument;
    if (luckyDoc) {
      // Pre-fill the form with similar settings
      dispatch({ type: 'RESET_DOCUMENT' });
      // Navigate back to home to show the pre-filled form
      // The form will automatically pick up the last used settings
    }
  };

  const handleNewLuckyDocument = () => {
    dispatch({ type: 'RESET_DOCUMENT' });
    handleLuckyGeneration();
  };

  return (
    <>
      <section aria-label="Document Configuration">
        <DocumentConfig 
          onSubmit={handleGenerateOutline} 
          onLuckyGeneration={handleLuckyGeneration}
        />
      </section>
      
      <LuckyGenerationDialog 
        isOpen={state.luckyGeneration.isGenerating}
        state={state.luckyGeneration}
        onCancel={handleCancelLuckyGeneration}
      />
      
      {state.luckyGeneration.generatedDocument && (
        <DocumentPreview
          document={state.luckyGeneration.generatedDocument}
          isOpen={!!state.luckyGeneration.generatedDocument && !state.luckyGeneration.isGenerating}
          onClose={() => dispatch({ type: 'RESET_DOCUMENT' })}
          context="lucky"
          onCreateSimilar={handleCreateSimilarDocument}
          onNewLucky={handleNewLuckyDocument}
        />
      )}
    </>
  );
}