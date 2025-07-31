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

interface LuckyPromptTemplate {
  topic: string;
  allowedElements: string[];
  deniedElements: string[];
  targetWordCount: number;
}

// Sample prompts to use when no knowledge base is available
const FALLBACK_PROMPTS: LuckyPromptTemplate[] = [
  {
    topic: "The future of remote work and its impact on organizational culture",
    allowedElements: ["statistics", "case studies", "expert opinions", "future predictions"],
    deniedElements: ["personal anecdotes", "speculation without evidence"],
    targetWordCount: 3000
  },
  {
    topic: "Sustainable technology practices for modern businesses",
    allowedElements: ["real-world examples", "cost-benefit analysis", "implementation strategies"],
    deniedElements: ["personal opinions", "outdated practices"],
    targetWordCount: 2500
  },
  {
    topic: "The psychology of user experience design",
    allowedElements: ["research findings", "behavioral studies", "design principles", "case studies"],
    deniedElements: ["unsupported claims", "personal preferences"],
    targetWordCount: 4000
  },
  {
    topic: "Building resilient software architectures in the cloud era",
    allowedElements: ["architectural patterns", "best practices", "implementation examples", "performance metrics"],
    deniedElements: ["vendor-specific recommendations", "outdated technologies"],
    targetWordCount: 3500
  },
  {
    topic: "The evolution of artificial intelligence in creative industries",
    allowedElements: ["creative examples", "industry trends", "artist perspectives", "technological capabilities"],
    deniedElements: ["fear-mongering", "overly technical jargon"],
    targetWordCount: 3000
  }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function analyzeKnowledgeBasePatterns(
  knowledgeBases: KnowledgeBase[], 
  preferredKnowledgeBase?: KnowledgeBase
): Promise<LuckyPromptTemplate | null> {
  if (knowledgeBases.length === 0) return null;

  try {
    // Use preferred knowledge base if provided, otherwise use the first available
    const selectedKB = preferredKnowledgeBase || knowledgeBases[0];
    
    console.log(`🎲 [LUCKY-GENERATION] Using knowledge base: ${selectedKB.name} (${selectedKB.id})`);
    
    // Search for sample content to inspire the prompt
    const searchQueries = [
      "introduction overview summary",
      "methodology approach strategy",
      "analysis results findings",
      "implementation solution"
    ];
    
    const searchQuery = getRandomElement(searchQueries);
    const searchResult = await knowledgeBaseService.search(selectedKB.id, searchQuery);
    
    if (searchResult.results.length > 0) {
      // Analyze the content to generate a themed prompt
      const sampleContent = searchResult.results.slice(0, 3).map(r => 
        r.content.map(c => c.text).join(' ')
      ).join('\n\n');
      
      // Extract themes and generate a contextual prompt
      const themes = extractThemesFromContent(sampleContent);
      
      return {
        topic: generateTopicFromThemes(themes),
        allowedElements: generateAllowedElements(themes),
        deniedElements: ["personal opinions", "unsupported claims"],
        targetWordCount: 2500 + Math.floor(Math.random() * 2000) // 2500-4500 words
      };
    }
  } catch (error) {
    console.error('Failed to analyze knowledge base patterns:', error);
  }
  
  return null;
}

function extractThemesFromContent(content: string): string[] {
  // Simple keyword extraction - in a more sophisticated version, this could use NLP
  const commonThemes = [
    'technology', 'business', 'strategy', 'innovation', 'development', 
    'management', 'analysis', 'implementation', 'process', 'system',
    'design', 'research', 'methodology', 'optimization', 'framework'
  ];
  
  const contentLower = content.toLowerCase();
  const foundThemes = commonThemes.filter(theme => contentLower.includes(theme));
  
  return foundThemes.length > 0 ? foundThemes.slice(0, 3) : ['business', 'strategy'];
}


function generateTopicFromThemes(themes: string[]): string {
  const topicTemplates = [
    `Implementing effective ${themes[0]} strategies in modern organizations`,
    `The impact of ${themes[0]} on ${themes[1] || 'business outcomes'}`,
    `Best practices for ${themes[0]} ${themes[1] ? `and ${themes[1]}` : 'implementation'}`,
    `Transforming ${themes[1] || 'operations'} through ${themes[0]} innovation`,
    `A comprehensive guide to ${themes[0]} optimization`,
  ];
  
  return getRandomElement(topicTemplates);
}

function generateAllowedElements(themes: string[]): string[] {
  const baseElements = ['case studies', 'best practices', 'industry examples'];
  const themeSpecificElements = themes.map(theme => `${theme} insights`);
  
  return shuffleArray([...baseElements, ...themeSpecificElements]).slice(0, 4);
}


export async function generateLuckyDocument(
  knowledgeBases: KnowledgeBase[],
  callbacks: LuckyGenerationCallbacks,
  selectedKnowledgeBase?: KnowledgeBase
): Promise<DocumentHistoryItem> {
  const { onStepUpdate, onSectionProgress, shouldStop } = callbacks;
  const totalSteps = 5;
  
  try {
    // Step 1: Analyze knowledge base patterns
    onStepUpdate('Analyzing knowledge base patterns...', 1, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const kbPattern = await analyzeKnowledgeBasePatterns(knowledgeBases, selectedKnowledgeBase);
    const template = kbPattern || getRandomElement(FALLBACK_PROMPTS);
    
    // Step 2: Generate document configuration
    onStepUpdate('Generating document topic...', 2, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const kbToUse = selectedKnowledgeBase || (knowledgeBases.length > 0 ? knowledgeBases[0] : undefined);
    
    console.log(`🎲 [LUCKY-GENERATION] Final knowledge base for document: ${kbToUse ? `${kbToUse.name} (${kbToUse.id})` : 'None'}`);
    
    const config: DocumentConfig = {
      narrativeElements: {
        allowed: template.allowedElements,
        denied: template.deniedElements
      },
      targetWordCount: template.targetWordCount,
      knowledgeBaseId: kbToUse?.id
    };
    
    // Step 3: Generate outline
    onStepUpdate('Creating document outline...', 3, totalSteps);
    
    if (shouldStop?.()) {
      throw new Error('Generation cancelled by user');
    }
    
    const outlineResult = await generateOutline(
      { config, prompt: template.topic, responseId: null },
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