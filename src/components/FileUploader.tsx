import { useState, useRef, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import * as knowledgeBaseService from '../services/knowledgeBase';
import type { KnowledgeBaseFile } from '../types';

interface FileUploaderProps {
  knowledgeBaseId: string;
  knowledgeBaseService: typeof knowledgeBaseService;
}

interface UploadQueueItem {
  file: File;
  id: string;
}

function hashFile(file: File): string {
  const input = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function FileUploader({ knowledgeBaseId, knowledgeBaseService }: FileUploaderProps) {
  const { state, dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files = state.knowledgeBaseFiles[knowledgeBaseId] || [];
  const batchState = state.uploadBatchState[knowledgeBaseId];

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

    if (validFiles.length === 0) return;

    // Create queue items and add files to state as 'queued'
    const queueItems: UploadQueueItem[] = [];
    const tempFiles: KnowledgeBaseFile[] = [];
    
    for (const file of validFiles) {
      const id = `temp_${hashFile(file)}`;
      queueItems.push({ file, id });
      tempFiles.push({
        id,
        filename: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        status: 'queued',
        progress: 0
      });
    }

    // Add all files to state as queued
    dispatch({
      type: 'KNOWLEDGE_BASE_FILES_LOADED',
      payload: {
        knowledgeBaseId,
        files: [...files, ...tempFiles]
      }
    });

    // Start batch upload
    dispatch({
      type: 'UPLOAD_BATCH_STARTED',
      payload: { knowledgeBaseId, totalFiles: validFiles.length }
    });

    setUploadQueue(prev => [...prev, ...queueItems]);
    
    if (!isUploading) {
      processUploadQueue();
    }
  };

  const processUploadQueue = async () => {
    setIsUploading(true);
    
    // Process queue items one by one, checking state each time
    while (true) {
      // Get current queue from state
      const currentItem = await new Promise<UploadQueueItem | undefined>(resolve => {
        setUploadQueue(queue => {
          resolve(queue[0]);
          return queue;
        });
      });
      
      if (!currentItem) break;
      
      // Update status to uploading
      dispatch({
        type: 'KNOWLEDGE_BASE_FILE_UPLOAD_STARTED',
        payload: {
          knowledgeBaseId,
          file: {
            id: currentItem.id,
            filename: currentItem.file.name,
            size: currentItem.file.size,
            uploadedAt: Date.now(),
            status: 'uploading',
            progress: 0
          }
        }
      });

      try {
        // Create a progress callback
        const progressCallback = (progress: number, stage: string) => {
          dispatch({
            type: 'KNOWLEDGE_BASE_FILE_PROGRESS_UPDATED',
            payload: {
              knowledgeBaseId,
              fileId: currentItem.id,
              progress,
              stage
            }
          });
        };

        const uploadedFile = await knowledgeBaseService.uploadFileWithProgress(
          knowledgeBaseId, 
          currentItem.file, 
          progressCallback
        );
        
        // First update the batch state
        dispatch({
          type: 'KNOWLEDGE_BASE_FILE_UPLOAD_COMPLETED',
          payload: { knowledgeBaseId, fileId: currentItem.id }
        });

        // Then immediately replace the temporary file with the uploaded file
        // This ensures the file doesn't appear in both sections
        dispatch({
          type: 'KNOWLEDGE_BASE_FILES_LOADED',
          payload: {
            knowledgeBaseId,
            files: state.knowledgeBaseFiles[knowledgeBaseId].map(f => 
              f.id === currentItem.id ? { ...uploadedFile, status: 'completed' } : f
            )
          }
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
        dispatch({
          type: 'KNOWLEDGE_BASE_FILE_UPLOAD_FAILED',
          payload: {
            knowledgeBaseId,
            fileId: currentItem.id,
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        });
      }
      
      // Remove processed item from queue
      setUploadQueue(queue => queue.slice(1));
    }
    
    setIsUploading(false);
    
    // Mark batch as completed and reload files from server
    if (batchState?.isUploading) {
      dispatch({
        type: 'UPLOAD_BATCH_COMPLETED',
        payload: { knowledgeBaseId }
      });
      // Reload files from server to ensure we have the complete list
      await loadFiles();
    }
  };

  useEffect(() => {
    if (uploadQueue.length > 0 && !isUploading) {
      processUploadQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadQueue]);

  const handleDelete = async (file: KnowledgeBaseFile) => {
    if (!confirm(`Delete "${file.filename}"?`)) return;

    setDeletingFiles(prev => new Set(prev).add(file.id));
    
    try {
      await knowledgeBaseService.deleteFile(knowledgeBaseId, file.id);
      dispatch({
        type: 'KNOWLEDGE_BASE_FILE_DELETED',
        payload: { knowledgeBaseId, fileId: file.id }
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    } finally {
      setDeletingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const handleCancelAll = () => {
    setUploadQueue([]);
    dispatch({
      type: 'UPLOAD_BATCH_CANCELLED',
      payload: { knowledgeBaseId }
    });
  };

  const handleRetryFailed = () => {
    // For retry functionality, we would need to store the original File objects
    // For now, we'll just show an alert
    alert('To retry failed uploads, please select the files again.');
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
      case 'queued':
        return <File size={16} aria-hidden="true" style={{ opacity: 0.5 }} />;
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

  const getOverallProgress = () => {
    if (!batchState || batchState.totalFiles === 0) return 0;
    
    // Use batch state counts for completed/failed files
    const completedCount = batchState.completedFiles + batchState.failedFiles;
    const remainingFiles = batchState.totalFiles - completedCount;
    
    // Calculate progress: completed files are 100% each
    let totalProgress = completedCount * 100;
    
    // Add progress for currently uploading files
    if (remainingFiles > 0) {
      const uploadingFiles = files.filter(f => f.status === 'uploading');
      totalProgress += uploadingFiles.reduce((sum, file) => sum + (file.progress || 0), 0);
    }
    
    // Calculate percentage based on total possible progress (totalFiles * 100)
    return Math.round(totalProgress / (batchState.totalFiles * 100) * 100);
  };

  return (
    <section className="file-uploader">
      {batchState?.isUploading && (
        <div className="upload-progress-summary">
          <div className="progress-header">
            <h3>Uploading Files</h3>
            <button onClick={handleCancelAll} className="secondary cancel-all-button">
              Cancel All
            </button>
          </div>
          <div className="progress-stats">
            <span>{batchState.completedFiles + batchState.failedFiles} of {batchState.totalFiles} files</span>
            <span>{getOverallProgress()}% complete</span>
          </div>
          <progress value={getOverallProgress()} max="100" />
          {batchState.failedFiles > 0 && (
            <div className="failed-info">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{batchState.failedFiles} failed</span>
              <button onClick={handleRetryFailed} className="link-button">Retry</button>
            </div>
          )}
        </div>
      )}

      {batchState && !batchState.isUploading && batchState.completedAt && (
        <div className="upload-completion-summary">
          <CheckCircle size={20} aria-hidden="true" />
          <div>
            <h3>Upload Complete</h3>
            <p>{batchState.completedFiles} files uploaded successfully{batchState.failedFiles > 0 && `, ${batchState.failedFiles} failed`}</p>
          </div>
        </div>
      )}

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
        <>
          {files.filter(f => f.status === 'queued' || f.status === 'uploading').length > 0 && (
            <div className="file-section">
              <h4>Uploading</h4>
              <ul className="file-list">
                {files
                  .filter(f => f.status === 'queued' || f.status === 'uploading')
                  .map(file => (
                    <li key={file.id} className={`file-item ${file.status}`}>
                      <div className="file-info">
                        {getFileIcon(file.status)}
                        <span className="filename">{file.filename}</span>
                        {file.status === 'uploading' && (
                          <output className="upload-status">
                            {file.progress !== undefined && (
                              <data value={file.progress} className="file-progress">{file.progress}%</data>
                            )}
                            {file.stage && (
                              <small className="file-stage">{file.stage}</small>
                            )}
                          </output>
                        )}
                        {file.status === 'queued' && (
                          <span className="file-status">Queued</span>
                        )}
                        {file.size > 0 && (
                          <data value={file.size} className="file-size">{formatFileSize(file.size)}</data>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          
          {files.filter(f => f.status === 'completed' || f.status === 'failed').length > 0 && (
            <div className="file-section">
              <h4>Uploaded Files</h4>
              <ul className="file-list">
                {files
                  .filter(f => f.status === 'completed' || f.status === 'failed')
                  .map(file => (
                    <li key={file.id} className={`file-item ${file.status}`}>
                      <div className="file-info">
                        {getFileIcon(file.status)}
                        <span className="filename">{file.filename}</span>
                        {file.status === 'failed' && file.error && (
                          <span className="file-error" title={file.error}>Failed</span>
                        )}
                        {file.size > 0 && (
                          <data value={file.size} className="file-size">{formatFileSize(file.size)}</data>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(file)}
                        className="delete-button"
                        aria-label={`Delete ${file.filename}`}
                        disabled={file.status === 'uploading' || file.status === 'processing' || deletingFiles.has(file.id)}
                      >
                        {deletingFiles.has(file.id) ? (
                          <Loader className="spinning" size={16} aria-hidden="true" />
                        ) : (
                          <X size={16} aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}

      <style>{`
        .upload-progress-summary {
          background: var(--primary-background);
          border: 1px solid var(--primary);
          border-radius: var(--border-radius);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .progress-header h3 {
          margin: 0;
          font-size: 1rem;
        }

        .cancel-all-button {
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--muted-color);
          margin-bottom: 0.5rem;
        }

        .failed-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          color: var(--del-color);
          font-size: 0.875rem;
        }

        .link-button {
          background: none;
          border: none;
          color: var(--primary);
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .upload-completion-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--ins-background);
          border: 1px solid var(--ins-color);
          border-radius: var(--border-radius);
          margin-bottom: 1rem;
        }

        .upload-completion-summary h3 {
          margin: 0;
          font-size: 1rem;
        }

        .upload-completion-summary p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--muted-color);
        }

        .file-section {
          margin-top: 1.5rem;
        }

        .file-section h4 {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          color: var(--muted-color);
        }

        output.upload-status {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        data.file-progress,
        .file-status {
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 500;
        }

        small.file-stage {
          font-size: 0.7rem;
          color: var(--muted-color);
          font-style: italic;
        }

        data.file-size {
          color: var(--muted-color);
          font-size: 0.875rem;
        }

        .file-error {
          font-size: 0.75rem;
          color: var(--del-color);
          font-weight: 500;
        }
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
    </section>
  );
}