import { useState, useRef, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import * as knowledgeBaseService from '../services/knowledgeBase';
import type { KnowledgeBaseFile } from '../types';

interface FileUploaderProps {
  knowledgeBaseId: string;
  knowledgeBaseService: typeof knowledgeBaseService;
}

export function FileUploader({ knowledgeBaseId, knowledgeBaseService }: FileUploaderProps) {
  const { state, dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files = state.knowledgeBaseFiles[knowledgeBaseId] || [];

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeBaseId]);

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const loadedFiles = await knowledgeBaseService.getFiles(knowledgeBaseId);
      dispatch({
        type: 'KNOWLEDGE_BASE_FILES_LOADED',
        payload: { knowledgeBaseId, files: loadedFiles }
      });
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (uploadFiles: File[]) => {
    // Filter supported file types
    const supportedTypes = [
      '.c', '.cpp', '.cs', '.css', '.doc', '.docx', '.go', '.html', '.java',
      '.js', '.json', '.md', '.pdf', '.php', '.pptx', '.py', '.rb', '.sh',
      '.tex', '.ts', '.txt'
    ];
    
    const validFiles = uploadFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return supportedTypes.includes(extension);
    });

    if (validFiles.length !== uploadFiles.length) {
      alert(`Some files were skipped. Supported formats: ${supportedTypes.join(', ')}`);
    }

    // Upload each file
    for (const file of validFiles) {
      const tempFile: KnowledgeBaseFile = {
        id: `temp_${Date.now()}_${Math.random()}`,
        filename: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        status: 'uploading'
      };

      dispatch({
        type: 'KNOWLEDGE_BASE_FILE_UPLOAD_STARTED',
        payload: { knowledgeBaseId, file: tempFile }
      });

      try {
        const uploadedFile = await knowledgeBaseService.uploadFile(knowledgeBaseId, file);
        
        dispatch({
          type: 'KNOWLEDGE_BASE_FILE_UPLOAD_COMPLETED',
          payload: { knowledgeBaseId, fileId: tempFile.id }
        });

        // Update with real file data
        dispatch({
          type: 'KNOWLEDGE_BASE_FILES_LOADED',
          payload: {
            knowledgeBaseId,
            files: [
              ...files.filter(f => f.id !== tempFile.id),
              uploadedFile
            ]
          }
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
        dispatch({
          type: 'KNOWLEDGE_BASE_FILE_UPLOAD_FAILED',
          payload: {
            knowledgeBaseId,
            fileId: tempFile.id,
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        });
      }
    }
  };

  const handleDelete = async (file: KnowledgeBaseFile) => {
    if (!confirm(`Delete "${file.filename}"?`)) return;

    try {
      await knowledgeBaseService.deleteFile(knowledgeBaseId, file.id);
      dispatch({
        type: 'KNOWLEDGE_BASE_FILE_DELETED',
        payload: { knowledgeBaseId, fileId: file.id }
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader className="spinning" size={16} aria-hidden="true" />;
      case 'completed':
        return <CheckCircle size={16} aria-hidden="true" />;
      case 'failed':
        return <AlertCircle size={16} aria-hidden="true" />;
      default:
        return <File size={16} aria-hidden="true" />;
    }
  };

  return (
    <div className="file-uploader">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
      >
        <Upload size={32} aria-hidden="true" />
        <p>Drag and drop files here or click to browse</p>
        <small>Supported: .txt, .pdf, .doc, .docx, .md, .js, .py, .java, etc.</small>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".c,.cpp,.cs,.css,.doc,.docx,.go,.html,.java,.js,.json,.md,.pdf,.php,.pptx,.py,.rb,.sh,.tex,.ts,.txt"
        />
      </div>

      {isLoadingFiles ? (
        <div aria-busy="true">Loading files...</div>
      ) : files.length === 0 ? (
        <p className="empty-state">No files uploaded yet</p>
      ) : (
        <ul className="file-list">
          {files.map(file => (
            <li key={file.id} className={`file-item ${file.status}`}>
              <div className="file-info">
                {getFileIcon(file.status)}
                <span className="filename">{file.filename}</span>
                {file.size > 0 && (
                  <span className="file-size">{formatFileSize(file.size)}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(file)}
                className="delete-button"
                aria-label={`Delete ${file.filename}`}
                disabled={file.status === 'uploading' || file.status === 'processing'}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .file-uploader {
          padding: 1rem 0;
        }

        .upload-zone {
          border: 2px dashed var(--muted-border-color);
          border-radius: var(--border-radius);
          padding: 3rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--card-background-color);
          color: var(--color);
        }

        .upload-zone:hover {
          border-color: var(--primary);
          background: var(--card-sectionning-background-color);
        }

        .upload-zone.dragging {
          border-color: var(--primary);
          background: var(--primary-background);
        }

        .upload-zone p {
          margin: 1rem 0 0.5rem;
          color: var(--color);
        }

        .upload-zone small {
          color: var(--muted-color);
        }

        .file-list {
          list-style: none;
          padding: 0;
          margin-top: 1rem;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--card-background-color);
          border-radius: var(--border-radius);
          margin-bottom: 0.5rem;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filename {
          font-weight: 500;
        }

        .file-size {
          color: var(--muted-color);
          font-size: 0.875rem;
        }

        .delete-button {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--muted-color);
          transition: color 0.2s;
        }

        .delete-button:hover:not(:disabled) {
          color: var(--del-color);
        }

        .delete-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-item.uploading,
        .file-item.processing {
          opacity: 0.7;
        }

        .file-item.failed {
          background: var(--del-background);
        }

        .empty-state {
          text-align: center;
          color: var(--muted-color);
          padding: 2rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}