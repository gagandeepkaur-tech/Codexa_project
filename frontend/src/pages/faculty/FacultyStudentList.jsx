import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { clearFacultySession, getFacultySession } from "../../utils/session";

export default function FacultyStudentList() {
  const navigate = useNavigate();
  const session = getFacultySession();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    semester: "",
    branch: "",
    section: ""
  });
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

  function handleExpiredFacultySession(message = "Your faculty session expired. Please log in again.") {
    clearFacultySession();
    setStudents([]);
    setStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/faculty/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStatus({
        loading: true,
        error: ""
      });

      if (!session?.token) {
        if (isMounted) {
          setStudents([]);
          setStatus({
            loading: false,
            error: "Log in as faculty to review accessible students."
          });
        }
        return;
      }

      try {
        const data = await apiRequest("/users/students/accessible", {}, session.token);

        if (isMounted) {
          setStudents(Array.isArray(data) ? data : data?.students || []);
          setStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          if (error.message === "Invalid or expired token.") {
            handleExpiredFacultySession();
            return;
          }

          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [session?.token]);

  // Group students into cohorts: Semester -> Branch -> Section
  const cohorts = useMemo(() => {
    const map = {};
    students.forEach((st) => {
      const sem = st.profile?.semester || 1;
      const branch = st.profile?.branch || "General";
      const sec = st.profile?.section || "A";
      const batch = st.profile?.batch || "2024-2028";
      const key = `sem${sem}_${branch}_sec${sec}`;
      if (!map[key]) {
        map[key] = {
          key,
          semester: String(sem),
          branch,
          section: sec,
          batch,
          students: []
        };
      }
      map[key].students.push(st);
    });

    return Object.values(map).sort(
      (a, b) => Number(a.semester) - Number(b.semester) || a.branch.localeCompare(b.branch) || a.section.localeCompare(b.section)
    );
  }, [students]);

  // Extract distinct filter dropdown options
  const filterOptions = useMemo(() => {
    const semesters = new Set();
    const branches = new Set();
    const sections = new Set();

    students.forEach((st) => {
      if (st.profile?.semester) semesters.add(String(st.profile.semester));
      if (st.profile?.branch) branches.add(st.profile.branch);
      if (st.profile?.section) sections.add(st.profile.section);
    });

    return {
      semesters: Array.from(semesters).sort((a, b) => Number(a) - Number(b)),
      branches: Array.from(branches).sort(),
      sections: Array.from(sections).sort()
    };
  }, [students]);

  // Selected Cohort
  const activeCohort = useMemo(() => {
    if (!filters.semester || !filters.branch || !filters.section) return null;
    return cohorts.find(
      (c) => c.semester === String(filters.semester) && c.branch === filters.branch && c.section === filters.section
    ) || null;
  }, [cohorts, filters.semester, filters.branch, filters.section]);

  // Filtered Students strictly isolated to active cohort
  const displayStudents = useMemo(() => {
    if (!activeCohort) return [];
    const query = filters.search.toLowerCase().trim();
    if (!query) return activeCohort.students;

    return activeCohort.students.filter(
      (student) =>
        student.full_name?.toLowerCase().includes(query) ||
        student.profile?.roll_number?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
    );
  }, [activeCohort, filters.search]);

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Student Access"
      title="Review the students you teach"
      subtitle="Select a Semester, Class, and Section below to view isolated student records without mixing cohorts."
      meta={`${students.length} students`}
      sidebarNote="Student access for faculty stays limited to shared courses, so roster review and attempt inspection never leak outside assigned teaching scope."
    >
      <PlatformStats
        items={[
          {
            label: "Total Students",
            value: students.length,
            note: "Enrolled in your assigned courses"
          },
          {
            label: "Active Cohorts",
            value: cohorts.length,
            note: "Class & Section partitions"
          }
        ]}
      />

      <PlatformSection label="Directory" title="Academic Class & Section Cohorts">
        {/* Cohort Selector Filter Bar */}
        <div
          style={{
            padding: "1.1rem 1.4rem",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "0.98rem", color: "#fff", fontWeight: 700 }}>
                Select Academic Cohort (Semester ➔ Class ➔ Subclass)
              </h3>
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Select a semester, branch, and section to view isolated student records without mixing cohorts.
              </p>
            </div>

            {activeCohort && (
              <button
                className="compact-btn compact-btn-secondary"
                onClick={() => setFilters({ search: "", semester: "", branch: "", section: "" })}
                style={{ fontSize: "0.78rem" }}
              >
                ← Back to All Class Sections
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
            {/* 1. Semester */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>1. Semester:</span>
              <select
                className="roster-filter-select"
                value={filters.semester}
                onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
                style={{ margin: 0 }}
              >
                <option value="">Choose Semester</option>
                {filterOptions.semesters.map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            {/* 2. Branch */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>2. Class (Branch):</span>
              <select
                className="roster-filter-select"
                value={filters.branch}
                onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
                style={{ margin: 0 }}
              >
                <option value="">Choose Branch</option>
                {filterOptions.branches.map((br) => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
            </div>

            {/* 3. Section */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>3. Subclass (Sec):</span>
              <select
                className="roster-filter-select"
                value={filters.section}
                onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
                style={{ margin: 0 }}
              >
                <option value="">Choose Section</option>
                {filterOptions.sections.map((sec) => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {status.loading ? <p className="dashboard-copy">Loading students...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <>
            {/* IF NO COHORT IS SELECTED YET: Show Cohort Cards Grid */}
            {!activeCohort ? (
              <div>
                <div style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.88rem", fontWeight: 600 }}>
                  Select an academic group below to open its student roster:
                </div>

                {cohorts.length === 0 ? (
                  <p className="dashboard-copy">No student cohorts found in your assigned courses.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                    {cohorts.map((cohort) => {
                      const totalRuns = cohort.students.reduce((sum, s) => sum + (s.submission_count || 0), 0);
                      const acceptedRuns = cohort.students.reduce((sum, s) => sum + (s.accepted_count || 0), 0);
                      const avgSuccess = totalRuns > 0 ? Math.round((acceptedRuns / totalRuns) * 100) : 0;

                      return (
                        <div
                          key={cohort.key}
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              semester: cohort.semester,
                              branch: cohort.branch,
                              section: cohort.section
                            }));
                          }}
                          style={{
                            padding: "1.4rem",
                            background: "rgba(255, 255, 255, 0.025)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(124, 92, 255, 0.08)";
                            e.currentTarget.style.borderColor = "rgba(124, 92, 255, 0.4)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.025)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
                            <span className="fd-badge fd-badge-primary">
                              Semester {cohort.semester}
                            </span>
                            <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                              {cohort.batch}
                            </span>
                          </div>

                          <h4 style={{ margin: "0 0 0.3rem 0", color: "#fff", fontSize: "1.1rem", fontWeight: 800 }}>
                            {cohort.branch} — Section {cohort.section}
                          </h4>

                          <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "1rem" }}>
                            {cohort.students.length} {cohort.students.length === 1 ? "student enrolled" : "students enrolled"}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                            <span style={{ color: "#64748b" }}>Success: <strong style={{ color: avgSuccess > 50 ? "#22c55e" : "#38bdf8" }}>{avgSuccess}%</strong></span>
                            <span style={{ color: "#7C5CFF", fontWeight: 700 }}>Open Section Roster →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* WHEN COHORT IS SELECTED: Show isolated roster for this group only */
              <div>
                {/* Search Bar inside selected cohort */}
                <div className="filter-bar" style={{ marginBottom: "1.2rem" }}>
                  <input
                    aria-label="Search students"
                    className="filter-input"
                    name="search"
                    placeholder={`Search students in Semester ${activeCohort.semester} - ${activeCohort.branch} (Sec ${activeCohort.section})...`}
                    type="search"
                    value={filters.search}
                    onChange={(event) => {
                      setFilters((prev) => ({
                        ...prev,
                        search: event.target.value
                      }));
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem", fontSize: "0.82rem", color: "#94a3b8" }}>
                  Showing {displayStudents.length} of {activeCohort.students.length} students in <strong>Semester {activeCohort.semester} • {activeCohort.branch} • Section {activeCohort.section}</strong>
                </div>

                {displayStudents.length === 0 ? (
                  <p className="dashboard-copy">No students matched the search in this section.</p>
                ) : (
                  <div className="question-list">
                    {displayStudents.map((student) => {
                      const acceptedRuns = student.accepted_count || 0;
                      const totalSubmissions = student.submission_count || 0;
                      const progressPct = totalSubmissions > 0 ? Math.min(100, Math.round((acceptedRuns / totalSubmissions) * 100)) : 0;

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
                            <div className="sidebar-profile-avatar" style={{ width: "40px", height: "40px", fontSize: "14px" }}>
                              {student.full_name ? student.full_name.slice(0, 2).toUpperCase() : "ST"}
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "1.08rem" }}>{student.full_name}</h3>
                              <p className="question-meta" style={{ margin: 0 }}>{student.email}</p>
                            </div>
                          </div>

                          <div className="course-progress-block" style={{ margin: "1rem 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                              <span>Activity Success Rate</span>
                              <span style={{ color: progressPct > 70 ? "#16a34a" : progressPct > 35 ? "#0284c7" : "#d97706" }}>
                                {progressPct}% Success ({acceptedRuns} accepted)
                              </span>
                            </div>
                            <div className="progress-meter" style={{ height: "10px", background: "rgba(148, 163, 184, 0.15)" }}>
                              <div
                                className="progress-meter-fill"
                                style={{
                                  width: `${progressPct}%`,
                                  background: progressPct > 70 ? "linear-gradient(90deg, #22c55e, #16a34a)" : progressPct > 35 ? "linear-gradient(90deg, #38bdf8, #0284c7)" : "linear-gradient(90deg, #fbbf24, #d97706)",
                                  height: "100%",
                                  borderRadius: "6px"
                                }}
                              />
                            </div>
                            <div className="stats-inline" style={{ marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
                              <span>Accepted Verdicts: {student.accepted_count || 0}</span>
                            </div>
                          </div>

                          <div className="compact-action-row">
                            <Link className="compact-btn compact-btn-primary" to={`/faculty/students/${student.id}/submissions`}>
                              Open Student Progress & Attempts →
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
