/**
 * useWebSocket — WebSocket connection hook for real-time events.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketResult {
  messages: unknown[];
  connected: boolean;
  send: (data: string) => void;
}

export function useWebSocket(path: string): UseWebSocketResult {
  const [messages, setMessages] = useState<unknown[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}${path}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(event.data as string);
        setMessages((prev) => [...prev, parsed]);
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [path]);

  return { messages, connected, send };
}
