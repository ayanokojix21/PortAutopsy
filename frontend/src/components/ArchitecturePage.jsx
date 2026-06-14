import React, { useEffect } from 'react';
import './ArchitecturePage.css';
import dagImg from '../assets/parallax_dag.png';

export default function ArchitecturePage({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="arch-page">
      {/* Navigation */}
      <nav className="arch-nav">
        <div className="nav-logo cursor-pointer" onClick={() => onNavigate('landing')}>
          <span className="nav-icon">⚓</span>
          PortAutopsy
        </div>
        <div className="nav-links">
          <button className="nav-btn-text" onClick={() => onNavigate('landing')}>Home</button>
          <button className="btn-primary-sm" onClick={() => onNavigate('dashboard')}>Launch Dashboard</button>
        </div>
      </nav>

      {/* Header */}
      <header className="arch-header">
        <div className="arch-header-content">
          <div className="badge-pill mb-4"><span className="badge-dot"></span> System Documentation</div>
          <h1 className="arch-title">The Anatomy of <span className="text-gradient">PortAutopsy</span></h1>
          <p className="arch-subtitle">
            A comprehensive overview of the multi-agent simulation architecture, the counterfactual engine, and the real-time observability pipeline.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="arch-main">
        <div className="arch-container">

          {/* Intro Section */}
          <section className="arch-section">
            <h2 className="section-heading text-blue">1. The Port Simulation Engine</h2>
            <div className="section-body">
              <p>
                At the core of PortAutopsy lies a highly concurrent Python-based negotiation loop. <strong>200 autonomous container-agents</strong> independently bid and negotiate for limited port resources—specifically, <strong>4 berths</strong> and <strong>6 cranes</strong> (including specialized refrigerated cranes).
              </p>
              <p>
                The simulation manages complex state variables such as:
              </p>
              <ul className="arch-list">
                <li><strong>Cargo Types</strong>: Standard, Cold-Chain, and Hazardous Materials (Hazmat).</li>
                <li><strong>Constraints</strong>: Temperature tolerances, dwell time targets, and clearance status.</li>
                <li><strong>Urgency Tiers</strong>: Low, Normal, High, and Critical.</li>
              </ul>
              <p>
                To simulate real-world chaos, the backend features a robust <strong>Failure Injection Module</strong> capable of triggering deadlocks, cascading urgency overrides, and silent constraint drops.
              </p>
            </div>
          </section>

          {/* ML Track Section */}
          <section className="arch-section">
            <h2 className="section-heading text-mint">2. Causal Intelligence & The SDK</h2>
            <div className="section-body split-feature">
              <div className="feature-text">
                <p>
                  Observing a 200-agent system using traditional logs is practically impossible. The Intelligence Track solves this via the <strong>Autopsy SDK</strong>.
                </p>
                <p>
                  By wrapping any LLM agent call with the lightweight <code>@trace_agent</code> decorator, the system automatically captures inputs, outputs, and the agent's internal <em>chain-of-thought</em>. This data flows into an event stream bus and is persisted in a centralized SQLite database.
                </p>
                <p>
                  When an anomaly is detected (e.g., a cold-chain violation), the <strong>Causal Engine</strong> triggers:
                </p>
                <ol className="arch-list numbered">
                  <li><strong>DAG Building</strong>: Constructs a Directed Acyclic Graph connecting downstream effects to upstream decisions.</li>
                  <li><strong>Counterfactual Execution</strong>: Rewinds the simulation to the frozen state of the bad decision, alters the input, and re-runs the simulation.</li>
                  <li><strong>LLM Analysis</strong>: Passes the graph and counterfactual results to Claude Sonnet, which generates a deterministic, plain-English autopsy report containing the exact code fix.</li>
                </ol>
              </div>
              <div className="feature-visual">
                <img src={dagImg} alt="Causal DAG" className="visual-img floating-animation" />
              </div>
            </div>
          </section>

          {/* Real-time Infra Section */}
          <section className="arch-section">
            <h2 className="section-heading text-purple">3. Real-Time Infrastructure</h2>
            <div className="section-body">
              <p>
                To provide a seamless "Live System" experience, the entire backend is wrapped in a high-performance <strong>FastAPI server</strong>. 
              </p>
              <p>
                As the simulation loop runs, it pushes trace events through an in-memory event bus. A <strong>WebSocket Bridge</strong> intercepts these events and streams them directly to the frontend client in real-time, completely eliminating polling latency and enabling the dynamic Agent Timeline visualization.
              </p>
            </div>
          </section>

          {/* Frontend Section */}
          <section className="arch-section">
            <h2 className="section-heading text-orange">4. Interactive Dashboard</h2>
            <div className="section-body">
              <p>
                The frontend is a React-based interactive control center designed for live pitch demonstrations. It visualizes the raw JSON trace data into an intuitive, high-stakes command center.
              </p>
              <ul className="arch-list">
                <li><strong>Port Map</strong>: Real-time visualization of berths, cranes, and container allocations.</li>
                <li><strong>Agent Timeline</strong>: Streaming log of agent chain-of-thought and bidding decisions.</li>
                <li><strong>Autopsy Panel</strong>: Interactive interface to review the LLM-generated incident reports and deploy "Healing" patches with one click.</li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <div className="arch-cta">
            <h3 className="arch-cta-title">Ready to see it in action?</h3>
            <button className="btn-primary px-10 py-5 text-lg" onClick={() => onNavigate('dashboard')}>
              Launch the Simulation Dashboard
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
