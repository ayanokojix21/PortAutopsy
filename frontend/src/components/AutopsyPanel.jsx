import { useState } from 'react';
import CounterfactualDiff from './CounterfactualDiff';
import CausalGraph from './CausalGraph';
import mockReport from '../mock/autopsy_report.json';

export default function AutopsyPanel({ onReportLoaded }) {
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  
  // Auto-heal state
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState(null);

  const runAutopsy = async () => {
    setLoading(true);
    setDemoMode(false);
    try {
      const res  = await fetch('http://localhost:8000/autopsy-report');
      const data = await res.json();
      // If the server returned an error payload, fall back to demo
      if (data?.error) throw new Error(data.error);
      setReport(data);
      setLoading(false);
      onReportLoaded?.();
    } catch {
      setTimeout(() => {
        setReport(mockReport);
        setDemoMode(true);
        setLoading(false);
        onReportLoaded?.();
      }, 900);
    }
  };

  const runHealer = async () => {
    setHealing(true);
    setHealResult(null);
    try {
      const res = await fetch('http://localhost:8000/heal', { method: 'POST' });
      const data = await res.json();
      setHealResult(data);
      if (data.status === 'success') {
        onReportLoaded?.(); // Trigger the global Patch Applied UI update
      }
    } catch (e) {
      setHealResult({ error: e.message });
    } finally {
      setHealing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <span className="section-title">Diagnostics</span>
        {demoMode && (
          <span className="tag tag-gray" style={{ fontSize: 10, marginLeft: 8 }}
            title="Backend unreachable — showing pre-recorded demo data">
            ⚠ Demo data
          </span>
        )}
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', padding: '7px 16px', fontSize: 12 }}
          onClick={runAutopsy}
          disabled={loading}
        >
          {loading ? <>⟳ Analyzing…</> : <>▶ Run Autopsy</>}
        </button>
      </div>

      {/* Empty state */}
      {!report && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '36px 20px',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 'var(--r)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(6px)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="rgba(45,212,191,0.3)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
          <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>No Active Diagnosis</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.5 }}>
            Click Run Autopsy to trace a fault<br/>scenario through the causal chain.
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 150 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 6, width: '100%' }} />
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <CausalGraph />

          <div className="block-red">
            <div className="info-label" style={{ color: 'var(--rose)' }}>Fault Origin</div>
            <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginTop: 5 }}>
              <span style={{
                display: 'inline-block',
                background: 'rgba(251,113,133,0.08)', color: 'var(--rose)',
                padding: '2px 8px', borderRadius: 4, marginRight: 8,
                fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
              }}>
                {report.root_cause_agent}
              </span>
              {report.root_cause_decision}
            </div>
          </div>

          <div className="block-green">
            <div className="info-label" style={{ color: 'var(--teal)' }}>Suggested Fix</div>
            <code style={{
              color: 'var(--t1)', display: 'block', marginTop: 5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              lineHeight: 1.65, fontSize: 12,
            }}>
              {report.suggested_fix}
            </code>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!healResult && (
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start', background: 'rgba(45,212,191,0.1)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.3)' }}
                  onClick={runHealer}
                  disabled={healing}
                >
                  {healing ? <>⟳ Master Agent analyzing codebase…</> : <>🛠 Auto-Implement Fix (Master Agent)</>}
                </button>
              )}
              {healResult?.status === 'success' && (
                <div style={{ background: 'rgba(2,6,23,0.5)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(45,212,191,0.2)' }}>
                  <div style={{ color: '#2DD4BF', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                    ✓ Fix applied to {healResult.patched_file}
                  </div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6 }}>{healResult.explanation}</div>
                  <pre style={{ margin: 0, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', overflowX: 'auto' }}>
                    {healResult.diff}
                  </pre>
                </div>
              )}
              {healResult?.error && (
                <div style={{ color: 'var(--rose)', fontSize: 11 }}>
                  ❌ Failed: {healResult.error}
                </div>
              )}
            </div>
          </div>

          {/* Confidence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Confidence</span>
            <div className="conf-track">
              <div className="conf-fill" style={{ width: `${Math.round(report.confidence * 100)}%` }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: '#2DD4BF',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--mono)',
            }}>
              {Math.round(report.confidence * 100)}%
            </span>
          </div>

          <CounterfactualDiff report={report} />
        </div>
      )}
    </div>
  );
}
