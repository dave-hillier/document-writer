import OpenAI from 'openai';
import type { DocumentConfig, DocumentOutline, Section } from '../types';
import systemPromptContent from '../system-prompt.md?raw';

export class DocumentGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async generateOutline(config: DocumentConfig, userPrompt: string): Promise<DocumentOutline> {
    const prompt = `
Given the following document configuration:
- Tone: ${config.tone}
- Allowed narrative elements: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- Denied narrative elements: ${config.narrativeElements.denied.join(', ') || 'None specified'}
- Target word count: ${config.targetWordCount}

User request: ${userPrompt}

Generate a detailed outline following the structure described in the system prompt. The outline should have 4-8 sections, each with a clear role and 3-5 sub-steps.

Return the outline in this JSON format:
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

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPromptContent },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');
      
      return JSON.parse(content) as DocumentOutline;
    } catch (error) {
      console.error('Error generating outline:', error);
      throw error;
    }
  }

  async generateSection(
    section: Section, 
    config: DocumentConfig, 
    outline: DocumentOutline,
    previousSections: Section[]
  ): Promise<{ content: string; wordCount: number }> {
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

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPromptContent },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });

      const content = response.choices[0].message.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      return { content, wordCount };
    } catch (error) {
      console.error('Error generating section:', error);
      throw error;
    }
  }
}