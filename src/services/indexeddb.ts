import type { DocumentHistoryItem } from '../types';

const DB_NAME = 'DocumentWriterDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
    });
  }

  async saveDocument(document: DocumentHistoryItem): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put({
        ...document,
        updatedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save document'));
    });
  }

  async getDocument(id: string): Promise<DocumentHistoryItem | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(new Error('Failed to get document'));
    });
  }

  async getAllDocuments(): Promise<DocumentHistoryItem[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev'); // Most recently updated first
      
      const documents: DocumentHistoryItem[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          documents.push(cursor.value);
          cursor.continue();
        } else {
          resolve(documents);
        }
      };

      request.onerror = () => reject(new Error('Failed to get all documents'));
    });
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete document'));
    });
  }

  async searchDocuments(query: string): Promise<DocumentHistoryItem[]> {
    const allDocuments = await this.getAllDocuments();
    const lowerQuery = query.toLowerCase();
    
    return allDocuments.filter(doc => 
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.outline.sections.some(section => 
        section.title.toLowerCase().includes(lowerQuery) ||
        (section.content && section.content.toLowerCase().includes(lowerQuery))
      )
    );
  }

  async getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return null;
  }
}

export const indexedDBService = new IndexedDBService();