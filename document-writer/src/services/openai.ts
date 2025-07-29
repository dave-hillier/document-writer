import type { DocumentConfig, DocumentOutline, Section } from '../types';
import systemPromptContent from '../system-prompt.md?raw';
import { ResponsesService } from './responses';

export class DocumentGenerator {
  private responsesService: ResponsesService;

  constructor() {
    this.responsesService = new ResponsesService();
  }

  async generateOutline(
    config: DocumentConfig, 
    userPrompt: string,
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, outline: DocumentOutline, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    // Structure prompt with static content first for optimal caching
    const prompt = `${systemPromptContent}

TASK: Generate a detailed outline following the structure described in the system prompt. The outline should have 4-8 sections, each with a clear role and 3-5 sub-steps.

CONFIGURATION:
- Tone: ${config.tone}
- Allowed narrative elements: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- Denied narrative elements: ${config.narrativeElements.denied.join(', ') || 'None specified'}
- Target word count: ${config.targetWordCount}

IMPORTANT: Return ONLY valid JSON in this exact format, with no additional text:
{
  "title": "Document Title",
  "sections": [
    {
      "id": "unique-id",
      "title": "Section Title",
      "role": "Section Role",
      "subSteps": ["step1", "step2", "step3"]
    }
  ]
}

USER REQUEST: ${userPrompt}`;

    let fullResponse = '';
    
    // Use cache key based on document configuration
    const cacheKey = `outline-${config.tone}-${config.targetWordCount}`;
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        fullResponse += chunk;
        onChunk(chunk);
      },
      (newResponseId, cacheMetrics) => {
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = fullResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          const jsonContent = jsonMatch ? jsonMatch[1].trim() : fullResponse.trim();
          
          const outline = JSON.parse(jsonContent) as DocumentOutline;
          onComplete(newResponseId, outline, cacheMetrics);
        } catch {
          console.error('Failed to parse JSON response:', fullResponse);
          onError(new Error('Invalid JSON response. Please try again.'));
        }
      },
      onError,
      shouldStop,
      cacheKey
    );
  }

  async generateSection(
    section: Section, 
    config: DocumentConfig, 
    outline: DocumentOutline,
    previousSections: Section[],
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, content: string, wordCount: number, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    const outlineStructure = outline.sections
      .map((s, index) => `${index + 1}. ${s.title} (Role: ${s.role})`)
      .join('\n');

    const currentSectionIndex = outline.sections.findIndex(s => s.id === section.id);

    const previousContent = previousSections
      .map(s => `${s.title}:\n${s.content}`)
      .join('\n\n---\n\n');

    // Optimize prompt structure for maximum caching: most static content first
    const prompt = `${systemPromptContent}

SECTION GENERATION TASK: Write a 400-800 word section that:
1. Fulfills the section's designated role
2. Covers all the sub-steps
3. Maintains the specified tone
4. Uses only allowed narrative elements
5. Avoids denied narrative elements
6. Flows naturally from previous sections (if any)
7. Positions content appropriately within the overall document structure
8. Avoids concluding prematurely if there are more sections to follow

Write only the section content, no titles or metadata.

DOCUMENT CONFIGURATION:
- Tone: ${config.tone}
- Allowed narrative elements: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- Denied narrative elements: ${config.narrativeElements.denied.join(', ') || 'None specified'}

DOCUMENT CONTEXT:
Document Title: ${outline.title}

Full Document Outline:
${outlineStructure}

CURRENT SECTION:
Section: ${section.title} (Section ${currentSectionIndex + 1} of ${outline.sections.length})
Role: ${section.role}
Sub-steps to cover: ${section.subSteps.join(', ')}

${previousContent ? `PREVIOUS SECTIONS:\n${previousContent}` : ''}`;

    let fullContent = '';
    
    // Cache key for sections with same document configuration
    const cacheKey = `section-${config.tone}-${outline.title.replace(/\s+/g, '-')}`;
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        if (shouldStop && shouldStop()) {
          throw new Error('Generation stopped by user');
        }
        fullContent += chunk;
        onChunk(chunk);
      },
      (newResponseId, cacheMetrics) => {
        const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
        onComplete(newResponseId, fullContent, wordCount, cacheMetrics);
      },
      onError,
      shouldStop,
      cacheKey
    );
  }
}