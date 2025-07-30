import OpenAI from 'openai';
import type { DocumentOutline } from '../types';

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

const OUTLINE_EXTRACTION_PROMPT = `You are an expert at analyzing documents and extracting their structural outline.

Given a document, extract its outline in the following JSON format:
{
  "title": "Document Title",
  "sections": [
    {
      "title": "Section Title",
      "role": "Introduction|Background/Context|Problem/Challenge|Analysis|Solution/Approach|Implementation|Results/Outcomes|Conclusion",
      "subSteps": [
        "First key point or sub-topic",
        "Second key point or sub-topic",
        "Third key point or sub-topic",
        "Fourth key point or sub-topic (optional)",
        "Fifth key point or sub-topic (optional)"
      ]
    }
  ]
}

Guidelines:
1. Extract the main title and logical sections from the document
2. Assign appropriate roles to each section based on its purpose
3. For each section, identify 3-5 key sub-steps or topics covered
4. Ensure the outline captures the document's structure, not just its content
5. Use clear, concise language for titles and sub-steps
6. If the document doesn't have clear sections, infer logical divisions

Return ONLY valid JSON without any markdown formatting or explanation.`;

export async function extractOutlineFromFile(file: File): Promise<DocumentOutline> {
  const openai = getOpenAIClient();
  
  try {
    // Read file content
    const content = await file.text();
    
    // Extract outline using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: OUTLINE_EXTRACTION_PROMPT
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
      sections: (outlineData.sections || []).map((section: { title: string; role: string; subSteps?: string[] }, index: number) => ({
        id: `section-${Date.now()}-${index}`,
        title: section.title,
        role: section.role,
        subSteps: section.subSteps || []
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
    markdown += '\n';
  });
  
  return markdown;
}