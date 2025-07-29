import type { KnowledgeBase, KnowledgeBaseFile, QueryTestResult } from '../types';
import type { ComparisonFilter, CompoundFilter } from 'openai/resources/shared';
import { VectorStoreService } from './vectorStore';
import { indexedDBService } from './indexeddb';
import { v4 as uuidv4 } from 'uuid';

export class KnowledgeBaseService {
  private vectorStoreService: VectorStoreService;

  constructor() {
    this.vectorStoreService = new VectorStoreService();
  }

  async createKnowledgeBase(name: string, description?: string): Promise<KnowledgeBase> {
    try {
      // Create vector store in OpenAI
      const { id: vectorStoreId } = await this.vectorStoreService.createVectorStore(name);
      
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
  }

  async updateKnowledgeBase(
    knowledgeBaseId: string,
    updates: { name?: string; description?: string }
  ): Promise<KnowledgeBase> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      // Update vector store name if changed
      if (updates.name && updates.name !== knowledgeBase.name) {
        await this.vectorStoreService.updateVectorStore(knowledgeBase.vectorStoreId, updates.name);
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
  }

  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      // Delete from OpenAI
      await this.vectorStoreService.deleteVectorStore(knowledgeBase.vectorStoreId);
      
      // Delete from IndexedDB
      await indexedDBService.deleteKnowledgeBase(knowledgeBaseId);
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      throw error;
    }
  }

  async getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
    try {
      console.log('Getting all knowledge bases from IndexedDB...');
      const knowledgeBases = await indexedDBService.getAllKnowledgeBases();
      console.log('Retrieved knowledge bases:', knowledgeBases);
      return knowledgeBases;
    } catch (error) {
      console.error('Failed to get knowledge bases:', error);
      throw error;
    }
  }

  async uploadFile(
    knowledgeBaseId: string,
    file: File,
    attributes?: Record<string, unknown>
  ): Promise<KnowledgeBaseFile> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      // Create file metadata
      const knowledgeBaseFile: KnowledgeBaseFile = {
        id: uuidv4(),
        filename: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        attributes,
        status: 'uploading'
      };
      
      // Upload to OpenAI
      const { fileId } = await this.vectorStoreService.uploadFile(
        knowledgeBase.vectorStoreId,
        file,
        attributes
      );
      
      // Update file with OpenAI ID
      knowledgeBaseFile.id = fileId;
      knowledgeBaseFile.status = 'completed';
      
      // Update file count
      await this.updateFileCount(knowledgeBaseId);
      
      return knowledgeBaseFile;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  async deleteFile(knowledgeBaseId: string, fileId: string): Promise<void> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      await this.vectorStoreService.deleteFile(knowledgeBase.vectorStoreId, fileId);
      
      // Update file count
      await this.updateFileCount(knowledgeBaseId);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getFiles(knowledgeBaseId: string): Promise<KnowledgeBaseFile[]> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      const files = await this.vectorStoreService.listFiles(knowledgeBase.vectorStoreId);
      
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
  }

  async search(
    knowledgeBaseId: string,
    query: string,
    options?: {
      maxResults?: number;
      rewriteQuery?: boolean;
      attributeFilter?: ComparisonFilter | CompoundFilter;
    }
  ): Promise<QueryTestResult> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      const startTime = Date.now();
      
      const { results, rewrittenQuery } = await this.vectorStoreService.search(
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
  }

  async getUsageStats(knowledgeBaseId: string): Promise<{
    totalSize: number;
    fileCount: number;
    costEstimate: number;
  }> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }
      
      const stats = await this.vectorStoreService.getUsageStats(knowledgeBase.vectorStoreId);
      
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
  }

  private async updateFileCount(knowledgeBaseId: string): Promise<void> {
    try {
      const knowledgeBase = await indexedDBService.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        return;
      }
      
      const stats = await this.vectorStoreService.getUsageStats(knowledgeBase.vectorStoreId);
      
      const updatedKnowledgeBase: KnowledgeBase = {
        ...knowledgeBase,
        fileCount: stats.fileCount,
        updatedAt: Date.now()
      };
      
      await indexedDBService.saveKnowledgeBase(updatedKnowledgeBase);
    } catch (error) {
      console.error('Failed to update file count:', error);
    }
  }
}