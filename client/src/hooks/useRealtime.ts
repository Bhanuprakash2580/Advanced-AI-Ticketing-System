import { useEffect, useRef } from 'react';

/**
 * Subscribes to server push (SSE). Keeps a stable EventSource while the callback can change.
 */
export function useRealtime(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = () => onRefreshRef.current();
    return () => es.close();
  }, []);
}
