import { lazy, Suspense } from 'react';

const LazyKnowledgeBaseDetails = lazy(() => 
  import('../components/knowledge-base/KnowledgeBaseDetails').then(module => ({ 
    default: module.KnowledgeBaseDetails 
  }))
);

export function KnowledgeBaseDetailsPage() {
  return (
    <Suspense fallback={<div aria-busy="true">Loading knowledge base details...</div>}>
      <LazyKnowledgeBaseDetails />
    </Suspense>
  );
}