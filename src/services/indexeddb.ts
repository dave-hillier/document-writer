import type { DocumentHistoryItem, KnowledgeBase } from '../types';

const DB_NAME = 'DocumentWriterDB';
const DB_VERSION = 3;
const DOCUMENTS_STORE = 'documents';
const KNOWLEDGE_BASES_STORE = 'knowledgeBases';
const FILE_METADATA_STORE = 'fileMetadata';

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const store = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
        
        // Create knowledge bases store
        if (!db.objectStoreNames.contains(KNOWLEDGE_BASES_STORE)) {
          const kbStore = db.createObjectStore(KNOWLEDGE_BASES_STORE, { keyPath: 'id' });
          kbStore.createIndex('createdAt', 'createdAt', { unique: false });
          kbStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          kbStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create file metadata store
        if (!db.objectStoreNames.contains(FILE_METADATA_STORE)) {
          const fileStore = db.createObjectStore(FILE_METADATA_STORE, { keyPath: 'fileId' });
          fileStore.createIndex('knowledgeBaseId', 'knowledgeBaseId', { unique: false });
          fileStore.createIndex('filename', 'filename', { unique: false });
          fileStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
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
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
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
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
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
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
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
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
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

  // Knowledge Base methods
  async saveKnowledgeBase(knowledgeBase: KnowledgeBase): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KNOWLEDGE_BASES_STORE], 'readwrite');
      const store = transaction.objectStore(KNOWLEDGE_BASES_STORE);
      
      const request = store.put(knowledgeBase);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save knowledge base'));
    });
  }

  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KNOWLEDGE_BASES_STORE], 'readonly');
      const store = transaction.objectStore(KNOWLEDGE_BASES_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(new Error('Failed to get knowledge base'));
    });
  }

  async getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([KNOWLEDGE_BASES_STORE], 'readonly');
        const store = transaction.objectStore(KNOWLEDGE_BASES_STORE);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev'); // Most recently updated first
        
        const knowledgeBases: KnowledgeBase[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            knowledgeBases.push(cursor.value);
            cursor.continue();
          } else {
            resolve(knowledgeBases);
          }
        };

        request.onerror = () => reject(new Error('Failed to get all knowledge bases'));
        
        transaction.onerror = () => reject(new Error('Transaction failed'));
      } catch (error) {
        console.error('Error accessing knowledge bases store:', error);
        reject(error);
      }
    });
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KNOWLEDGE_BASES_STORE], 'readwrite');
      const store = transaction.objectStore(KNOWLEDGE_BASES_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete knowledge base'));
    });
  }

  // File metadata methods
  async saveFileMetadata(fileMetadata: {
    fileId: string;
    knowledgeBaseId: string;
    filename: string;
    size?: number;
    uploadedAt: number;
    attributes?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(FILE_METADATA_STORE);
      
      const request = store.put(fileMetadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save file metadata'));
    });
  }

  async getFileMetadata(fileId: string): Promise<{
    fileId: string;
    knowledgeBaseId: string;
    filename: string;
    size?: number;
    uploadedAt: number;
    attributes?: Record<string, unknown>;
  } | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_METADATA_STORE], 'readonly');
      const store = transaction.objectStore(FILE_METADATA_STORE);
      const request = store.get(fileId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(new Error('Failed to get file metadata'));
    });
  }

  async getFileMetadataByKnowledgeBase(knowledgeBaseId: string): Promise<Array<{
    fileId: string;
    knowledgeBaseId: string;
    filename: string;
    size?: number;
    uploadedAt: number;
    attributes?: Record<string, unknown>;
  }>> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_METADATA_STORE], 'readonly');
      const store = transaction.objectStore(FILE_METADATA_STORE);
      const index = store.index('knowledgeBaseId');
      const request = index.openCursor(IDBKeyRange.only(knowledgeBaseId));
      
      const files: Array<{
        fileId: string;
        knowledgeBaseId: string;
        filename: string;
        size?: number;
        uploadedAt: number;
        attributes?: Record<string, unknown>;
      }> = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          files.push(cursor.value);
          cursor.continue();
        } else {
          resolve(files);
        }
      };

      request.onerror = () => reject(new Error('Failed to get file metadata by knowledge base'));
    });
  }

  async deleteFileMetadata(fileId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILE_METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(FILE_METADATA_STORE);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete file metadata'));
    });
  }

  async resetDatabase(): Promise<void> {
    // Close existing connection
    this.close();
    
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME);
      
      deleteReq.onsuccess = () => {
        console.log('Database deleted successfully');
        resolve();
      };
      
      deleteReq.onerror = () => {
        console.error('Error deleting database');
        reject(new Error('Failed to delete database'));
      };
      
      deleteReq.onblocked = () => {
        console.warn('Database deletion blocked - close all tabs and try again');
        reject(new Error('Database deletion blocked - close all tabs using this app'));
      };
    });
  }
}

export const indexedDBService = new IndexedDBService();