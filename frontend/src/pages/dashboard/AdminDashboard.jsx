import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import StudentProgressAnalytics from "../../components/StudentProgressAnalytics/StudentProgressAnalytics";
import { PlatformLayout } from "../../components/PlatformLayout/PlatformLayout";
import { getAdminSession, getAuthHeaders } from "../../utils/session";
import { apiRequest } from "../../utils/api";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getLogDisplay(log) {
  const details = log.details || {};
  switch (log.action_type) {
    // User-management actions (logged directly in user.controller.js)
    case "create_student":
      return {
        text: `New student registered: ${details.full_name || details.email || "Student"}`,
        dot: "green"
      };
    case "create_faculty":
      return {
        text: `Faculty ${details.full_name || details.fullName || "Faculty member"} added to ${details.department || "department"}`,
        dot: "orange"
      };
    case "reset_password":
      return {
        text: `Password reset for ${details.full_name || details.email || "user"}`,
        dot: "purple"
      };
    case "delete_user":
      return {
        text: `${details.role === "faculty" ? "Faculty" : "Student"} account removed: ${details.full_name || details.email || "user"}`,
        dot: "gray"
      };
    // Problem-bank actions (logged via logAdminAction in problem.controller.js)
    case "problem_created":
      return {
        text: `New problem "${details.title || "Untitled"}" added to the problem bank`,
        dot: "yellow"
      };
    case "problem_updated":
      return {
        text: `Problem "${details.title || "Untitled"}" was updated`,
        dot: "orange"
      };
    case "problem_deleted":
      return {
        text: `Problem "${details.title || "Untitled"}" was deleted`,
        dot: "gray"
      };
    // Course actions
    case "create_course":
      return {
        text: `Course "${details.title || "New course"}" created${details.semesterTargets ? " for Sem " + details.semesterTargets.join(", ") : ""}`,
        dot: "orange"
      };
    default:
      return {
        text: `${log.action_type.replaceAll("_", " ")}: ${log.target_type}`,
        dot: "gray"
      };
  }
}



export default function AdminDashboard() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get("tab") || "overview";

  const [session, setSession] = useState(location.state?.session || getAdminSession());
  const [problems, setProblems] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [logs, setLogs] = useState([]);

  const [problemStatus, setProblemStatus] = useState({ loading: true, error: "" });
  const [studentStatus, setStudentStatus] = useState({ loading: true, error: "" });
  const [facultyStatus, setFacultyStatus] = useState({ loading: true, error: "" });
  const [courseStatus, setCourseStatus] = useState({ loading: true, error: "" });
  const [submissionStatus, setSubmissionStatus] = useState({ loading: true, error: "" });
  const [logStatus, setLogStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    loadProblems();
    loadStudents();
    loadFaculty();
    loadCourses();
    loadSubmissions();
    loadLogs();
  }, [session?.token]);

  async function loadProblems() {
    try {
      const response = await fetch(`${apiBaseUrl}/problems`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load coding questions.");
      setProblems(data);
      setProblemStatus({ loading: false, error: "" });
    } catch (error) {
      setProblemStatus({ loading: false, error: error.message });
    }
  }

  async function loadFaculty() {
    if (!session?.token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/users?role=faculty`, {
        headers: getAuthHeaders(session.token)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load faculty.");
      setFaculty(data);
      setFacultyStatus({ loading: false, error: "" });
    } catch (error) {
      setFacultyStatus({ loading: false, error: error.message });
    }
  }

  async function loadStudents() {
    if (!session?.token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/users?role=student`, {
        headers: getAuthHeaders(session.token)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load students.");
      setStudents(data);
      setStudentStatus({ loading: false, error: "" });
    } catch (error) {
      setStudentStatus({ loading: false, error: error.message });
    }
  }

  async function loadCourses() {
    if (!session?.token) return;
    try {
      setCourseStatus({ loading: true, error: "" });
      const data = await apiRequest("/courses", {}, session.token);
      setCourses(data);
      setCourseStatus({ loading: false, error: "" });
    } catch (error) {
      console.error("Failed to load courses:", error);
      setCourseStatus({ loading: false, error: error.message });
    }
  }

  async function loadSubmissions() {
    if (!session?.token) return;
    try {
      setSubmissionStatus({ loading: true, error: "" });
      const data = await apiRequest("/submissions", {}, session.token);
      setSubmissions(data);
      setSubmissionStatus({ loading: false, error: "" });
    } catch (error) {
      console.error("Failed to load submissions:", error);
      setSubmissionStatus({ loading: false, error: error.message });
    }
  }

  async function loadLogs() {
    if (!session?.token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/admin/logs?limit=6`, {
        headers: getAuthHeaders(session.token)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load admin activity.");
      setLogs(data);
      setLogStatus({ loading: false, error: "" });
    } catch (error) {
      setLogStatus({ loading: false, error: error.message });
    }
  }

  const mergedActivities = logs.map((log) => {
    const display = getLogDisplay(log);
    return {
      text: display.text,
      dot: display.dot,
      time: timeAgo(log.created_at)
    };
  });

  return (
    <PlatformLayout
      role="admin"
      title={activeTab === "analytics" ? "Platform Analytics" : "Admin Dashboard"}
      subtitle={activeTab === "analytics" ? "Detailed activity logs and platform health check" : "Full platform control — users, courses, problems, analytics"}
    >


      {/* Metrics Cards Grid */}
      <div className="platform-stats-grid">
        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <span>Total Students</span>
          <strong>
            {studentStatus.loading ? (
              <span style={{ opacity: 0.5 }}>...</span>
            ) : (
              students.length.toLocaleString()
            )}
          </strong>
        </article>

        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span>Total Faculty</span>
          <strong>
            {facultyStatus.loading ? (
              <span style={{ opacity: 0.5 }}>...</span>
            ) : (
              faculty.length.toLocaleString()
            )}
          </strong>
        </article>

        <article className="platform-stat-card">
          <div className="stat-card-icon-wrapper purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span>Active Courses</span>
          <strong>
            {courseStatus.loading ? (
              <span style={{ opacity: 0.5 }}>...</span>
            ) : (
              courses.length.toLocaleString()
            )}
          </strong>
        </article>
      </div>


      {/* Recent Activity Section — only on the overview tab */}
      {activeTab === "overview" && (
        <section className="recent-activity-section">
          <h3 className="recent-activity-header">Recent Activity</h3>
          <div className="recent-activity-list">
            {logStatus.loading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, idx) => (
                <article className="activity-item-row" key={idx} style={{ opacity: 0.45 }}>
                  <div className="activity-item-left">
                    <span className="activity-dot gray" />
                    <span className="activity-text" style={{ background: "var(--lc-border)", borderRadius: 4, color: "transparent", userSelect: "none" }}>
                      Loading recent activity…
                    </span>
                  </div>
                  <span className="activity-time" style={{ background: "var(--lc-border)", borderRadius: 4, color: "transparent", userSelect: "none" }}>—</span>
                </article>
              ))
            ) : mergedActivities.length === 0 ? (
              <p style={{ padding: "0.75rem 0.5rem", color: "var(--lc-text-secondary)", fontSize: "0.875rem" }}>
                No activity recorded yet.
              </p>
            ) : (
              mergedActivities.map((activity, idx) => (
                <article className="activity-item-row" key={idx}>
                  <div className="activity-item-left">
                    <span className={`activity-dot ${activity.dot}`} />
                    <span className="activity-text">{activity.text}</span>
                  </div>
                  <span className="activity-time">{activity.time}</span>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* Status Messages */}
      {problemStatus.error && <p className="form-status error">{problemStatus.error}</p>}
      {studentStatus.error && <p className="form-status error">{studentStatus.error}</p>}
      {facultyStatus.error && <p className="form-status error">{facultyStatus.error}</p>}
      {logStatus.error && <p className="form-status error">{logStatus.error}</p>}

      {/* Student Progress Analytics Section — rendered on Analytics tab */}
      {activeTab === "analytics" && (
        <StudentProgressAnalytics role="admin" session={session} />
      )}

    </PlatformLayout>
  );
}
