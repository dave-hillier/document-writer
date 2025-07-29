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
    onComplete: (responseId: string, outline: DocumentOutline) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const prompt = `${systemPromptContent}

Given the following document configuration:
- Tone: ${config.tone}
- Allowed narrative elements: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- Denied narrative elements: ${config.narrativeElements.denied.join(', ') || 'None specified'}
- Target word count: ${config.targetWordCount}

User request: ${userPrompt}

Generate a detailed outline following the structure described in the system prompt. The outline should have 4-8 sections, each with a clear role and 3-5 sub-steps.

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
}`;

    let fullResponse = '';
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        fullResponse += chunk;
        onChunk(chunk);
      },
      (newResponseId) => {
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = fullResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          const jsonContent = jsonMatch ? jsonMatch[1].trim() : fullResponse.trim();
          
          const outline = JSON.parse(jsonContent) as DocumentOutline;
          onComplete(newResponseId, outline);
        } catch {
          console.error('Failed to parse JSON response:', fullResponse);
          onError(new Error('Invalid JSON response. Please try again.'));
        }
      },
      onError
    );
  }

  async generateSection(
    section: Section, 
    config: DocumentConfig, 
    outline: DocumentOutline,
    previousSections: Section[],
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, content: string, wordCount: number) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const previousContent = previousSections
      .map(s => `${s.title}:\n${s.content}`)
      .join('\n\n---\n\n');

    const prompt = `
Document Title: ${outline.title}
Current Section: ${section.title}
Section Role: ${section.role}
Sub-steps to cover: ${section.subSteps.join(', ')}

Document Configuration:
- Tone: ${config.tone}
- Allowed narrative elements: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- Denied narrative elements: ${config.narrativeElements.denied.join(', ') || 'None specified'}

${previousContent ? `Previous sections:\n${previousContent}\n\n` : ''}

Write a 400-800 word section that:
1. Fulfills the section's designated role
2. Covers all the sub-steps
3. Maintains the specified tone
4. Uses only allowed narrative elements
5. Avoids denied narrative elements
6. Flows naturally from previous sections (if any)

Write only the section content, no titles or metadata.`;

    let fullContent = '';
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        fullContent += chunk;
        onChunk(chunk);
      },
      (newResponseId) => {
        const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
        onComplete(newResponseId, fullContent, wordCount);
      },
      onError
    );
  }
}