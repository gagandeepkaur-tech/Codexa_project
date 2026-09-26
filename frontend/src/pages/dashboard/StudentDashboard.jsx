import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout } from "../../components/PlatformLayout/PlatformLayout";
import { getStudentSession } from "../../utils/session";
import { apiRequest } from "../../utils/api";

export default function StudentDashboard() {
  const session = getStudentSession();
  const user = session?.user;
  const profile = user?.profile || null;

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useState([
    { difficulty: "easy", total_submissions: 0, accepted_submissions: 0, solved_problems: 0 },
    { difficulty: "medium", total_submissions: 0, accepted_submissions: 0, solved_problems: 0 },
    { difficulty: "hard", total_submissions: 0, accepted_submissions: 0, solved_problems: 0 }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      if (!session?.token) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const [coursesRes, problemsRes, progressRes, examsRes] = await Promise.allSettled([
          apiRequest("/courses?enrolledOnly=true", {}, session.token),
          apiRequest("/problems", {}, session.token),
          apiRequest(`/submissions/student/${user?.id || ""}/progress`, {}, session.token),
          apiRequest("/assignments/student/exams", {}, session.token)
        ]);

        if (isMounted) {
          const fetchedCourses = coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value) ? coursesRes.value : [];
          setCourses(fetchedCourses);

          const fetchedProblems = problemsRes.status === "fulfilled" && Array.isArray(problemsRes.value) ? problemsRes.value : [];
          setProblems(fetchedProblems);

          if (progressRes.status === "fulfilled" && Array.isArray(progressRes.value)) {
            setProgress(progressRes.value);
          }

          if (examsRes.status === "fulfilled" && Array.isArray(examsRes.value?.exams)) {
            setExams(examsRes.value.exams);
          }
        }
      } catch (err) {
        console.error("Failed to load student dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [session?.token, user?.id]);

  const totalSolved = useMemo(() => progress.reduce((sum, e) => sum + (e.solved_problems || 0), 0), [progress]);
  const totalAcceptedRuns = useMemo(() => progress.reduce((sum, e) => sum + (e.accepted_submissions || 0), 0), [progress]);
  const totalSubmissionsCount = useMemo(() => progress.reduce((sum, e) => sum + (e.total_submissions || 0), 0), [progress]);
  const accuracyRate = totalSubmissionsCount > 0 ? Math.round((totalAcceptedRuns / totalSubmissionsCount) * 100) : 0;

  const easySolved = progress.find((p) => p.difficulty === "easy")?.solved_problems || 0;
  const mediumSolved = progress.find((p) => p.difficulty === "medium")?.solved_problems || 0;
  const hardSolved = progress.find((p) => p.difficulty === "hard")?.solved_problems || 0;

  const easyTotal = problems.filter((p) => p.difficulty === "easy").length || 1;
  const mediumTotal = problems.filter((p) => p.difficulty === "medium").length || 1;
  const hardTotal = problems.filter((p) => p.difficulty === "hard").length || 1;

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const studentDisplayName = useMemo(() => {
    if (user?.full_name && user.full_name.trim() && user.full_name.toLowerCase() !== "student" && user.full_name.toLowerCase() !== "admin") {
      return user.full_name.trim();
    }
    if (user?.fullName && user.fullName.trim()) return user.fullName.trim();
    if (user?.name && user.name.trim()) return user.name.trim();
    if (user?.email) {
      const raw = user.email.split("@")[0].replace(/[._-]/g, " ").replace(/\d+/g, "").trim();
      if (raw) return raw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return "Student";
  }, [user]);

  return (
    <PlatformLayout role="student" activeItem="/student/dashboard">
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        
        {/* HERO BANNER */}
        <div style={{
          background: "linear-gradient(135deg, rgba(255, 126, 41, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(16, 185, 129, 0.05) 100%)",
          border: "1px solid rgba(255, 126, 41, 0.25)",
          borderRadius: "18px",
          padding: "1.75rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
              <span style={{
                background: "rgba(255, 126, 41, 0.2)",
                color: "#ff7e29",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 126, 41, 0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                Student Portal
              </span>
              {profile?.branch && (
                <span style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(59, 130, 246, 0.25)"
                }}>
                  {profile.branch} • Sem {profile.semester || 1} • Sec {profile.section || "A"}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--lc-text-primary)", margin: 0, lineHeight: 1.2 }}>
              {greetingTime}, {studentDisplayName} 👋
            </h1>
            <p style={{ color: "var(--lc-text-muted)", fontSize: "0.9rem", marginTop: "0.4rem", margin: 0 }}>
              Track your coursework, practice algorithmic problem solving, and prepare for scheduled MST examinations.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/student/problems"
              style={{
                background: "#ff7e29",
                color: "#fff",
                borderRadius: "10px",
                padding: "0.7rem 1.25rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(255, 126, 41, 0.35)"
              }}
            >
              💻 Practice Problems
            </Link>
            <Link
              to="/student/courses"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "var(--lc-text-primary)",
                border: "1px solid var(--lc-border)",
                borderRadius: "10px",
                padding: "0.7rem 1.25rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              📚 Enrolled Courses
            </Link>
            <Link
              to="/student/exams"
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                padding: "0.7rem 1.25rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              🎯 Tests & MST
            </Link>
          </div>
        </div>

        {/* 4 TOP PERFORMANCE STAT METRIC CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem"
        }}>
          {/* Card 1: Solved Problems */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--lc-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Problems Solved
              </span>
              <span style={{ fontSize: "1.25rem" }}>🎯</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--lc-text-primary)" }}>{totalSolved}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)" }}>/ {problems.length} total</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", fontSize: "0.78rem" }}>
              <span style={{ color: "#10b981", fontWeight: 600 }}>Easy: {easySolved}</span>
              <span style={{ color: "#f59e0b", fontWeight: 600 }}>Med: {mediumSolved}</span>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Hard: {hardSolved}</span>
            </div>
          </div>

          {/* Card 2: Acceptance Accuracy */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--lc-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Submission Accuracy
              </span>
              <span style={{ fontSize: "1.25rem" }}>⚡</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#10b981" }}>{accuracyRate}%</span>
              <span style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)" }}>success rate</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--lc-text-muted)", marginTop: "0.75rem" }}>
              {totalAcceptedRuns} accepted of {totalSubmissionsCount} runs
            </div>
          </div>

          {/* Card 3: Enrolled Courses */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--lc-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Enrolled Courses
              </span>
              <span style={{ fontSize: "1.25rem" }}>📚</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#38bdf8" }}>{courses.length}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)" }}>active classes</span>
            </div>
            <Link to="/student/courses" style={{ fontSize: "0.78rem", color: "#38bdf8", textDecoration: "none", marginTop: "0.75rem", fontWeight: 600, display: "inline-block" }}>
              View class syllabus →
            </Link>
          </div>

          {/* Card 4: Scheduled Tests & MSTs */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--lc-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Tests & Mid-Sems
              </span>
              <span style={{ fontSize: "1.25rem" }}>📝</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#ff7e29" }}>{exams.length}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)" }}>test papers</span>
            </div>
            <Link to="/student/exams" style={{ fontSize: "0.78rem", color: "#ff7e29", textDecoration: "none", marginTop: "0.75rem", fontWeight: 600, display: "inline-block" }}>
              Open examination portal →
            </Link>
          </div>
        </div>

        {/* 2 EQUAL BALANCED CARDS: ENROLLED COURSES + DIFFICULTY PROGRESS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.5rem"
        }}>
          {/* Left Card: Enrolled Courses List (CodeTantra Style) */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--lc-text-primary)", margin: 0 }}>
                  📖 Enrolled Courses & Modules
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--lc-text-muted)", margin: "0.2rem 0 0 0" }}>
                  Your enrolled classroom tracks and lab assignments
                </p>
              </div>
              <Link to="/student/courses" style={{ fontSize: "0.8rem", color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>
                View All ({courses.length})
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--lc-text-muted)" }}>
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <div style={{
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "12px",
                border: "1px dashed var(--lc-border)",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>📚</div>
                <p style={{ color: "var(--lc-text-muted)", fontSize: "0.875rem", margin: 0 }}>
                  No enrolled courses assigned to your batch yet.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1 }}>
                {courses.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--lc-border)",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          color: "#38bdf8",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px"
                        }}>
                          {c.code}
                        </span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--lc-text-primary)" }}>
                          {c.title}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--lc-text-muted)" }}>
                        {c.assignmentCount || 0} Assignments • {c.materialsCount || 0} Materials
                      </div>
                    </div>

                    <Link
                      to={`/student/courses/${c.id}`}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--lc-text-primary)",
                        border: "1px solid var(--lc-border)",
                        borderRadius: "8px",
                        padding: "0.45rem 0.85rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Resume →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Card: Solved by Difficulty (LeetCode Style) */}
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px solid var(--lc-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--lc-text-primary)", margin: 0 }}>
                📊 Solved by Difficulty
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--lc-text-muted)", margin: "0.2rem 0 0 0" }}>
                Mastery across Easy, Medium, and Hard coding challenges
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", margin: "auto 0" }}>
              {/* Easy Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>Easy Problems</span>
                  <span style={{ color: "var(--lc-text-primary)", fontWeight: 700 }}>
                    {easySolved} <span style={{ color: "var(--lc-text-muted)", fontWeight: 400 }}>/ {easyTotal}</span>
                  </span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((easySolved / easyTotal) * 100))}%`, height: "100%", background: "#10b981", borderRadius: "999px" }} />
                </div>
              </div>

              {/* Medium Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>Medium Problems</span>
                  <span style={{ color: "var(--lc-text-primary)", fontWeight: 700 }}>
                    {mediumSolved} <span style={{ color: "var(--lc-text-muted)", fontWeight: 400 }}>/ {mediumTotal}</span>
                  </span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((mediumSolved / mediumTotal) * 100))}%`, height: "100%", background: "#f59e0b", borderRadius: "999px" }} />
                </div>
              </div>

              {/* Hard Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>Hard Problems</span>
                  <span style={{ color: "var(--lc-text-primary)", fontWeight: 700 }}>
                    {hardSolved} <span style={{ color: "var(--lc-text-muted)", fontWeight: 400 }}>/ {hardTotal}</span>
                  </span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((hardSolved / hardTotal) * 100))}%`, height: "100%", background: "#ef4444", borderRadius: "999px" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--lc-border)", marginTop: "1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--lc-text-muted)" }}>Total Solved: <strong style={{ color: "var(--lc-text-primary)" }}>{totalSolved}</strong></span>
              <Link to="/student/problems" style={{ fontSize: "0.8rem", color: "#ff7e29", fontWeight: 600, textDecoration: "none" }}>
                Solve Next →
              </Link>
            </div>
          </div>
        </div>


        {/* FULL-WIDTH RECOMMENDED PRACTICE PROBLEM SET */}
        <div style={{
          background: "var(--lc-card-bg)",
          border: "1px solid var(--lc-border)",
          borderRadius: "16px",
          padding: "1.5rem 2rem",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--lc-text-primary)", margin: 0 }}>
                🚀 Recommended Practice Problem Set
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--lc-text-muted)", margin: "0.2rem 0 0 0" }}>
                Curated challenges to level up your data structures & algorithms proficiency
              </p>
            </div>
            <Link to="/student/problems" style={{ fontSize: "0.85rem", color: "#ff7e29", textDecoration: "none", fontWeight: 700 }}>
              Explore All Problems ({problems.length}) →
            </Link>
          </div>

          {problems.length === 0 ? (
            <p style={{ color: "var(--lc-text-muted)", fontSize: "0.85rem" }}>Loading problems...</p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem"
            }}>
              {problems.slice(0, 4).map((p) => {
                const diffColor = p.difficulty === "easy" ? "#10b981" : p.difficulty === "hard" ? "#ef4444" : "#f59e0b";
                return (
                  <Link
                    key={p.id}
                    to={`/student/problems/${p.id}/solve`}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--lc-border)",
                      borderRadius: "12px",
                      padding: "1.1rem 1.25rem",
                      textDecoration: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--lc-text-primary)", display: "block", marginBottom: "0.2rem" }}>
                        {p.title}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)" }}>
                        Standard Coding Round
                      </span>
                    </div>
                    <span style={{
                      color: diffColor,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: `${diffColor}18`,
                      border: `1px solid ${diffColor}30`,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "6px",
                      textTransform: "capitalize",
                      flexShrink: 0
                    }}>
                      {p.difficulty}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </PlatformLayout>
  );
}
