import "./Login.css";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { saveStudentSession, saveFacultySession, saveAdminSession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const initialForm = {
  email: "",
  password: ""
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    document.title = "Codexa | Developer Login";
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({
      type: "",
      message: ""
    });

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      const session = {
        token: data.token,
        user: data.user
      };

      const role = data.user.role;

      if (role === "admin") {
        saveAdminSession(session);
        setStatus({
          type: "success",
          message: data.message || "Admin login successful."
        });
        navigate("/admin/dashboard", { state: { session } });
      } else if (role === "faculty") {
        saveFacultySession(session);
        setStatus({
          type: "success",
          message: data.message || "Faculty login successful."
        });
        navigate("/faculty/dashboard", { state: { session } });
      } else if (role === "student") {
        saveStudentSession(session);
        setStatus({
          type: "success",
          message: data.message || "Student login successful."
        });
        navigate("/student/dashboard", { state: { session } });
      } else {
        throw new Error("Invalid user role received.");
      }

      setForm(initialForm);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="lc-login-container">


      {/* Background glass overlay */}
      <div className="lc-login-bg-overlay"></div>

      {/* Background aurora blurs */}
      <div className="lc-glow-orange"></div>
      <div className="lc-glow-purple"></div>

      <div className="lc-split-layout">
        {/* Left Side: Mock Dev Workspace */}
        <section className="lc-left-panel">
          <Link className="lc-brand" to="/">
            <div className="lc-brand-logo" style={{ display: "flex", alignItems: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <defs>
                  <linearGradient id="codexa-grad-login" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <path 
                  d="M16.5 5.5 L12 2.9 L4 7.5 L4 16.5 L12 21.1 L16.5 18.5" 
                  fill="none" 
                  stroke="url(#codexa-grad-login)" 
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
            <span className="lc-brand-text">codexa</span>
          </Link>

          <div className="lc-hero-content">
            <span className="lc-kicker">CODE. LEARN. COMPETE. SUCCEED.</span>
            <h2 className="lc-left-title">Unlock your developer workspace.</h2>
            <p className="lc-left-desc">
              Solve coding challenges, join virtual classrooms, and run compilation setups in a unified, professional coding workspace.
            </p>
          </div>

          {/* IDE Mockup */}
          <div className="lc-code-card">
            <div className="lc-code-header">
              <span className="lc-dot red"></span>
              <span className="lc-dot yellow"></span>
              <span className="lc-dot green"></span>
              <span className="lc-file-name">two_sum.py</span>
            </div>
            <pre className="lc-code-content">
              <code>
                <span className="keyword">class</span> <span className="function">Solution</span>:<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">def</span> <span className="function">twoSum</span>(self, nums: List[int], target: int) -&gt; List[int]:<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen = &#123;&#125;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">for</span> i, num <span className="keyword">in</span> <span className="function">enumerate</span>(nums):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;remaining = target - num<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">if</span> remaining <span className="keyword">in</span> seen:<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">return</span> [seen[remaining], i]<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen[num] = i<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">return</span> []
              </code>
            </pre>

            {/* Verdict Box */}
            <div className="lc-verdict-badge">
              <div className="lc-verdict-header">
                <span className="lc-verdict-dot"></span>
                <strong>STATUS VERDICT</strong>
              </div>
              <div className="lc-verdict-status" style={{ color: "#81C784" }}>Accepted</div>
              <div className="lc-verdict-info">Runtime: 12 ms | Memory: 14.2 MB</div>
            </div>
          </div>

          <div className="lc-metric-row">
            <div className="lc-metric-item">
              <span>Challenges</span>
              <strong>800+ Problems</strong>
            </div>
            <div className="lc-metric-item">
              <span>Compiler</span>
              <strong>Multi-Language</strong>
            </div>
            <div className="lc-metric-item">
              <span>Evaluation</span>
              <strong>Real-Time</strong>
            </div>
          </div>
        </section>

        {/* Right Side: Sign In Card */}
        <section className="lc-right-panel">
          <div className="lc-card-header">
            <div className="lc-system-status">
              <span className="lc-status-dot"></span>
              <span>Authentication Service: Online</span>
            </div>
            <h1 className="lc-card-title">Sign In</h1>
            <p className="lc-card-subtitle">Welcome back. Please enter your institutional details.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="lc-form-group">
              <label className="lc-input-label" htmlFor="email">
                Username or institutional email
              </label>
              <div className="lc-input-wrapper">
                <span className="lc-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  className="lc-form-input"
                  id="email"
                  name="email"
                  type="text"
                  placeholder="CRN or username@college.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="lc-form-group">
              <label className="lc-input-label" htmlFor="password">
                Password
              </label>
              <div className="lc-input-wrapper">
                <span className="lc-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className="lc-form-input password-input"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="lc-eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button className="lc-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Enter platform dashboard"}
            </button>
          </form>

          {status.message ? (
            <div className={status.type === "success" ? "lc-success-banner" : "lc-error-banner"}>
              <span style={{ display: 'flex', marginTop: '2px' }}>
                {status.type === "success" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </span>
              <span>{status.message}</span>
            </div>
          ) : null}

          <div className="lc-form-footer">
            <Link className="lc-link" to="/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Home
            </Link>
            <span style={{ color: 'var(--lc-border)' }}>•</span>
            <span style={{ color: 'var(--lc-text-muted)' }}>Admin account creation only</span>
          </div>
        </section>
      </div>
    </div>
  );
}
