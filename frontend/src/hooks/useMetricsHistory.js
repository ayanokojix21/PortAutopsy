import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Polls /metrics and accumulates snapshots into an array over time.
 * Each snapshot becomes a data point on the time-series chart.
 * Provides a reset() method so the chart can clear when a new simulation starts.
 */
export function useMetricsHistory(apiUrl = 'http://localhost:8000/metrics', intervalMs = 3000) {
  const [history, setHistory]     = useState([]);
  const [latest, setLatest]       = useState(null);   // most recent snapshot
  const [status, setStatus]       = useState('idle');  // 'idle' | 'live' | 'error'
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);
  const seqRef     = useRef(0);

  const reset = useCallback(() => {
    setHistory([]);
    setLatest(null);
    seqRef.current = 0;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const poll = () => {
      fetch(apiUrl)
        .then(r => r.json())
        .then(data => {
          if (!mountedRef.current) return;
          if (data?.error && !data?.agent?.throughput) {
            setStatus('idle');
            return;
          }

          const agent = data?.agent || {};
          const fifo  = data?.fifo  || {};

          // Only add a new data point if agent data actually changed
          if (Object.keys(agent).length > 0) {
            setStatus('live');
            setLatest({ agent, fifo });

            seqRef.current += 1;
            const point = {
              seq: seqRef.current,
              time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              agentThroughput: agent.throughput ?? 0,
              fifoThroughput:  fifo.throughput  ?? 100,
              agentDwell:      agent.dwell      ?? 0,
              fifoDwell:       fifo.dwell       ?? 4.2,
              violations:      agent.violations ?? 0,
            };

            setHistory(prev => [...prev, point].slice(-60)); // keep last 60 data points
          }
        })
        .catch(() => {
          if (mountedRef.current) setStatus('error');
        });
    };

    poll();
    timerRef.current = setInterval(poll, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [apiUrl, intervalMs]);

  return { history, latest, status, reset };
}
