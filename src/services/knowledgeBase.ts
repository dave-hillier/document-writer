import type { KnowledgeBase, KnowledgeBaseFile, QueryTestResult } from '../types';
import type { ComparisonFilter, CompoundFilter } from 'openai/resources/shared';
import * as vectorStore from './vectorStore';
import { indexedDBService } from './indexeddb';
import { v4 as uuidv4 } from 'uuid';

export const createKnowledgeBase = async (name: string, description?: string): Promise<KnowledgeBase> => {
  try {
    // Create vector store in OpenAI
    const { id: vectorStoreId } = await vectorStore.createVectorStore(name);
    
    // Create knowledge base metadata
    const knowledgeBase: KnowledgeBase = {
      id: uuidv4(),
      name,
      description,
      vectorStoreId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileCount: 0
    };
    
    // Save to IndexedDB
    await indexedDBService.saveKnowledgeBase(knowledgeBase);
    
    return knowledgeBase;
  } catch (error) {
    console.error('Failed to create knowledge base:', error);
    throw error;
  }
};

export const updateKnowledgeBase = async (
  knowledgeBaseId: string,
  updates: { name?: string; description?: string }
): Promise<KnowledgeBase> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // Update vector store name if changed
    if (updates.name && updates.name !== knowledgeBase.name) {
      await vectorStore.updateVectorStore(knowledgeBase.vectorStoreId, updates.name);
    }
    
    // Update metadata
    const updatedKnowledgeBase: KnowledgeBase = {
      ...knowledgeBase,
      ...updates,
      updatedAt: Date.now()
    };
    
    await indexedDBService.saveKnowledgeBase(updatedKnowledgeBase);
    
    return updatedKnowledgeBase;
  } catch (error) {
    console.error('Failed to update knowledge base:', error);
    throw error;
  }
};

export const deleteKnowledgeBase = async (knowledgeBaseId: string): Promise<void> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // Delete from OpenAI
    await vectorStore.deleteVectorStore(knowledgeBase.vectorStoreId);
    
    // Delete from IndexedDB
    await indexedDBService.deleteKnowledgeBase(knowledgeBaseId);
  } catch (error) {
    console.error('Failed to delete knowledge base:', error);
    throw error;
  }
};

export const getAllKnowledgeBases = async (): Promise<KnowledgeBase[]> => {
  try {
    console.log('Getting all knowledge bases from IndexedDB...');
    const knowledgeBases = await indexedDBService.getAllKnowledgeBases();
    console.log('Retrieved knowledge bases:', knowledgeBases);
    return knowledgeBases;
  } catch (error) {
    console.error('Failed to get knowledge bases:', error);
    throw error;
  }
};

export const uploadFile = async (
  knowledgeBaseId: string,
  file: File,
  attributes?: Record<string, unknown>
): Promise<KnowledgeBaseFile> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // Upload to OpenAI
    const { fileId, filename } = await vectorStore.uploadFile(
      knowledgeBase.vectorStoreId,
      file,
      attributes
    );
    
    // Store file metadata in IndexedDB for faster access
    await indexedDBService.saveFileMetadata({
      fileId,
      knowledgeBaseId,
      filename,
      size: file.size,
      uploadedAt: Date.now(),
      attributes
    });
    
    // Create file response
    const knowledgeBaseFile: KnowledgeBaseFile = {
      id: fileId,
      filename,
      size: file.size,
      uploadedAt: Date.now(),
      attributes,
      status: 'completed'
    };
    
    // Update file count
    await updateFileCount(knowledgeBaseId);
    
    return knowledgeBaseFile;
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
};

export const deleteFile = async (knowledgeBaseId: string, fileId: string): Promise<void> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // Delete from OpenAI
    await vectorStore.deleteFile(knowledgeBase.vectorStoreId, fileId);
    
    // Delete file metadata from IndexedDB
    await indexedDBService.deleteFileMetadata(fileId);
    
    // Update file count
    await updateFileCount(knowledgeBaseId);
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw error;
  }
};

export const getFiles = async (knowledgeBaseId: string): Promise<KnowledgeBaseFile[]> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // First try to get files from IndexedDB (faster and includes size info)
    try {
      const localFiles = await indexedDBService.getFileMetadataByKnowledgeBase(knowledgeBaseId);
      if (localFiles.length > 0) {
        return localFiles.map(file => ({
          id: file.fileId,
          filename: file.filename,
          size: file.size || 0,
          uploadedAt: file.uploadedAt,
          status: 'completed',
          attributes: file.attributes
        }));
      }
    } catch (error) {
      console.warn('Failed to get files from IndexedDB, falling back to API:', error);
    }
    
    // Fallback to OpenAI API if IndexedDB is empty or fails
    const files = await vectorStore.listFiles(knowledgeBase.vectorStoreId);
    
    // Store the retrieved files in IndexedDB for future use
    for (const file of files) {
      try {
        await indexedDBService.saveFileMetadata({
          fileId: file.id,
          knowledgeBaseId,
          filename: file.filename,
          uploadedAt: file.createdAt
        });
      } catch (error) {
        console.warn('Failed to cache file metadata:', error);
      }
    }
    
    return files.map(file => ({
      id: file.id,
      filename: file.filename,
      size: 0, // Not available from API
      uploadedAt: file.createdAt,
      status: file.status === 'completed' ? 'completed' : 'processing'
    }));
  } catch (error) {
    console.error('Failed to get files:', error);
    throw error;
  }
};

export const search = async (
  knowledgeBaseId: string,
  query: string,
  options?: {
    maxResults?: number;
    rewriteQuery?: boolean;
    attributeFilter?: ComparisonFilter | CompoundFilter;
  }
): Promise<QueryTestResult> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    const startTime = Date.now();
    
    const { results, rewrittenQuery } = await vectorStore.search(
      knowledgeBase.vectorStoreId,
      query,
      options
    );
    
    const searchTime = Date.now() - startTime;
    
    return {
      query,
      rewrittenQuery,
      results,
      searchTime,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to search knowledge base:', error);
    throw error;
  }
};

export const getUsageStats = async (knowledgeBaseId: string): Promise<{
  totalSize: number;
  fileCount: number;
  costEstimate: number;
}> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    const stats = await vectorStore.getUsageStats(knowledgeBase.vectorStoreId);
    
    // Calculate cost: $0.10/GB/day, first 1GB free
    const gbUsed = stats.totalSize / (1024 * 1024 * 1024);
    const costPerDay = gbUsed > 1 ? (gbUsed - 1) * 0.10 : 0;
    
    return {
      ...stats,
      costEstimate: costPerDay
    };
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    throw error;
  }
};

const updateFileCount = async (knowledgeBaseId: string): Promise<void> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      return;
    }
    
    const stats = await vectorStore.getUsageStats(knowledgeBase.vectorStoreId);
    
    const updatedKnowledgeBase: KnowledgeBase = {
      ...knowledgeBase,
      fileCount: stats.fileCount,
      updatedAt: Date.now()
    };
    
    await indexedDBService.saveKnowledgeBase(updatedKnowledgeBase);
  } catch (error) {
    console.error('Failed to update file count:', error);
  }
};