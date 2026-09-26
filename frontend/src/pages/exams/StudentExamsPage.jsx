import { useState, useEffect } from "react";
import { PlatformLayout } from "../../components/PlatformLayout";
import CourseAssessmentWorkspace from "../../components/CourseAssessmentWorkspace";
import { apiRequest } from "../../utils/api";
import { getStudentSession, getFacultySession, getAdminSession } from "../../utils/session";
import { enterFullScreen, exitFullScreen } from "../../utils/fullscreen";

export default function StudentExamsPage() {
  const activeSession = getStudentSession();
  const user = activeSession?.user;
  const userRole = "student";

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeExam, setActiveExam] = useState(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(null);

  const handleStartExam = async (exam) => {
    try {
      await enterFullScreen();
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
    setActiveExam(exam);
    setShowInstructionsModal(null);
  };

  const handleExitExam = async () => {
    try {
      await exitFullScreen();
    } catch (err) {
      console.warn("Exit fullscreen error:", err);
    }
    setActiveExam(null);
  };

  async function loadExamsFromDatabase() {
    setLoading(true);
    setError("");
    try {
      if (!activeSession?.token) {
        setLoading(false);
        return;
      }

      const data = await apiRequest("/assignments/student/exams", {}, activeSession.token);
      const fetchedExams = Array.isArray(data?.exams)
        ? data.exams.map((item) => {
            const start = item.startRaw ? new Date(item.startRaw) : (item.startTime && item.startTime !== "Scheduled" ? new Date(item.startTime) : null);
            const end = item.endRaw ? new Date(item.endRaw) : (item.endTime && item.endTime !== "TBA" ? new Date(item.endTime) : null);
            return {
              ...item,
              startRaw: start,
              endRaw: end
            };
          })
        : [];

      setExams(fetchedExams);
      setCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (err) {
      console.error("Failed to load database exams:", err);
      setError(err.message || "Failed to load examination schedule from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExamsFromDatabase();
  }, [activeSession?.token]);

  const filteredExams = exams.filter((exam) => {
    if (filterTab === "mst" && !exam.isMst && exam.type !== "mst") return false;
    if (filterTab === "quiz" && exam.type !== "quiz" && exam.type !== "assignment") return false;
    if (filterTab === "completed" && exam.status !== "completed") return false;
    if (filterTab === "all" && exam.status === "completed") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        exam.title.toLowerCase().includes(q) ||
        exam.courseCode.toLowerCase().includes(q) ||
        exam.courseTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const liveExamsCount = exams.filter((e) => e.status === "live").length;
  const upcomingExamsCount = exams.filter((e) => e.status === "upcoming").length;
  const completedExamsCount = exams.filter((e) => e.status === "completed").length;

  if (activeExam) {
    return (
      <PlatformLayout role={userRole} activeItem={`/${userRole}/exams`}>
        <div style={{ padding: "0.5rem" }}>
          <button
            onClick={handleExitExam}
            className="lc-submit-btn"
            style={{
              width: "auto",
              marginBottom: "0.75rem",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--lc-border)"
            }}
          >
            ← Exit Exam Workspace
          </button>
          <CourseAssessmentWorkspace
            assignmentId={activeExam.id}
            courseId={activeExam.courseId}
            exam={activeExam}
            courseTitle={`${activeExam.courseCode}: ${activeExam.courseTitle}`}
            assignmentTitle={activeExam.title}
            dueDate={activeExam.endTime}
            lastSubmission={activeExam.submittedAt || "In Progress..."}
            initialFullScreen={true}
            onExitExam={handleExitExam}
          />
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout role={userRole} activeItem={`/${userRole}/exams`}>
      <div className="lc-dashboard-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        
        {/* Page Header */}
        <div className="lc-page-header" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{
                background: userRole === "admin" ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 126, 41, 0.15)",
                color: userRole === "admin" ? "#ef4444" : "#ff7e29",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: userRole === "admin" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 126, 41, 0.3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}>
                {userRole === "admin" ? "Admin Full Access • MST Controller" : userRole === "faculty" ? "Faculty Course Evaluations" : "Student Examination Portal"}
              </span>
            </div>
            <h1 className="lc-card-title" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--lc-text-primary)" }}>
              Tests & Mid-Sem Examinations (MST)
            </h1>
            <p className="lc-card-subtitle" style={{ color: "var(--lc-text-muted)", marginTop: "0.25rem" }}>
              {userRole === "admin"
                ? "Full administrative control to schedule MST exams, configure start/end times, and manage anti-cheat proctoring across all departments."
                : userRole === "faculty"
                  ? "Create and manage course evaluation assignments and tests for your assigned classes."
                  : "View scheduled MST papers, countdown to start time, and attempt live proctored examinations."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>

            <div style={{
              background: "var(--lc-card-bg)",
              border: "1px solid var(--lc-border)",
              borderRadius: "12px",
              padding: "0.75rem 1.25rem",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)", display: "block" }}>Live Papers</span>
              <strong style={{ fontSize: "1.25rem", color: liveExamsCount > 0 ? "#10b981" : "var(--lc-text-primary)" }}>
                {liveExamsCount}
              </strong>
            </div>
            <div style={{
              background: "var(--lc-card-bg)",
              border: "1px solid var(--lc-border)",
              borderRadius: "12px",
              padding: "0.75rem 1.25rem",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--lc-text-muted)", display: "block" }}>Upcoming</span>
              <strong style={{ fontSize: "1.25rem", color: "#3b82f6" }}>
                {upcomingExamsCount}
              </strong>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--lc-border)",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "all", label: "Active & Scheduled" },
              { id: "mst", label: "MST Exams Only" },
              { id: "quiz", label: "Quizzes & Assignments" },
              { id: "completed", label: "Closed / Results" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                style={{
                  background: filterTab === tab.id ? "var(--lc-accent, #ff7e29)" : "rgba(255,255,255,0.05)",
                  color: filterTab === tab.id ? "#fff" : "var(--lc-text-muted)",
                  border: "1px solid",
                  borderColor: filterTab === tab.id ? "var(--lc-accent, #ff7e29)" : "var(--lc-border)",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div style={{ width: "240px" }}>
              <input
                type="text"
                placeholder="Search paper or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="lc-form-input"
                style={{ fontSize: "0.85rem", padding: "0.45rem 0.85rem" }}
              />
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--lc-text-muted)" }}>
            <p>Loading database examination papers...</p>
          </div>
        )}

        {error && (
          <div className="lc-error-banner" style={{ marginBottom: "1.5rem" }}>
            <span>{error}</span>
          </div>
        )}

        {/* Exam Cards Grid */}
        {!loading && filteredExams.length === 0 ? (
          <div style={{
            background: "var(--lc-card-bg)",
            border: "1px dashed var(--lc-border)",
            borderRadius: "16px",
            padding: "3rem",
            textAlign: "center",
            color: "var(--lc-text-muted)"
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 1rem", opacity: 0.5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No examination papers found</h3>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {userRole === "admin"
                ? "Click '+ Schedule MST Exam' above to schedule new mid-semester examinations."
                : "No active or scheduled tests match your selected filter."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
            {filteredExams.map((exam) => {
              const now = new Date();
              const isStartTimeReached = !exam.startRaw || now >= exam.startRaw;
              const isEndTimePassed = exam.endRaw && now > exam.endRaw;

              return (
                <div
                  key={exam.id}
                  style={{
                    background: "var(--lc-card-bg)",
                    border: exam.status === "live" ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid var(--lc-border)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: exam.status === "live" ? "0 4px 20px rgba(16, 185, 129, 0.1)" : "none"
                  }}
                >
                  <div>
                    {/* Header Badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#3b82f6",
                        background: "rgba(59, 130, 246, 0.12)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid rgba(59, 130, 246, 0.3)"
                      }}>
                        {exam.courseCode}
                      </span>

                      {exam.status === "live" && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#10b981",
                          background: "rgba(16, 185, 129, 0.15)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem"
                        }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                          LIVE NOW
                        </span>
                      )}

                      {exam.status === "upcoming" && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#f59e0b",
                          background: "rgba(245, 158, 11, 0.15)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          border: "1px solid rgba(245, 158, 11, 0.3)"
                        }}>
                          SCHEDULED
                        </span>
                      )}

                      {exam.status === "completed" && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--lc-text-muted)",
                          background: "rgba(255, 255, 255, 0.08)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          border: "1px solid var(--lc-border)"
                        }}>
                          CLOSED / COMPLETED
                        </span>
                      )}
                    </div>

                    {/* Title & Course */}
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--lc-text-primary)", marginBottom: "0.35rem" }}>
                      {exam.title}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)", marginBottom: "0.75rem" }}>
                      {exam.courseTitle} • {exam.instructor}
                    </p>

                    {(exam.targetBatch !== "ALL" || exam.targetYear !== "ALL") && (
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                        {exam.targetBatch !== "ALL" && (
                          <span style={{
                            fontSize: "0.7rem",
                            background: "rgba(147, 51, 234, 0.15)",
                            color: "#c084fc",
                            border: "1px solid rgba(147, 51, 234, 0.3)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "6px",
                            fontWeight: 600
                          }}>
                            🎓 Batch {exam.targetBatch}
                          </span>
                        )}
                        {exam.targetYear !== "ALL" && (
                          <span style={{
                            fontSize: "0.7rem",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#93c5fd",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "6px",
                            fontWeight: 600
                          }}>
                            📅 {exam.targetYear}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Timing details */}
                    <div style={{
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "10px",
                      padding: "0.85rem 1rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      marginBottom: "1.25rem",
                      fontSize: "0.8rem"
                    }}>
                      <div>
                        <span style={{ color: "var(--lc-text-muted)", display: "block" }}>Start Time</span>
                        <strong style={{ color: "var(--lc-text-primary)" }}>{exam.startTime}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--lc-text-muted)", display: "block" }}>End Time</span>
                        <strong style={{ color: "var(--lc-text-primary)" }}>{exam.endTime}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--lc-text-muted)", display: "block" }}>Duration</span>
                        <strong style={{ color: "var(--lc-text-primary)" }}>{exam.durationMinutes} Mins</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--lc-text-muted)", display: "block" }}>Max Marks</span>
                        <strong style={{ color: "var(--lc-text-primary)" }}>{exam.totalMarks} Marks</strong>
                      </div>
                    </div>

                    {exam.status === "completed" && (
                      <div style={{
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: "10px",
                        padding: "0.75rem 1rem",
                        marginBottom: "1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)" }}>Grade Obtained</span>
                        <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>
                          {exam.score !== null ? `${exam.score} / ${exam.totalMarks}` : "Submitted (Pending Grade)"}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer with timing lock */}
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                    {exam.status === "live" ? (
                      <button
                        onClick={() => handleStartExam(exam)}
                        style={{
                          flex: 1,
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.65rem",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem"
                        }}
                      >
                        <span>Start Exam Now</span>
                        <span style={{ fontSize: "1rem" }}>⛶</span>
                      </button>
                    ) : exam.status === "upcoming" ? (
                      <button
                        disabled={!isStartTimeReached}
                        onClick={() => isStartTimeReached && handleStartExam(exam)}
                        style={{
                          flex: 1,
                          background: isStartTimeReached ? "#3b82f6" : "rgba(255, 255, 255, 0.05)",
                          color: isStartTimeReached ? "#fff" : "var(--lc-text-muted)",
                          border: "1px solid var(--lc-border)",
                          borderRadius: "8px",
                          padding: "0.65rem",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: isStartTimeReached ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem"
                        }}
                      >
                        {isStartTimeReached ? (
                          <>
                            <span>Start Exam</span>
                            <span style={{ fontSize: "1rem" }}>⛶</span>
                          </>
                        ) : `Opens on ${exam.startTime}`}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartExam(exam)}
                        style={{
                          flex: 1,
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "var(--lc-text-primary)",
                          border: "1px solid var(--lc-border)",
                          borderRadius: "8px",
                          padding: "0.65rem",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem"
                        }}
                      >
                        <span>Review Paper</span>
                        <span>⛶</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowInstructionsModal(exam)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--lc-text-primary)",
                        border: "1px solid var(--lc-border)",
                        borderRadius: "8px",
                        padding: "0.65rem 0.9rem",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Guidelines
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guidelines Modal */}
        {showInstructionsModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem"
          }}>
            <div style={{
              background: "var(--lc-card-bg)",
              border: "1px solid var(--lc-border)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "520px",
              width: "100%"
            }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                {showInstructionsModal.title} Instructions
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--lc-text-muted)", marginBottom: "1.25rem" }}>
                {showInstructionsModal.courseCode}: {showInstructionsModal.courseTitle}
              </p>

              <div style={{
                background: "rgba(255, 126, 41, 0.08)",
                border: "1px solid rgba(255, 126, 41, 0.2)",
                borderRadius: "10px",
                padding: "1rem",
                marginBottom: "1.5rem"
              }}>
                <strong style={{ fontSize: "0.85rem", color: "#ff7e29", display: "block", marginBottom: "0.5rem" }}>
                  Examination Policy
                </strong>
                <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.825rem", color: "var(--lc-text-muted)" }}>
                  {showInstructionsModal.instructions?.map((inst, idx) => (
                    <li key={idx} style={{ marginBottom: "0.4rem" }}>{inst}</li>
                  ))}
                  <li style={{ color: "#38bdf8", fontWeight: 600, marginTop: "0.5rem" }}>
                    ℹ️ When you start, this exam opens automatically in full screen mode.
                  </li>
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowInstructionsModal(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}
                >
                  Close
                </button>
                {showInstructionsModal.status === "live" ? (
                  <button
                    onClick={() => handleStartExam(showInstructionsModal)}
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.25rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    <span>Start Exam in Full Screen</span>
                    <span>⛶</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
