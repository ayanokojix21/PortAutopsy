import { useState } from 'react';
import CounterfactualDiff from './CounterfactualDiff';
import CausalGraph from './CausalGraph';

export default function AutopsyPanel({ onReportLoaded, onHealComplete }) {
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [ranOnce,   setRanOnce]   = useState(false);

  // Auto-heal state
  const [healing,      setHealing]      = useState(false);
  const [healResult,   setHealResult]   = useState(null);

  // Post-heal re-run state
  const [verifying,    setVerifying]    = useState(false);  // re-sim after heal
  const [verifyStatus, setVerifyStatus] = useState(null);   // 'running' | 'done' | 'error'

  const runAutopsy = async () => {
    setLoading(true);
    setError(null);
    setHealResult(null);
    setVerifyStatus(null);
    try {
      const res  = await fetch('http://localhost:8000/autopsy-report?fresh=true');
      const data = await res.json();
      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setReport(data);
      setRanOnce(true);
      setLoading(false);
      onReportLoaded?.();
    } catch (e) {
      setError(`Could not reach backend: ${e.message}`);
      setLoading(false);
    }
  };

  const runHealer = async () => {
    setHealing(true);
    setHealResult(null);
    try {
      const res  = await fetch('http://localhost:8000/heal', { method: 'POST' });
      const data = await res.json();
      setHealResult(data);
      if (data.status === 'success') {
        onReportLoaded?.(); // Trigger "Patch Applied" badge
      }
    } catch (e) {
      setHealResult({ error: e.message });
    } finally {
      setHealing(false);
    }
  };

  /**
   * After heal, re-run simulation with the fix applied, then auto-run autopsy
   * to show the verified clean state. Updates terminal grid + metrics via onHealComplete.
   */
  const verifyFix = async () => {
    setVerifying(true);
    setVerifyStatus('running');
    try {
      // 1. Re-run simulation with fix applied
      if (onHealComplete) {
        await onHealComplete();
      }

      // 2. Small delay so saved_state.json is flushed
      await new Promise(r => setTimeout(r, 500));

      // 3. Auto-run autopsy on the post-fix state
      const res  = await fetch('http://localhost:8000/autopsy-report?fresh=true');
      const data = await res.json();
      if (!data?.error) {
        setReport(data);
        setHealResult(null);   // clear old heal result so the new clean report is shown
        setVerifyStatus('done');
      } else {
        setVerifyStatus('error');
      }
    } catch {
      setVerifyStatus('error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <span className="section-title">Diagnostics</span>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', padding: '7px 16px', fontSize: 12 }}
          onClick={runAutopsy}
          disabled={loading || verifying}
        >
          {loading
            ? <><span className="spin">⟳</span> Analyzing…</>
            : ranOnce
              ? <>🔄 Re-run Autopsy</>
              : <>🔬 Run Autopsy</>
          }
        </button>
      </div>

      {/* Empty state */}
      {!report && !loading && !error && (
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
            Run a simulation first, then click<br/>
            <strong style={{ color: 'var(--t2)' }}>Run Autopsy</strong> to trace the causal chain.
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '28px 20px',
          border: '1px dashed rgba(251,113,133,0.25)',
          borderRadius: 'var(--r)',
          background: 'rgba(251,113,133,0.04)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="rgba(251,113,133,0.5)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <div style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 500, textAlign: 'center' }}>
            {error}
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {(loading || verifying) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>
            {verifying ? '🔄 Re-simulating with fix applied, then re-analyzing…' : '🔬 Tracing causal chain…'}
          </div>
          <div className="skeleton" style={{ height: 150 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 6, width: '100%' }} />
        </div>
      )}

      {/* Report */}
      {report && !loading && !verifying && (
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
                {report.root_cause_agent ?? 'none'}
              </span>
              {report.root_cause_decision ?? 'All agents operated correctly.'}
            </div>
          </div>

          <div className="block-green">
            <div className="info-label" style={{ color: 'var(--teal)' }}>Suggested Fix</div>
            <code style={{
              color: 'var(--t1)', display: 'block', marginTop: 5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              lineHeight: 1.65, fontSize: 12,
            }}>
              {report.suggested_fix ?? 'No fix needed.'}
            </code>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Auto-Implement Fix button — only shown before heal is done */}
              {!healResult && !verifyStatus && (
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start',
                    background: 'rgba(45,212,191,0.1)', color: '#2DD4BF',
                    border: '1px solid rgba(45,212,191,0.3)',
                  }}
                  onClick={runHealer}
                  disabled={healing}
                >
                  {healing
                    ? <><span className="spin">⟳</span> Master Agent analyzing codebase…</>
                    : <>🛠 Auto-Implement Fix (Master Agent)</>
                  }
                </button>
              )}

              {/* Heal succeeded — show result + verify button */}
              {healResult?.status === 'success' && !verifyStatus && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    background: 'rgba(2,6,23,0.5)', padding: '8px 12px',
                    borderRadius: 6, border: '1px solid rgba(45,212,191,0.2)',
                  }}>
                    <div style={{ color: '#2DD4BF', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                      ✓ Fix applied to {healResult.patched_file}
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6 }}>
                      {healResult.explanation}
                    </div>
                    {healResult.diff && (
                      <pre style={{
                        margin: 0, padding: 8, background: 'rgba(0,0,0,0.3)',
                        borderRadius: 4, fontSize: 10, color: 'var(--t3)',
                        fontFamily: 'var(--mono)', overflowX: 'auto',
                      }}>
                        {healResult.diff}
                      </pre>
                    )}
                  </div>

                  {/* Re-simulate + re-analyze to verify the fix worked */}
                  <button
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px', fontSize: 12, alignSelf: 'flex-start',
                      background: 'rgba(103,232,249,0.1)', color: '#67E8F9',
                      border: '1px solid rgba(103,232,249,0.35)',
                      fontWeight: 600,
                    }}
                    onClick={verifyFix}
                    disabled={verifying}
                  >
                    ▶ Re-simulate &amp; Verify Fix
                  </button>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: -4 }}>
                    Runs a fresh simulation with the fix applied and re-analyzes the result.
                  </div>
                </div>
              )}

              {/* Verify done */}
              {verifyStatus === 'done' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(45,212,191,0.06)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  fontSize: 12, color: '#2DD4BF', fontWeight: 600,
                }}>
                  ✓ Fix verified — dashboard updated with post-fix state
                </div>
              )}

              {/* Heal error */}
              {healResult?.error && (
                <div style={{ color: 'var(--rose)', fontSize: 11 }}>
                  ❌ {healResult.error}
                </div>
              )}
            </div>
          </div>

          {/* Confidence bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Confidence</span>
            <div className="conf-track">
              <div className="conf-fill" style={{ width: `${Math.round((report.confidence ?? 0) * 100)}%` }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#2DD4BF',
              whiteSpace: 'nowrap', fontFamily: 'var(--mono)',
            }}>
              {Math.round((report.confidence ?? 0) * 100)}%
            </span>
          </div>

          <CounterfactualDiff report={report} />
        </div>
      )}
    </div>
  );
}
