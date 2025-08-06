import { AppProvider } from './contexts/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { AppRoutes } from './routes/AppRoutes';
import { useInitialization } from './hooks/useInitialization';
import { useAppContext } from './contexts/useAppContext';
import './App.css';

function AppContent() {
  const { dispatch } = useAppContext();

  // Initialize app and load document history
  useInitialization(dispatch);

  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;