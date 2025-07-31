import OpenAI from 'openai';
import type { DocumentOutline } from '../types';
import outlineExtractionPrompt from '../outline-extraction-prompt.md?raw';

const getOpenAIClient = (): OpenAI => {
  const apiKey = localStorage.getItem('openai-api-key');
  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in settings');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};


export async function extractOutlineFromFile(file: File): Promise<DocumentOutline> {
  const openai = getOpenAIClient();
  
  try {
    // Read file content
    const content = await file.text();
    
    // Extract outline using OpenAI
    const response = await openai.chat.completions.create({
      model: localStorage.getItem('openai-model-outline') || localStorage.getItem('openai-model') || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: outlineExtractionPrompt
        },
        {
          role: 'user',
          content: `Extract the outline from this document:\n\n${content.substring(0, 30000)}` // Limit content length
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const outlineData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add IDs to sections
    const outline: DocumentOutline = {
      title: outlineData.title || 'Untitled Document',
      sections: (outlineData.sections || []).map((section: { title: string; role: string; subSteps?: string[]; cues?: string[]; narrativeElements?: string[] }, index: number) => ({
        id: `section-${Date.now()}-${index}`,
        title: section.title,
        role: section.role,
        subSteps: section.subSteps || [],
        cues: section.cues || [],
        narrativeElements: section.narrativeElements || []
      }))
    };

    return outline;
  } catch (error) {
    console.error('Failed to extract outline:', error);
    throw new Error('Failed to extract document outline');
  }
}

export function outlineToMarkdown(outline: DocumentOutline): string {
  let markdown = `# ${outline.title}\n\n`;
  
  outline.sections.forEach((section, index) => {
    markdown += `## ${index + 1}. ${section.title}\n`;
    markdown += `**Role:** ${section.role}\n\n`;
    markdown += `**Key Points:**\n`;
    section.subSteps.forEach(step => {
      markdown += `- ${step}\n`;
    });
    
    if (section.cues && section.cues.length > 0) {
      markdown += `\n**Cues:**\n`;
      section.cues.forEach(cue => {
        markdown += `- ${cue}\n`;
      });
    }
    
    if (section.narrativeElements && section.narrativeElements.length > 0) {
      markdown += `\n**Narrative Elements:**\n`;
      section.narrativeElements.forEach(element => {
        markdown += `- ${element}\n`;
      });
    }
    
    markdown += '\n';
  });
  
  return markdown;
}