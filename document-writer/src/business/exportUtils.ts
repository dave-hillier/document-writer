import type { DocumentOutline, Section } from '../types';

export function exportDocumentAsMarkdown(outline: DocumentOutline, sections: Section[]): void {
  const content = [
    `# ${outline.title}`,
    '',
    ...sections.map(section => [
      `## ${section.title}`,
      '',
      section.content || '[Section not generated]',
      ''
    ]).flat()
  ].join('\n');

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${outline.title.toLowerCase().replace(/\s+/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}