import { useState, useEffect, useRef } from 'react';

/**
 * Connects to the WebSocket event stream and hydrates from GET /traces on mount.
 *
 * Strategy:
 *  1. On mount, fetch all historical traces from REST so the grid is never blank.
 *  2. Append live WS events on top as they arrive.
 *  3. Reconnect with exponential back-off (2s → 4s → 8s → cap 16s) on disconnect.
 */
export function useEventStream(
  wsUrl   = 'ws://localhost:8000/ws/events',
  restUrl = 'http://localhost:8000/traces',
) {
  const [events,    setEvents]    = useState([]);
  const [connected, setConnected] = useState(false);

  const wsRef      = useRef(null);
  const retryMs    = useRef(2000);
  const retryTimer = useRef(null);
  const mounted    = useRef(true);

  // ── 1. Hydrate from REST on mount ──────────────────────────
  useEffect(() => {
    fetch(restUrl)
      .then(r => r.json())
      .then(data => {
        if (!mounted.current || !Array.isArray(data)) return;
        setEvents(data.slice(-500));
      })
      .catch(() => {}); // backend may not be up yet — silent fail
  }, [restUrl]);

  // ── 2. WebSocket with exponential back-off ─────────────────
  useEffect(() => {
    mounted.current = true;

    const connect = () => {
      if (!mounted.current) return;

      // Don't open a second socket if one is already connecting / open
      if (wsRef.current &&
          (wsRef.current.readyState === WebSocket.OPEN ||
           wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted.current) { ws.close(); return; }
          setConnected(true);
          retryMs.current = 2000; // reset back-off on successful connect
        };

        ws.onmessage = (e) => {
          if (!mounted.current) return;
          try {
            const event = JSON.parse(e.data);
            setEvents(prev => [...prev, event].slice(-500));
          } catch { /* malformed JSON — ignore */ }
        };

        ws.onclose = () => {
          if (!mounted.current) return;
          setConnected(false);
          // Exponential back-off: 2s → 4s → 8s → 16s (cap)
          retryTimer.current = setTimeout(() => {
            retryMs.current = Math.min(retryMs.current * 2, 16000);
            connect();
          }, retryMs.current);
        };

        ws.onerror = () => {
          // Let onclose handle the retry
          ws.close();
        };
      } catch {
        retryTimer.current = setTimeout(connect, retryMs.current);
      }
    };

    connect();

    return () => {
      mounted.current = false;
      clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent retry loop on unmount
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  return { events, connected };
}
