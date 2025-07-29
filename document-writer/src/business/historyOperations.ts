import { indexedDBService } from '../services/indexeddb';
import type { AppState, DocumentHistoryItem } from '../types';

export async function saveCurrentDocument(state: AppState): Promise<void> {
  if (!state.currentDocumentId || !state.outline) {
    return;
  }

  const documentItem: DocumentHistoryItem = {
    id: state.currentDocumentId,
    title: state.outline.title,
    createdAt: Date.now(), // This will be overwritten if document already exists in DB
    updatedAt: Date.now(),
    config: state.documentConfig,
    outline: state.outline,
    sections: state.sections,
    url: `/document/${state.currentDocumentId}`
  };

  // If document already exists, preserve the creation date
  const existingDocument = await indexedDBService.getDocument(state.currentDocumentId);
  if (existingDocument) {
    documentItem.createdAt = existingDocument.createdAt;
  }

  await indexedDBService.saveDocument(documentItem);
}

export async function loadDocumentHistory(): Promise<DocumentHistoryItem[]> {
  try {
    return await indexedDBService.getAllDocuments();
  } catch (error) {
    console.error('Failed to load document history:', error);
    return [];
  }
}

export async function deleteDocumentFromHistory(documentId: string): Promise<void> {
  await indexedDBService.deleteDocument(documentId);
}

export async function searchDocumentHistory(query: string): Promise<DocumentHistoryItem[]> {
  try {
    return await indexedDBService.searchDocuments(query);
  } catch (error) {
    console.error('Failed to search document history:', error);
    return [];
  }
}