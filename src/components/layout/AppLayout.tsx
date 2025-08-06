import { useState, useEffect, type ReactNode } from 'react';
import { useAppContext } from '../../contexts/useAppContext';
import { AppHeader } from './AppHeader';
import { SettingsModal } from '../common/SettingsModal';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { state } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check for API key on startup
  useEffect(() => {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey && !isSettingsOpen) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppHeader onSettingsClick={() => setIsSettingsOpen(true)} />
      
      <main id="main-content" className="container">
        {state.error && (
          <section role="alert" aria-live="assertive">
            {state.error}
          </section>
        )}
        
        {children}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}