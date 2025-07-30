import type { KnowledgeBase, KnowledgeBaseFile, QueryTestResult } from '../types';
import type { ComparisonFilter, CompoundFilter } from 'openai/resources/shared';
import * as vectorStore from './vectorStore';
import { indexedDBService } from './indexeddb';
import { v4 as uuidv4 } from 'uuid';
import { extractOutlineFromFile, outlineToMarkdown } from './outlineExtractor';

export const createKnowledgeBase = async (name: string, description?: string): Promise<KnowledgeBase> => {
  try {
    // Create two vector stores in OpenAI - one for content, one for outlines
    const [contentStore, outlineStore] = await Promise.all([
      vectorStore.createVectorStore(`${name} - Content`),
      vectorStore.createVectorStore(`${name} - Outlines`)
    ]);
    
    // Create knowledge base metadata
    const knowledgeBase: KnowledgeBase = {
      id: uuidv4(),
      name,
      description,
      vectorStoreId: contentStore.id,
      outlineVectorStoreId: outlineStore.id,
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
    
    // Delete both vector stores from OpenAI
    const deletePromises = [vectorStore.deleteVectorStore(knowledgeBase.vectorStoreId)];
    if (knowledgeBase.outlineVectorStoreId) {
      deletePromises.push(vectorStore.deleteVectorStore(knowledgeBase.outlineVectorStoreId));
    }
    await Promise.all(deletePromises);
    
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
    
    // Upload original file to content vector store
    const { fileId, filename } = await vectorStore.uploadFile(
      knowledgeBase.vectorStoreId,
      file,
      attributes
    );
    
    let outlineFileId: string | undefined;
    
    // Extract and upload outline if outline store exists
    if (knowledgeBase.outlineVectorStoreId) {
      try {
        // Extract outline from file
        const outline = await extractOutlineFromFile(file);
        
        // Convert outline to markdown format
        const outlineMarkdown = outlineToMarkdown(outline);
        
        // Create a new file with the outline
        const outlineFile = new File(
          [outlineMarkdown], 
          `${filename}_outline.md`,
          { type: 'text/markdown' }
        );
        
        // Upload outline to outline vector store
        const outlineUpload = await vectorStore.uploadFile(
          knowledgeBase.outlineVectorStoreId,
          outlineFile,
          { 
            originalFileId: fileId,
            type: 'outline'
          }
        );
        
        outlineFileId = outlineUpload.fileId;
      } catch (error) {
        console.error('Failed to extract/upload outline:', error);
        // Continue without outline - don't fail the entire upload
      }
    }
    
    // Store file metadata in IndexedDB for faster access
    await indexedDBService.saveFileMetadata({
      fileId,
      knowledgeBaseId,
      filename,
      size: file.size,
      uploadedAt: Date.now(),
      attributes,
      outlineFileId
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
    
    // Get file metadata to find outline file ID
    const fileMetadata = await indexedDBService.getFileMetadata(fileId);
    
    // Delete from content vector store
    await vectorStore.deleteFile(knowledgeBase.vectorStoreId, fileId);
    
    // Delete outline file if it exists
    if (fileMetadata?.outlineFileId && knowledgeBase.outlineVectorStoreId) {
      try {
        await vectorStore.deleteFile(knowledgeBase.outlineVectorStoreId, fileMetadata.outlineFileId);
      } catch (error) {
        console.error('Failed to delete outline file:', error);
        // Continue even if outline deletion fails
      }
    }
    
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
    searchOutlines?: boolean;
  }
): Promise<QueryTestResult> => {
  try {
    const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    // Determine which vector store to search
    const vectorStoreId = options?.searchOutlines && knowledgeBase.outlineVectorStoreId
      ? knowledgeBase.outlineVectorStoreId
      : knowledgeBase.vectorStoreId;
    
    const startTime = Date.now();
    
    const { results, rewrittenQuery } = await vectorStore.search(
      vectorStoreId,
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