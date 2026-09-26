import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../utils/api";

export default function StudentProgressAnalytics({ role, session }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      if (!session?.token) {
        setStatus({ loading: false, error: "Authentication required" });
        return;
      }

      setStatus({ loading: true, error: "" });

      try {
        const endpoint = role === "admin" ? "/users?role=student" : "/users/students/accessible";
        const data = await apiRequest(endpoint, {}, session.token);

        if (isMounted) {
          setStudents(Array.isArray(data) ? data : []);
          setStatus({ loading: false, error: "" });
        }
      } catch (err) {
        if (isMounted) {
          setStatus({ loading: false, error: err.message || "Failed to load student analytics" });
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [role, session?.token]);

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.profile?.roll_number?.toLowerCase().includes(q) ||
      s.profile?.branch?.toLowerCase().includes(q) ||
      s.profile?.section?.toLowerCase().includes(q);

    const totalSub = s.submission_count || 0;
    const accepted = s.accepted_count || 0;
    const pct = totalSub > 0 ? Math.min(100, Math.round((accepted / totalSub) * 100)) : 0;

    if (statusFilter === "ontrack") return matchesSearch && pct >= 70;
    if (statusFilter === "inprogress") return matchesSearch && pct >= 30 && pct < 70;
    if (statusFilter === "needshelp") return matchesSearch && pct < 30;
    return matchesSearch;
  });

  const avgProgress =
    students.length > 0
      ? Math.round(
          students.reduce((acc, s) => {
            const sub = s.submission_count || 0;
            const accCount = s.accepted_count || 0;
            return acc + (sub > 0 ? Math.min(100, (accCount / sub) * 100) : 0);
          }, 0) / students.length
        )
      : 0;

  const onTrackCount = students.filter((s) => {
    const sub = s.submission_count || 0;
    return sub > 0 && (s.accepted_count / sub) >= 0.7;
  }).length;

  const needsHelpCount = students.filter((s) => {
    const sub = s.submission_count || 0;
    return sub === 0 || (s.accepted_count / sub) < 0.3;
  }).length;

  return (
    <div className="analytics-student-progress-wrapper" style={{ marginTop: "1.5rem" }}>
      <div className="platform-section-head">
        <div>
          <p className="platform-section-label">Student Performance & Progress</p>
          <h2>Student Course Completion Analytics</h2>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="platform-stats-grid" style={{ marginBottom: "1.5rem" }}>
        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <span>Total Reachable Students</span>
          <strong>{students.length}</strong>
        </article>

        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span>Average Accuracy / Progress</span>
          <strong>{avgProgress}%</strong>
        </article>

        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span>On Track (&gt;70%)</span>
          <strong>{onTrackCount}</strong>
        </article>

        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span>Needs Support (&lt;30%)</span>
          <strong>{needsHelpCount}</strong>
        </article>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          aria-label="Search student analytics"
          className="filter-input"
          placeholder="Search by student name, roll number, email, branch, or section..."
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "260px" }}
        />

        <div className="platform-tab-bar" style={{ margin: 0 }}>
          <button
            type="button"
            className={`platform-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({students.length})
          </button>
          <button
            type="button"
            className={`platform-tab ${statusFilter === "ontrack" ? "active" : ""}`}
            onClick={() => setStatusFilter("ontrack")}
          >
            On Track ({onTrackCount})
          </button>
          <button
            type="button"
            className={`platform-tab ${statusFilter === "needshelp" ? "active" : ""}`}
            onClick={() => setStatusFilter("needshelp")}
          >
            Needs Support ({needsHelpCount})
          </button>
        </div>
      </div>

      {status.loading ? <p className="dashboard-copy">Loading student progress analytics...</p> : null}
      {status.error ? <p className="form-status error">{status.error}</p> : null}

      {!status.loading && !status.error ? (
        <div className="question-list">
          {filteredStudents.length === 0 ? (
            <p className="dashboard-copy">No students matched the selected search or filter criteria.</p>
          ) : (
            filteredStudents.map((student) => {
              const totalSub = student.submission_count || 0;
              const accepted = student.accepted_count || 0;
              const progressPct = totalSub > 0 ? Math.min(100, Math.round((accepted / totalSub) * 100)) : 0;

              return (
                <article className="question-card student-roster-progress-card" key={student.id}>
                  <div className="question-card-top">
                    <span className="difficulty-pill easy">
                      {student.profile?.roll_number ? `Roll: ${student.profile.roll_number}` : "Student"}
                    </span>
                    <span className="question-meta">
                      {student.profile?.branch || "-"} | Sem {student.profile?.semester || "-"} | Sec {student.profile?.section || "-"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
                    <div className="sidebar-profile-avatar" style={{ width: "42px", height: "42px", fontSize: "15px" }}>
                      {student.full_name ? student.full_name.slice(0, 2).toUpperCase() : "ST"}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{student.full_name}</h3>
                      <p className="question-meta" style={{ margin: 0 }}>{student.email}</p>
                    </div>
                  </div>

                  <div className="course-progress-block" style={{ margin: "1rem 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      <span>Course & Activity Progress</span>
                      <span style={{ color: progressPct > 70 ? "#16a34a" : progressPct > 35 ? "#0284c7" : "#d97706" }}>
                        {progressPct}% Accuracy / Progress
                      </span>
                    </div>
                    <div className="progress-meter" style={{ height: "10px", background: "rgba(148, 163, 184, 0.15)" }}>
                      <div
                        className="progress-meter-fill"
                        style={{
                          width: `${progressPct}%`,
                          background:
                            progressPct > 70
                              ? "linear-gradient(90deg, #22c55e, #16a34a)"
                              : progressPct > 35
                                ? "linear-gradient(90deg, #38bdf8, #0284c7)"
                                : "linear-gradient(90deg, #fbbf24, #d97706)",
                          height: "100%",
                          borderRadius: "6px"
                        }}
                      />
                    </div>
                    <div className="stats-inline" style={{ marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
                      <span>Accepted Verdicts: {accepted}</span>
                    </div>
                  </div>

                  <div className="compact-action-row">
                    <Link
                      className="compact-btn compact-btn-primary"
                      to={`/${role}/students/${student.id}/submissions`}
                    >
                      Open Student Progress & Attempts →
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
