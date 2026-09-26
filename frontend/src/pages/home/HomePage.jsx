import "./HomePage.css";
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  useEffect(() => {
    document.title = "Codexa | Dynamic Coding Platform";
    // Hide browser window scrollbars
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  return (
    <div className="hp-container">


      {/* Background glass overlay */}
      <div className="hp-bg-overlay"></div>

      {/* Background Blurs */}
      <div className="hp-glow-1"></div>
      <div className="hp-glow-2"></div>

      <div className="hp-content">
        {/* Navigation Header */}
        <header className="hp-header">
          <Link className="hp-brand" to="/">
            <div className="hp-brand-logo" style={{ display: "flex", alignItems: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <defs>
                  <linearGradient id="codexa-grad-hp" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <path 
                  d="M16.5 5.5 L12 2.9 L4 7.5 L4 16.5 L12 21.1 L16.5 18.5" 
                  fill="none" 
                  stroke="url(#codexa-grad-hp)" 
                  strokeWidth="3.6" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M8.5 9.5 L6 12 L8.5 14.5 M15.5 9.5 L18 12 L15.5 14.5 M13.5 8 L10.5 16" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="hp-brand-text">codexa</span>
          </Link>
        </header>

        {/* Main Hero Split Content */}
        <main className="hp-main">
          {/* Left Column: Title & Entry Action */}
          <section className="hp-left-col">
            <span className="hp-kicker">Developer Hub</span>
            <h1 className="hp-title">
              Train, review, and manage coding workflows.
            </h1>
            <p className="hp-desc">
              A unified environment featuring student practice dashboards, faculty assignments control, 
              interactive evaluation runtimes, and branch course setups.
            </p>
            <Link className="hp-primary-btn" to="/login">
              Enter Codexa Platform
            </Link>
          </section>

          {/* Right Column: Platform Features Overview & Languages */}
          <section className="hp-right-col">
            {/* Student card */}
            <article className="hp-card">
              <div className="hp-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div className="hp-card-text">
                <h3>Practice Workspace</h3>
                <p>Coding sandbox with requirements, live editors, and immediate testing verdicts.</p>
              </div>
            </article>

            {/* Faculty card */}
            <article className="hp-card">
              <div className="hp-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div className="hp-card-text">
                <h3>Faculty Classroom</h3>
                <p>Create assignments, inspect batch metrics, and control course enrollments.</p>
              </div>
            </article>

            {/* Admin card */}
            <article className="hp-card">
              <div className="hp-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="hp-card-text">
                <h3>Platform Control</h3>
                <p>Register users, manage database courses, and verify system actions.</p>
              </div>
            </article>

            {/* Compact Languages Row */}
            <div className="hp-lang-row">
              <span className="hp-lang-badge">C++</span>
              <span className="hp-lang-badge">Java</span>
              <span className="hp-lang-badge">Python</span>
              <span className="hp-lang-badge">JS</span>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="hp-footer" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center", padding: "1.5rem 0", borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "#8a8a8a", letterSpacing: "1px" }}>CODE. LEARN. COMPETE.</p>
          <p>© {new Date().getFullYear()} Codexa Coding Platform. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
