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
): Promise<{ fileId: string; filename: string }> => {
  const openai = getOpenAIClient();
  try {
    const fileUpload = await openai.files.create({
      file,
      purpose: 'assistants'
    });

    // Merge filename into attributes for metadata storage
    const metadata = {
      original_filename: file.name,
      ...(attributes || {})
    };

    const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
      vectorStoreId,
      {
        file_id: fileUpload.id
      }
    );

    // Note: metadata/attributes support may vary by OpenAI API version
    // This is here for future compatibility when fully supported
    if (Object.keys(metadata).length > 0) {
      try {
        await openai.vectorStores.files.update(
          fileUpload.id,
          {
            vector_store_id: vectorStoreId,
            attributes: metadata as Record<string, string | number | boolean>
          }
        );
      } catch (error) {
        console.warn('Failed to set file metadata/attributes:', error);
        // Continue without metadata - the filename is still retrievable via files.retrieve
      }
    }

    return { fileId: vectorStoreFile.id, filename: file.name };
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
    const vectorStoreFiles = await openai.vectorStores.files.list(vectorStoreId);
    
    // Retrieve actual filenames from the Files API
    const filesWithNames = await Promise.all(
      vectorStoreFiles.data.map(async (vsFile) => {
        try {
          // Retrieve the file details to get the original filename
          const fileDetails = await openai.files.retrieve(vsFile.id);
          return {
            id: vsFile.id,
            filename: fileDetails.filename,
            createdAt: vsFile.created_at * 1000,
            status: vsFile.status
          };
        } catch (error) {
          console.error(`Failed to retrieve file details for ${vsFile.id}:`, error);
          // Fallback to ID if file retrieval fails
          return {
            id: vsFile.id,
            filename: 'file_' + vsFile.id,
            createdAt: vsFile.created_at * 1000,
            status: vsFile.status
          };
        }
      })
    );
    
    return filesWithNames;
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