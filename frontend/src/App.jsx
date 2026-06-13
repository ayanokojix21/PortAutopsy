import { useState } from 'react';
import './App.css';
import SimControls from './components/SimControls';
import PortMap from './components/PortMap';
import AgentTimeline from './components/AgentTimeline';
import MetricsPanel from './components/MetricsPanel';
import AutopsyPanel from './components/AutopsyPanel';

export default function App() {
  const [showFixed, setShowFixed]       = useState(false);
  const [agentCount, setAgentCount]     = useState(200);
  const [scenarioCount, setScenarioCount] = useState(3);
  const [simDone, setSimDone]           = useState(false);

  const handleSimComplete = (data) => {
    if (data?.allocated) setAgentCount(data.allocated);
    if (data?.total)     setAgentCount(data.total);
    setSimDone(true);
  };

  const handleInject = () => {
    setScenarioCount(prev => prev + 1);
  };

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
        onSimComplete={handleSimComplete}
        onInject={handleInject}
      />

      {/* ── Two-column layout ── */}
      <div className="layout">

        {/* LEFT: PortMap + Telemetry stacked */}
        <div className="col-left">

          {/* Port Map — fills upper space */}
          <div className="card portmap-card">
            <PortMap />
          </div>

          {/* Telemetry Log — fixed height, scrollable */}
          <div className="card-dark telemetry-card">
            <AgentTimeline />
          </div>

        </div>

        {/* RIGHT: Metrics then Autopsy, scrollable column */}
        <div className="col-right">
          <div className="card metrics-card">
            <MetricsPanel showFixed={showFixed} />
          </div>
          <div className="card autopsy-card">
            <AutopsyPanel onReportLoaded={() => setShowFixed(true)} />
          </div>
        </div>

      </div>
    </>
  );
}
