import { createContext } from 'react';
import type { AppState, AppAction } from '../types';

export interface AppContextType {
  state: AppState;
  dispatch: (action: AppAction) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);