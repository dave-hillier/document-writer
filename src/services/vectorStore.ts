import OpenAI from 'openai';
import type { ComparisonFilter, CompoundFilter } from 'openai/resources/shared';
import type { SearchResult } from '../types';

export class VectorStoreService {
  private openai: OpenAI;

  constructor() {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey) {
      throw new Error('Please set your OpenAI API key in settings');
    }
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    
  }

  async createVectorStore(name: string): Promise<{ id: string; name: string }> {
    try {
      const vectorStore = await this.openai.vectorStores.create({
        name
      });
      return {
        id: vectorStore.id,
        name: vectorStore.name || name
      };
    } catch (error) {
      console.error('Failed to create vector store:', error);
      throw new Error('Failed to create knowledge base');
    }
  }

  async updateVectorStore(vectorStoreId: string, name: string): Promise<void> {
    try {
      await this.openai.vectorStores.update(vectorStoreId, {
        name
      });
    } catch (error) {
      console.error('Failed to update vector store:', error);
      throw new Error('Failed to update knowledge base');
    }
  }

  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    try {
      await this.openai.vectorStores.delete(vectorStoreId);
    } catch (error) {
      console.error('Failed to delete vector store:', error);
      throw new Error('Failed to delete knowledge base');
    }
  }

  async uploadFile(
    vectorStoreId: string,
    file: File,
    attributes?: Record<string, unknown>
  ): Promise<{ fileId: string }> {
    try {
      const fileUpload = await this.openai.files.create({
        file,
        purpose: 'assistants'
      });

      const vectorStoreFile = await this.openai.vectorStores.files.createAndPoll(
        vectorStoreId,
        {
          file_id: fileUpload.id
        }
      );

      // Update attributes if provided
      if (attributes && Object.keys(attributes).length > 0) {
        await this.openai.vectorStores.files.update(
          fileUpload.id,
          {
            vector_store_id: vectorStoreId,
            attributes: attributes as Record<string, string | number | boolean>
          }
        );
      }

      return { fileId: vectorStoreFile.id };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to knowledge base');
    }
  }

  async deleteFile(vectorStoreId: string, fileId: string): Promise<void> {
    try {
      await this.openai.vectorStores.files.delete(fileId, {
        vector_store_id: vectorStoreId
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from knowledge base');
    }
  }

  async listFiles(vectorStoreId: string): Promise<Array<{
    id: string;
    filename: string;
    createdAt: number;
    status: string;
  }>> {
    try {
      const files = await this.openai.vectorStores.files.list(vectorStoreId);
      
      return files.data.map(file => ({
        id: file.id,
        filename: 'file_' + file.id, // OpenAI doesn't return filename in list
        createdAt: file.created_at * 1000,
        status: file.status
      }));
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error('Failed to list knowledge base files');
    }
  }

  async search(
    vectorStoreId: string,
    query: string,
    options?: {
      maxResults?: number;
      rewriteQuery?: boolean;
      attributeFilter?: ComparisonFilter | CompoundFilter;
    }
  ): Promise<{ results: SearchResult[]; rewrittenQuery?: string }> {
    try {
      const searchResults = await this.openai.vectorStores.search(
        vectorStoreId,
        {
          query: query,
          max_num_results: options?.maxResults,
          rewrite_query: options?.rewriteQuery,
          filters: options?.attributeFilter
        }
      );
      
      const results: SearchResult[] = searchResults.data.map(result => ({
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
        content: result.content.map(c => ({ type: c.type, text: c.text })),
        attributes: result.attributes || undefined
      }));
      
      return {
        results,
        rewrittenQuery: undefined // search_query property is not available in the type
      };
    } catch (error) {
      console.error('Failed to search vector store:', error);
      throw new Error('Failed to search knowledge base');
    }
  }

  async getUsageStats(vectorStoreId: string): Promise<{
    totalSize: number;
    fileCount: number;
  }> {
    try {
      const vectorStore = await this.openai.vectorStores.retrieve(vectorStoreId);
      
      return {
        totalSize: vectorStore.usage_bytes || 0,
        fileCount: vectorStore.file_counts?.total || 0
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw new Error('Failed to get knowledge base statistics');
    }
  }
}