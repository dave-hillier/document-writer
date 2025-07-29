import type { FC } from 'react';

interface CacheMetricsProps {
  cacheMetrics?: { cachedTokens: number; totalTokens: number };
  label?: string;
}

export const CacheMetrics: FC<CacheMetricsProps> = ({ 
  cacheMetrics, 
  label = "Cache performance" 
}) => {
  if (!cacheMetrics || cacheMetrics.totalTokens === 0) {
    return null;
  }

  const hitRate = ((cacheMetrics.cachedTokens / cacheMetrics.totalTokens) * 100).toFixed(1);
  const savings = cacheMetrics.cachedTokens > 0 ? "75%" : "0%"; // Based on OpenAI's 75% cost savings

  return (
    <details className="cache-metrics">
      <summary>
        {label}
        {cacheMetrics.cachedTokens > 0 && (
          <small style={{ color: 'green', marginLeft: '0.5rem' }}>
            ✓ {hitRate}% cached
          </small>
        )}
      </summary>
      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
        <p>
          <strong>Tokens:</strong> {cacheMetrics.cachedTokens.toLocaleString()} cached / {cacheMetrics.totalTokens.toLocaleString()} total
        </p>
        <p>
          <strong>Cache hit rate:</strong> {hitRate}%
        </p>
        {cacheMetrics.cachedTokens > 0 && (
          <p>
            <strong>Estimated cost savings:</strong> ~{savings}
          </p>
        )}
      </div>
    </details>
  );
};