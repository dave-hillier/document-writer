import { lazy, Suspense } from 'react';

const LazyDocumentHistory = lazy(() => 
  import('../components/document/DocumentHistory').then(module => ({ 
    default: module.DocumentHistory 
  }))
);

export function HistoryPage() {
  return (
    <Suspense fallback={<div aria-busy="true">Loading history...</div>}>
      <LazyDocumentHistory />
    </Suspense>
  );
}