import { v4 as uuidv4 } from 'uuid';
import type { DocumentConfig, DocumentHistoryItem, KnowledgeBase } from '../types';
import { generateOutline, generateAllSections } from './documentOperations';
import * as knowledgeBaseService from '../services/knowledgeBase';
import { indexedDBService } from '../services/indexeddb';

export interface LuckyGenerationCallbacks {
  onStepUpdate: (step: string, stepIndex: number, totalSteps: number) => void;
  onSectionProgress: (chunk: string) => void;
  shouldStop?: () => boolean;
}

interface LuckyPrompt {
  exampleContent: string;
  targetWordCount: number;
}


async function gatherKnowledgeBaseExamples(
  knowledgeBases: KnowledgeBase[], 
  preferredKnowledgeBase?: KnowledgeBase
): Promise<LuckyPrompt> {
  if (knowledgeBases.length === 0) {
    throw new Error('Knowledge base is required for Lucky generation');
  }

  try {
    // Use preferred knowledge base if provided, otherwise use the first available
    const selectedKB = preferredKnowledgeBase || knowledgeBases[0];
    
    console.log(`🎲 [LUCKY-GENERATION] Using knowledge base: ${selectedKB.name} (${selectedKB.id})`);
    
    // Try to get some random content from the knowledge base
    const searchQueries = ["the", "and", "a", "is", "of", "to", "in"];
    let exampleContent = "";
    
    for (const query of searchQueries) {
      const searchResult = await knowledgeBaseService.search(selectedKB.id, query);
      if (searchResult.results.length > 0) {
        // Gather 3-5 examples from the knowledge base
        const numExamples = Math.min(searchResult.results.length, 3 + Math.floor(Math.random() * 3));
        exampleContent = searchResult.results.slice(0, numExamples)
          .map(r => r.content.map(c => c.text).join(' '))
          .join('\n\n---\n\n');
        break;
      }
    }
    
    if (!exampleContent) {
      throw new Error('Could not find any content in the knowledge base');
    }
    
    return {
      exampleContent,
      targetWordCount: 2500 + Math.floor(Math.random() * 2000) // 2500-4500 words
    };
  } catch (error) {
    console.error('Failed to gather knowledge base examples:', error);
    throw new Error('Could not gather examples from knowledge base');
  }
}



export async function generateLuckyDocument(
  knowledgeBases: KnowledgeBase[],
  callbacks: LuckyGenerationCallbacks,
  selectedKnowledgeBase?: KnowledgeBase
): Promise<DocumentHistoryItem> {
  const { onStepUpdate, onSectionProgress, shouldStop } = callbacks;
  const totalSteps = 5;
  
  // Validate that we have at least one knowledge base
  if (knowledgeBases.length === 0) {
    throw new Error('At least one knowledge base is required for Lucky generation');
  }
  
  try {
    // Step 1: Analyze knowledge base patterns
    onStepUpdate('Gathering examples from knowledge base...', 1, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const luckyPrompt = await gatherKnowledgeBaseExamples(knowledgeBases, selectedKnowledgeBase);
    
    // Step 2: Generate document configuration
    onStepUpdate('Preparing creative prompt...', 2, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const kbToUse = selectedKnowledgeBase || (knowledgeBases.length > 0 ? knowledgeBases[0] : undefined);
    
    console.log(`🎲 [LUCKY-GENERATION] Final knowledge base for document: ${kbToUse ? `${kbToUse.name} (${kbToUse.id})` : 'None'}`);
    
    const config: DocumentConfig = {
      narrativeElements: {
        allowed: ['creative interpretation', 'inspired variations', 'thematic exploration'],
        denied: ['direct copying', 'verbatim repetition']
      },
      targetWordCount: luckyPrompt.targetWordCount,
      knowledgeBaseId: kbToUse?.id
    };
    
    // Step 3: Generate outline
    onStepUpdate('Creating document outline...', 3, totalSteps);
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    // Create a prompt that asks the LLM to create something inspired by the examples
    const inspirationPrompt = `Based on these examples from a knowledge base:

${luckyPrompt.exampleContent}

---

Create an original document inspired by the style, themes, and approach found in these examples. Don't copy them directly, but let them inspire something new and creative.`;
    
    const outlineResult = await generateOutline(
      { config, prompt: inspirationPrompt, responseId: null },
      { onChunk: onSectionProgress }
    );
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    // Step 4: Generate all sections
    onStepUpdate('Expanding sections...', 4, totalSteps);
    
    const sectionsWithContent = outlineResult.outline.sections.map(s => ({ ...s, content: '', wordCount: 0 }));
    
    await generateAllSections(
      {
        outline: outlineResult.outline,
        sections: sectionsWithContent,
        documentConfig: config,
        responseId: outlineResult.responseId,
        onSectionStart: (sectionIndex) => {
          const sectionNum = sectionIndex + 1;
          const totalSections = outlineResult.outline.sections.length;
          onStepUpdate(`Expanding section ${sectionNum} of ${totalSections}...`, 4, totalSteps);
        },
        shouldStop: shouldStop || (() => false)
      },
      {
        onChunk: onSectionProgress,
        onSectionGenerated: (result) => {
          const sectionIndex = sectionsWithContent.findIndex(s => s.id === result.sectionId);
          if (sectionIndex !== -1) {
            sectionsWithContent[sectionIndex].content = result.content;
            sectionsWithContent[sectionIndex].wordCount = result.wordCount;
          }
        },
        onSectionStarted: () => {}
      }
    );
    
    // Step 5: Finalize document
    onStepUpdate('Finalizing document...', 5, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const documentId = uuidv4();
    const document: DocumentHistoryItem = {
      id: documentId,
      title: outlineResult.outline.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config,
      outline: outlineResult.outline,
      sections: sectionsWithContent,
      url: `/document/${documentId}`
    };
    
    // Save to IndexedDB
    await indexedDBService.saveDocument(document);
    
    return document;
    
  } catch (error) {
    console.error('Lucky generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Lucky generation failed');
  }
}