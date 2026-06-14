import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Brush, CartesianGrid,
} from 'recharts';
import { useMetricsHistory } from '../hooks/useMetricsHistory';

// ── Neutral placeholders shown only before the first /metrics response ──
// Real values always come from the backend; these zeros ensure no fabricated
// numbers are ever displayed while offline.
const FALLBACK = {
  fifo:  { throughput: 0, violations: 0, dwell: 0, debug: 'Manual' },
  agent: { throughput: 0, violations: 0, dwell: 0, debug: 'autopsy' },
};

// ── Custom tooltip ────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(2,6,23,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--t3)', fontSize: 10, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--t2)' }}>{p.name}:</span>
          <span style={{ color: 'var(--t1)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

function ViolationsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(2,6,23,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--t3)', fontSize: 10, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--t2)' }}>{p.name}:</span>
          <span style={{ color: 'var(--t1)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{p.value} violations</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function MetricsPanel({ showFixed = false }) {
  const { history, latest, status } = useMetricsHistory();

  // Only merge fallback once we have actual live data.
  // When latest === null (no simulation run yet), show clean zeros — not fake numbers.
  const hasData = latest !== null;
  const fifo  = hasData ? { ...FALLBACK.fifo,  ...(latest?.fifo  || {}) } : { throughput: 0, violations: 0, dwell: 0 };
  const agent = hasData ? { ...FALLBACK.agent, ...(latest?.agent || {}) } : { throughput: 0, violations: 0, dwell: 0 };

  const violationsPrevented = Math.max(0, (fifo.violations ?? 0) - (agent.violations ?? 0));

  // ── Separate bar data for throughput and violations ──
  const throughputBarData = useMemo(() => [
    { name: 'FIFO',  value: fifo.throughput,  fill: 'rgba(148,163,184,0.3)',  stroke: 'rgba(148,163,184,0.5)' },
    { name: 'Agent', value: agent.throughput, fill: 'rgba(103,232,249,0.25)', stroke: 'rgba(103,232,249,0.6)' },
  ], [fifo.throughput, agent.throughput]);

  const violationsBarData = useMemo(() => [
    { name: 'FIFO',  value: fifo.violations,  fill: 'rgba(148,163,184,0.3)',  stroke: 'rgba(148,163,184,0.5)' },
    { name: 'Agent', value: agent.violations, fill: 'rgba(251,113,133,0.3)',  stroke: 'rgba(251,113,133,0.65)' },
  ], [fifo.violations, agent.violations]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="section-header">
        <span className="section-title">System Metrics</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {status === 'live' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'var(--teal)',
              background: 'rgba(45,212,191,0.08)',
              border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--teal)',
                boxShadow: '0 0 6px var(--teal)',
                animation: 'pulse-dot 2s infinite',
                flexShrink: 0,
              }} />
              Live
            </span>
          )}
          {status === 'error' && (
            <span style={{
              fontSize: 10, color: 'var(--t3)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              Awaiting simulation
            </span>
          )}
          {!hasData && status !== 'error' && (
            <span style={{
              fontSize: 10, color: 'var(--t3)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              Run simulation to see metrics
            </span>
          )}
          {showFixed && (
            <span className="tag tag-mint">✓ Patch Applied</span>
          )}
        </div>
      </div>

      {/* ── Delta KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        <div className="kpi-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--t2)' }}>
            {hasData ? `${fifo.throughput}%` : '—'}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--t3)', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>FIFO Baseline</div>
        </div>
        <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(103,232,249,0.2)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#67E8F9' }}>
            {hasData ? violationsPrevented : '—'}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--t2)', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Breaches Prevented</div>
        </div>
        <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(251,113,133,0.2)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: agent.violations > 0 ? '#FB7185' : '#2DD4BF' }}>
            {agent.violations}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--t2)', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Violations</div>
        </div>
      </div>

      {/* ── Bar Charts: Throughput + Violations side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>

        {/* Throughput */}
        <div>
          <div className="info-label">Throughput %</div>
          <div style={{
            background: 'rgba(2,6,23,0.4)', borderRadius: 'var(--r-sm)',
            border: '1px solid rgba(255,255,255,0.06)', padding: '8px 4px 4px',
          }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={throughputBarData} barGap={4} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide domain={[0, 110]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Throughput">
                  {throughputBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke={entry.stroke} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violations — own scale so even small counts are visible */}
        <div>
          <div className="info-label" style={{ color: agent.violations > 0 ? 'rgba(251,113,133,0.7)' : 'var(--t3)' }}>
            Violations (count)
          </div>
          <div style={{
            background: 'rgba(2,6,23,0.4)', borderRadius: 'var(--r-sm)',
            border: `1px solid ${agent.violations > 0 ? 'rgba(251,113,133,0.2)' : 'rgba(255,255,255,0.06)'}`,
            padding: '8px 4px 4px',
          }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={violationsBarData} barGap={4} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                {/* Use auto domain so 0 violations still renders a visible zero-height bar */}
                <YAxis
                  hide={false}
                  domain={[0, dataMax => Math.max(dataMax + 1, 5)]}
                  tick={{ fill: 'rgba(100,116,139,0.5)', fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  width={18}
                  allowDecimals={false}
                />
                <Tooltip content={<ViolationsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Violations" minPointSize={2}>
                  {violationsBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke={entry.stroke} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Time Series: Throughput over time with Brush zoom ── */}
      {history.length > 1 && (
        <div>
          <div className="info-label">Throughput Timeline — scroll to zoom</div>
          <div style={{
            background: 'rgba(2,6,23,0.4)', borderRadius: 'var(--r-sm)',
            border: '1px solid rgba(255,255,255,0.06)', padding: '8px 4px 2px',
          }}>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="gradAgent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#67E8F9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#67E8F9" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradFifo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'rgba(100,116,139,0.5)', fontSize: 9 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  domain={[0, 'auto']}
                  tick={{ fill: 'rgba(100,116,139,0.5)', fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="agentThroughput" name="Agent"
                  stroke="#67E8F9" strokeWidth={2}
                  fill="url(#gradAgent)"
                  dot={false} activeDot={{ r: 4, fill: '#67E8F9', stroke: 'rgba(2,6,23,0.8)', strokeWidth: 2 }}
                />
                <Area
                  type="monotone" dataKey="fifoThroughput" name="FIFO"
                  stroke="rgba(148,163,184,0.4)" strokeWidth={1.5}
                  fill="url(#gradFifo)"
                  dot={false} strokeDasharray="4 4"
                />
                <Brush
                  dataKey="time" height={18} y={128}
                  stroke="rgba(103,232,249,0.3)"
                  fill="rgba(2,6,23,0.6)"
                  tickFormatter={() => ''}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Empty state for time series ── */}
      {history.length <= 1 && (
        <div style={{
          padding: '14px 16px',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--t3)',
          fontSize: 11,
          textAlign: 'center',
        }}>
          Run a simulation to see the throughput timeline with zoom
        </div>
      )}
    </div>
  );
}
