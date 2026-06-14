import { useState } from 'react';

const SCENARIOS = [
  { id: 'cold_chain', label: '❄ Cold Chain', desc: 'Misroute cold cargo to non-refrigerated crane' },
  { id: 'deadlock',   label: '🔒 Deadlock',   desc: 'Create circular dependency between agents' },
  { id: 'cascade',    label: '💥 Cascade',     desc: 'Trigger cascading failure across berths' },
];

export default function SimControls({ onSimComplete, onInject, externalStatus, externalResult, onRunSimulation }) {
  const [_simStatus, _setSimStatus] = useState('idle');
  const [_simResult, _setSimResult] = useState(null);
  const [injecting,  setInjecting]  = useState(null);
  const [injected,   setInjected]   = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Use external state if provided (App.jsx drives the run), else internal
  const simStatus = externalStatus ?? _simStatus;
  const simResult = externalResult ?? _simResult;

  const runSimulation = async () => {
    if (onRunSimulation) {
      // Delegate to parent — parent manages state
      await onRunSimulation();
      return;
    }
    // Standalone mode — manage own state
    _setSimStatus('running');
    _setSimResult(null);
    try {
      const res  = await fetch('http://localhost:8000/run', { method: 'POST' });
      const data = await res.json();
      _setSimResult(data);
      _setSimStatus('done');
      onSimComplete?.(data);
    } catch (e) {
      _setSimStatus('error');
      _setSimResult({ error: e.message });
    }
  };

  const injectFailure = async (scenario) => {
    setInjecting(scenario);
    setDropdownOpen(false);
    try {
      await fetch(`http://localhost:8000/inject/${scenario}`, { method: 'POST' });
      setInjected(prev => [...prev, scenario]);
      onInject?.(scenario);
    } catch { /* silent */ }
    setTimeout(() => setInjecting(null), 600);
  };

  const statusConfig = {
    idle:    { text: 'Ready',              color: 'var(--t3)',   dot: 'rgba(100,116,139,0.5)' },
    running: { text: 'Simulating…',        color: 'var(--amber)', dot: '#FCD34D' },
    done:    { text: `Done — ${simResult?.allocated ?? 0}/${simResult?.total ?? 200} allocated`, color: 'var(--teal)', dot: '#2DD4BF' },
    error:   { text: 'Backend unreachable', color: 'var(--rose)', dot: '#FB7185' },
  };
  const st = statusConfig[simStatus];

  return (
    <div className="sim-controls">
      {/* Status indicator */}
      <div className="sim-status">
        <span className="sim-status-dot" style={{ background: st.dot, boxShadow: `0 0 8px ${st.dot}` }} />
        <span style={{ color: st.color, fontSize: 11, fontWeight: 500 }}>{st.text}</span>
      </div>

      {/* Run Simulation */}
      <button
        className="btn btn-sim"
        onClick={runSimulation}
        disabled={simStatus === 'running'}
      >
        {simStatus === 'running' ? (
          <><span className="spin">⟳</span> Running 200 Agents…</>
        ) : (
          <>▶ Run Simulation</>
        )}
      </button>

      {/* Inject Failure — dropdown */}
      <div className="sim-dropdown-wrap">
        <button
          className="btn btn-inject"
          onClick={() => setDropdownOpen(v => !v)}
          disabled={!!injecting}
        >
          {injecting ? (
            <><span className="spin">⟳</span> Injecting…</>
          ) : (
            <>💉 Inject Failure</>
          )}
        </button>
        {dropdownOpen && (
          <div className="sim-dropdown">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                className="sim-dropdown-item"
                onClick={() => injectFailure(s.id)}
                disabled={injected.includes(s.id)}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{s.desc}</span>
                {injected.includes(s.id) && (
                  <span className="tag tag-mint" style={{ fontSize: 9, padding: '1px 6px', marginLeft: 'auto' }}>✓ Done</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Injected tags */}
      {injected.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {injected.map(id => (
            <span key={id} className="tag tag-red" style={{ fontSize: 9, padding: '2px 7px', animation: 'none' }}>
              {id.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
