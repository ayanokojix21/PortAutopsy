import React, { useEffect, useState, useRef } from 'react';
import './LandingPage.css';

import heroImg from '../assets/parallax_hero.png';
import chaosImg from '../assets/parallax_chaos.png';
import dagImg from '../assets/parallax_dag.png';

export default function LandingPage({ onNavigate }) {
  const [scrollY, setScrollY] = useState(0);
  const canvasRef = useRef(null);

  // General parallax scroll state
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Frame sequence preloading and drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    
    // Set internal resolution (adjust if your frames are different)
    canvas.width = 1920;
    canvas.height = 1080;

    const frameCount = 252;
    const currentFrame = index => `/frames/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

    const images = [];
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      images.push(img);
    }

    images[0].onload = () => {
      context.drawImage(images[0], 0, 0, canvas.width, canvas.height);
    };

    const updateImage = (index) => {
      if (images[index] && images[index].complete) {
        context.drawImage(images[index], 0, 0, canvas.width, canvas.height);
      }
    };

    const handleScrollAnim = () => {
      // The container is 300vh tall. Map the video across the entire height.
      // This ensures the video is still playing while it scrolls up and out of view.
      const scrollMax = window.innerHeight * 3;
      const scrollFraction = window.scrollY / scrollMax;
      
      let frameIndex = Math.floor(scrollFraction * frameCount);
      
      if (frameIndex < 0) frameIndex = 0;
      if (frameIndex > frameCount - 1) frameIndex = frameCount - 1;
      
      requestAnimationFrame(() => {
        updateImage(frameIndex);
      });
    };

    window.addEventListener('scroll', handleScrollAnim, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollAnim);
  }, []);

  return (
    <div className="landing-wrapper">
      
      {/* Navbar (Sticky) */}
      <nav className="landing-nav-sticky">
        <div className="nav-logo">
          <span className="nav-icon">⚓</span>
          PortAutopsy
        </div>
        <div className="nav-links">
          <button className="nav-btn-text" onClick={() => onNavigate('architecture')}>Architecture</button>
          <button className="btn-primary-sm" onClick={() => onNavigate('dashboard')}>Launch Dashboard</button>
        </div>
      </nav>

      {/* --- Section 1: The Vision (Hero Sequence) --- */}
      <section className="hero-sequence-container" id="hero">
        <div id="sticky-hero-wrapper" className="sticky-hero-wrapper">
          <canvas ref={canvasRef} className="sequence-canvas"></canvas>
          <div className="parallax-overlay dark-overlay" />
          {/* First Content Block (Fades out) */}
          <div 
            className="hero-content-layer"
            style={{
              transform: `translateY(-${scrollY * 0.6}px)`,
              opacity: Math.max(0, 1 - (scrollY / (window.innerHeight * 1.2))),
              pointerEvents: scrollY < window.innerHeight * 1.2 ? 'auto' : 'none',
              transition: 'opacity 0.1s ease-out'
            }}
          >
            <div className="content-container center-text">
              <div className="badge-pill mb-6 fade-in-up">
                <span className="badge-dot"></span> Next-Gen Network Simulation
              </div>
              <h1 className="hero-title fade-in-up" style={{ animationDelay: '0.1s' }}>
                Securing the Future of<br/><span className="text-gradient">Autonomous Systems.</span>
              </h1>
              <p className="hero-subtitle fade-in-up" style={{ animationDelay: '0.2s' }}>
                Welcome to PortAutopsy. A 200-agent simulation where every decision is traced, every failure is analyzed, and causal intelligence rules.
              </p>

              <div className="fade-in-up mt-8 hero-actions-flex justify-center" style={{ animationDelay: '0.3s' }}>
                <button className="btn-primary glow-on-hover px-8 py-4 text-lg" onClick={() => onNavigate('dashboard')}>
                  Enter the Port Simulation
                </button>
                <button className="btn-secondary px-8 py-4 text-lg" onClick={() => onNavigate('architecture')}>
                  View Architecture
                </button>
              </div>

              <div className="hero-team-grid">
                {[
                  { name: 'Nischal', role: 'Intelligence (ML)', desc: 'Causal DAG & Autopsy Agent' },
                  { name: 'Vaidik', role: 'Backend Simulation', desc: 'Agent Negotiation Engine' },
                  { name: 'Smarak', role: 'Real-Time Infra', desc: 'FastAPI & WebSockets' },
                  { name: 'Vinayak', role: 'Interactive Dashboard', desc: 'React Visualizations' }
                ].map((member, i) => (
                  <div 
                    key={member.name} 
                    className="hero-team-card" 
                    style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                  >
                    <div className="hero-team-name">{member.name}</div>
                    <div className="hero-team-role">{member.role}</div>
                    <div className="hero-team-desc">{member.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Second Content Block (Fades in) */}
          <div 
            className="hero-content-layer"
            style={{
              transform: `translateY(${Math.max(0, 100 - (scrollY - window.innerHeight * 0.7) * 0.2)}px)`,
              opacity: Math.max(0, Math.min(1, (scrollY - window.innerHeight * 0.7) / (window.innerHeight * 0.4))),
              pointerEvents: scrollY > window.innerHeight * 0.7 ? 'auto' : 'none',
              transition: 'opacity 0.1s ease-out'
            }}
          >
            <div className="content-container center-text">
              <h2 className="hero-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>The Mission</h2>
              <p className="hero-subtitle" style={{ maxWidth: '900px', margin: '0 auto', fontSize: '1.4rem', color: '#f3f4f6', lineHeight: '1.8' }}>
                To engineer a fault-tolerant, causal-aware simulation environment where AI agents don't just react to chaos—they <span className="text-gradient font-bold">learn, adapt, and autonomously heal</span> the infrastructure before critical collapse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 2: The Chaos --- */}
      <section className="parallax-section" id="chaos">
        <div 
          className="parallax-bg" 
          style={{ 
            backgroundImage: `url(${chaosImg})`,
            transform: `translateY(${(scrollY - window.innerHeight * 3) * 0.4}px)`
          }} 
        />
        <div className="parallax-overlay red-overlay" />
        <div className="content-container split-layout">
          <div className="text-content reveal-on-scroll">
            <h2 className="section-title text-red">The Chaos of Emergence</h2>
            <p className="section-text">
              When 200 autonomous container-agents negotiate for limited resources (4 berths and 6 cranes), chaos is inevitable. 
            </p>
            <p className="section-text">
              Traditional logs fail to capture multi-agent interactions. What happens when two agents stubbornly bid MAX on a single crane? A <strong>Deadlock</strong>. What happens when a customs agent overrides an urgency flag? A <strong>Cascading Failure</strong>. What if a constraint is silently dropped? A <strong>Cold-Chain Violation</strong>.
            </p>
            <div className="chaos-metrics">
              <div className="metric-box border-red">
                <div className="metric-value text-red">200</div>
                <div className="metric-label">LLM Agents</div>
              </div>
              <div className="metric-box border-red">
                <div className="metric-value text-red">100+</div>
                <div className="metric-label">Negotiations / sec</div>
              </div>
            </div>
          </div>
          <div className="visual-content">
            {/* Visual spacer for layout */}
          </div>
        </div>
      </section>

      {/* --- Section 3: Causal Intelligence --- */}
      <section className="parallax-section" id="solution">
        <div 
          className="parallax-bg" 
          style={{ 
            backgroundImage: `url(${dagImg})`,
            transform: `translateY(${(scrollY - window.innerHeight * 4) * 0.4}px)`
          }} 
        />
        <div className="parallax-overlay blue-overlay" />
        <div className="content-container split-layout reverse">
          <div className="text-content reveal-on-scroll">
            <h2 className="section-title text-blue">Causal Intelligence</h2>
            <p className="section-text">
              Enter the Autopsy SDK. By wrapping LLM agents with a single <code>@trace_agent</code> decorator, we capture every prompt, decision, and chain-of-thought into a centralized SQLite database.
            </p>
            <p className="section-text">
              When a failure occurs, the <strong>Causal Engine</strong> steps in. It builds a Directed Acyclic Graph (DAG) of all downstream effects, traces back to the root cause agent, and runs <strong>Counterfactual Simulations</strong>. "What if Agent 47 had bid on crane 2 instead?"
            </p>
            <p className="section-text font-bold text-mint">
              The result: A plain-English autopsy report with the exact code fix, generated by Claude Sonnet.
            </p>
          </div>
          <div className="visual-content">
            {/* Visual spacer for layout */}
          </div>
        </div>
      </section>

      {/* --- Section 4: Architecture --- */}
      <section className="architecture-section">
        <div className="content-container center-text">
          <h2 className="section-title mb-12">The Simulation Architecture</h2>
          
          <div className="arch-grid">
            <div className="arch-card">
              <div className="arch-icon text-mint">🧠</div>
              <h3 className="arch-card-title">Intelligence Track (ML)</h3>
              <p className="arch-card-desc">
                The observability brain. Powers the SDK, builds the causal DAG from event streams, detects anomalies, and generates LLM-powered autopsy reports.
              </p>
            </div>
            
            <div className="arch-card">
              <div className="arch-icon text-blue">🏗️</div>
              <h3 className="arch-card-title">Port Simulation (Backend)</h3>
              <p className="arch-card-desc">
                The core engine. Orchestrates the <code>NegotiationLoop</code>, manages resource states (berths/cranes), and handles failure injection for stress testing.
              </p>
            </div>

            <div className="arch-card">
              <div className="arch-icon text-purple">⚡</div>
              <h3 className="arch-card-title">Real-Time Infrastructure</h3>
              <p className="arch-card-desc">
                A FastAPI server running a WebSocket bridge, streaming trace events directly from the simulation to the dashboard without latency.
              </p>
            </div>

            <div className="arch-card">
              <div className="arch-icon text-orange">🖥️</div>
              <h3 className="arch-card-title">Interactive Dashboard</h3>
              <p className="arch-card-desc">
                A dynamic React frontend. Visualizes the port map, tracks agent telemetry, and provides a sleek interface for reviewing autopsy reports and healing the system.
              </p>
            </div>
          </div>

          <div className="mt-16 pb-16 hero-actions-flex justify-center">
            <button className="btn-primary glow-on-hover px-10 py-5 text-xl" onClick={() => onNavigate('dashboard')}>
              Experience PortAutopsy Now
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
