import { useState, useEffect, useRef } from 'react';
import { X, Download, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { DocumentHistoryItem } from '../types';
import { exportDocumentAsMarkdown } from '../business/exportUtils';

interface DocumentPreviewProps {
  document: DocumentHistoryItem;
  isOpen: boolean;
  onClose: () => void;
  context: 'lucky' | 'editor';
  onCreateSimilar?: () => void;
  onNewLucky?: () => void;
}

export function DocumentPreview({ 
  document, 
  isOpen, 
  onClose, 
  context,
  onCreateSimilar,
  onNewLucky 
}: DocumentPreviewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      // Only call onClose if the dialog was actually open
      // This prevents calling onClose when we programmatically close the dialog
      if (isOpen) {
        onClose();
      }
    };

    const handleCancel = (e: Event) => {
      // Prevent default cancel behavior and call our close handler
      e.preventDefault();
      onClose();
    };

    const handleBackdropClick = (e: MouseEvent) => {
      // Close dialog when clicking on the backdrop (outside the dialog content)
      if (e.target === dialog) {
        onClose();
      }
    };

    if (isOpen) {
      dialog.showModal();
      dialog.addEventListener('close', handleClose);
      dialog.addEventListener('cancel', handleCancel);
      dialog.addEventListener('click', handleBackdropClick);
    } else {
      dialog.close();
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [isOpen, onClose]);

  const handleExport = async () => {
    if (!document) return;
    
    setIsExporting(true);
    try {
      exportDocumentAsMarkdown(document.outline, document.sections);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const calculateStats = () => {
    const totalWords = document.sections.reduce((sum, section) => sum + (section.wordCount || 0), 0);
    const completedSections = document.sections.filter(s => s.content && s.content.trim()).length;
    
    return {
      totalWords,
      totalSections: document.sections.length,
      completedSections,
      completionPercentage: Math.round((completedSections / document.sections.length) * 100)
    };
  };

  const renderMarkdownPreview = () => {
    let markdown = `# ${document.outline.title}\n\n`;
    
    document.sections.forEach(section => {
      if (section.content && section.content.trim()) {
        markdown += `## ${section.title}\n\n${section.content}\n\n`;
      }
    });
    
    return markdown;
  };

  const stats = calculateStats();

  if (!isOpen) return null;

  return (
    <dialog 
      ref={dialogRef}
      className="document-preview-modal"
      aria-labelledby="preview-title"
      aria-describedby="preview-description"
    >
      <article className="document-preview-container">
        <header className="document-preview-header">
          <div>
            <h2 id="preview-title">Document Preview</h2>
            <p id="preview-description">
              {stats.totalWords.toLocaleString()} words • {stats.completedSections}/{stats.totalSections} sections complete
            </p>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close preview"
          >
            <X size={24} />
          </button>
        </header>

        <section className="document-stats">
          <div className="stat-item">
            <strong>Title:</strong> {document.title}
          </div>
          <div className="stat-item">
            <strong>Target Words:</strong> {document.config.targetWordCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Progress:</strong> {stats.completionPercentage}%
          </div>
        </section>

        <section className="document-content" aria-label="Document content preview">
          <div className="markdown-preview">
            <ReactMarkdown>
              {renderMarkdownPreview()}
            </ReactMarkdown>
          </div>
        </section>

        <footer className="document-preview-actions">
          <div className="action-group">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="primary"
              aria-busy={isExporting}
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export Document'}
            </button>
          </div>

          <div className="action-group">
            {context === 'lucky' && (
              <>
                {onCreateSimilar && (
                  <button
                    onClick={onCreateSimilar}
                    className="secondary"
                  >
                    <FileText size={16} />
                    Create Similar
                  </button>
                )}
                {onNewLucky && (
                  <button
                    onClick={onNewLucky}
                    className="secondary"
                  >
                    New Lucky Document
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={onClose}
              className="outline"
            >
              Close Preview
            </button>
          </div>
        </footer>
      </article>
    </dialog>
  );
}