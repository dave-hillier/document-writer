import { useEffect } from 'react';
import type { AppAction } from '../types';
import { migrateModelSettings } from '../utils/migration';
import { indexedDBService } from '../services/indexeddb';

export function useInitialization(dispatch: (action: AppAction) => void) {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Run migrations
        migrateModelSettings();
        
        // Ensure database is initialized
        await indexedDBService.init();
        
        // Load document history
        const documents = await indexedDBService.getAllDocuments();
        dispatch({ type: 'HISTORY_LOADED', payload: { documents } });
      } catch (error) {
        console.error('Failed to load documents from history:', error);
        // Non-critical error - app can continue without history
      }
    };

    initializeApp();
  }, [dispatch]);
}

export function useApiKeyCheck(onSettingsOpen: () => void) {
  useEffect(() => {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey) {
      onSettingsOpen();
    }
  }, [onSettingsOpen]);
}