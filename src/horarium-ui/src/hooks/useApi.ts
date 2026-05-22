import { useEffect, useState } from 'react';
import type { FileTreeNode, ParseResult } from '../types/plan';

export function useFileTree() {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => { setTree(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${wsProtocol}://${location.host}/ws`);
    ws.onmessage = () => refresh();
    return () => ws.close();
  }, []);

  return { tree, loading, refresh };
}

export function usePlan(path: string | null) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) { setResult(null); return; }
    setLoading(true);
    fetch(`/api/plans/${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [path]);

  return { result, loading };
}
