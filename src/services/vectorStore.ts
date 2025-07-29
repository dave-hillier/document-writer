import OpenAI from 'openai';
import type { ComparisonFilter, CompoundFilter } from 'openai/resources/shared';
import type { SearchResult } from '../types';

const getOpenAIClient = (): OpenAI => {
  const apiKey = localStorage.getItem('openai-api-key');
  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in settings');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export const createVectorStore = async (name: string): Promise<{ id: string; name: string }> => {
  const openai = getOpenAIClient();
  try {
    const vectorStore = await openai.vectorStores.create({
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
};

export const updateVectorStore = async (vectorStoreId: string, name: string): Promise<void> => {
  const openai = getOpenAIClient();
  try {
    await openai.vectorStores.update(vectorStoreId, {
      name
    });
  } catch (error) {
    console.error('Failed to update vector store:', error);
    throw new Error('Failed to update knowledge base');
  }
};

export const deleteVectorStore = async (vectorStoreId: string): Promise<void> => {
  const openai = getOpenAIClient();
  try {
    await openai.vectorStores.delete(vectorStoreId);
  } catch (error) {
    console.error('Failed to delete vector store:', error);
    throw new Error('Failed to delete knowledge base');
  }
};

export const uploadFile = async (
  vectorStoreId: string,
  file: File,
  attributes?: Record<string, unknown>
): Promise<{ fileId: string }> => {
  const openai = getOpenAIClient();
  try {
    const fileUpload = await openai.files.create({
      file,
      purpose: 'assistants'
    });

    const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
      vectorStoreId,
      {
        file_id: fileUpload.id
      }
    );

    // Update attributes if provided
    if (attributes && Object.keys(attributes).length > 0) {
      await openai.vectorStores.files.update(
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
};

export const deleteFile = async (vectorStoreId: string, fileId: string): Promise<void> => {
  const openai = getOpenAIClient();
  try {
    await openai.vectorStores.files.delete(fileId, {
      vector_store_id: vectorStoreId
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw new Error('Failed to delete file from knowledge base');
  }
};

export const listFiles = async (vectorStoreId: string): Promise<Array<{
  id: string;
  filename: string;
  createdAt: number;
  status: string;
}>> => {
  const openai = getOpenAIClient();
  try {
    const files = await openai.vectorStores.files.list(vectorStoreId);
    
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
};

export const search = async (
  vectorStoreId: string,
  query: string,
  options?: {
    maxResults?: number;
    rewriteQuery?: boolean;
    attributeFilter?: ComparisonFilter | CompoundFilter;
  }
): Promise<{ results: SearchResult[]; rewrittenQuery?: string }> => {
  const openai = getOpenAIClient();
  try {
    const searchResults = await openai.vectorStores.search(
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
};

export const getUsageStats = async (vectorStoreId: string): Promise<{
  totalSize: number;
  fileCount: number;
}> => {
  const openai = getOpenAIClient();
  try {
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);
    
    return {
      totalSize: vectorStore.usage_bytes || 0,
      fileCount: vectorStore.file_counts?.total || 0
    };
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    throw new Error('Failed to get knowledge base statistics');
  }
};