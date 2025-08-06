import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/useAppContext';
import { AppHeader } from './AppHeader';
import { AsideNavigation } from './AsideNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { state } = useAppContext();
  const navigate = useNavigate();

  // Check for API key on startup and redirect to settings if needed
  useEffect(() => {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey) {
      navigate('/settings');
    }
  }, [navigate]);

  return (
    <>
      <AppHeader />
      <AsideNavigation />
      
      <main id="main-content">
        {state.error && (
          <section role="alert" aria-live="assertive">
            {state.error}
          </section>
        )}
        
        {children}
      </main>
    </>
  );
}