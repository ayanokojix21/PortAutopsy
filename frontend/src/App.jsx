import { useState, useRef } from 'react';
import './App.css';
import SimControls from './components/SimControls';
import PortMap from './components/PortMap';
import AgentTimeline from './components/AgentTimeline';
import MetricsPanel from './components/MetricsPanel';
import AutopsyPanel from './components/AutopsyPanel';

export default function App() {
  const [showFixed,      setShowFixed]      = useState(false);
  const [agentCount,     setAgentCount]     = useState(200);
  const [scenarioCount,  setScenarioCount]  = useState(3);
  const [simRefreshKey,  setSimRefreshKey]  = useState(0);  // increments on every run → triggers port map + telemetry re-fetch

  // Lifted sim state so AutopsyPanel can trigger a re-run after heal
  const [simStatus,  setSimStatus]  = useState('idle');   // 'idle' | 'running' | 'done' | 'error'
  const [simResult,  setSimResult]  = useState(null);

  /** Called whenever a simulation completes (manually or post-heal). */
  const handleSimComplete = (data) => {
    if (data?.allocated !== undefined) setAgentCount(data.allocated);
    if (data?.total     !== undefined) setAgentCount(data.total);
    setSimStatus('done');
    setSimResult(data);
    setSimRefreshKey(k => k + 1); // refresh PortMap + AgentTimeline
  };

  /** Runs a simulation directly — used by AutopsyPanel after heal. */
  const runSimulation = async () => {
    setSimStatus('running');
    setSimResult(null);
    try {
      const res  = await fetch('http://localhost:8000/run', { method: 'POST' });
      const data = await res.json();
      handleSimComplete(data);
      return data;
    } catch (e) {
      setSimStatus('error');
      setSimResult({ error: e.message });
      return null;
    }
  };

  const handleInject = () => setScenarioCount(prev => prev + 1);

  return (
    <>
      {/* ── Background layer ── */}
      <div className="bg-layer" />

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">⚓</div>
          PortAutopsy
        </div>
        <div className="navbar-sep" />
        <span className="tag tag-gray">v1.0</span>
        <div className="navbar-end">
          <div className="live-pill">
            <div className="status-dot live" />
            Live System
          </div>
          <span className="tag tag-blue">Agents: {agentCount}</span>
          <span className="tag tag-mint">Scenarios: {scenarioCount}</span>
        </div>
      </nav>

      {/* ── Simulation Controls ── */}
      <SimControls
        externalStatus={simStatus}
        externalResult={simResult}
        onSimComplete={handleSimComplete}
        onInject={handleInject}
        onRunSimulation={runSimulation}
      />

      {/* ── Two-column layout ── */}
      <div className="layout">

        {/* LEFT: PortMap + Telemetry stacked */}
        <div className="col-left">

          {/* Port Map — fills upper space */}
          <div className="card portmap-card">
            <PortMap refreshKey={simRefreshKey} />
          </div>

          {/* Telemetry Log — fixed height, scrollable */}
          <div className="card-dark telemetry-card">
            <AgentTimeline refreshKey={simRefreshKey} />
          </div>

        </div>

        {/* RIGHT: Metrics then Autopsy, scrollable column */}
        <div className="col-right">
          <div className="card metrics-card">
            <MetricsPanel showFixed={showFixed} />
          </div>
          <div className="card autopsy-card">
            <AutopsyPanel
              onReportLoaded={() => setShowFixed(true)}
              onHealComplete={runSimulation}
            />
          </div>
        </div>

      </div>
    </>
  );
}
