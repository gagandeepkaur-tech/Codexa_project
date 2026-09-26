import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";

export default function AdminStudentSubmissions() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const session = getAdminSession();
  const [student, setStudent] = useState(null);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({
    problemId: "",
    status: "",
    language: "",
    category: ""
  });
  const [studentStatus, setStudentStatus] = useState({
    loading: true,
    error: ""
  });
  const [submissionStatus, setSubmissionStatus] = useState({
    loading: true,
    error: ""
  });

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setStudent(null);
    setSubmissions([]);
    setStudentStatus({
      loading: false,
      error: message
    });
    setSubmissionStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/admin/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      if (!session?.token) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: "Log in as an admin to review submissions."
          });
        }
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/users/${studentId}`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
            return;
          }

          throw new Error(data.message || "Unable to load student.");
        }

        if (isMounted) {
          setStudent(data);
          setStudentStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    async function loadProblems() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load coding questions.");
        }

        if (isMounted) {
          setProblems(data);
        }
      } catch (_error) {
        if (isMounted) {
          setProblems([]);
        }
      }
    }

    loadStudent();
    loadProblems();

    return () => {
      isMounted = false;
    };
  }, [session?.token, studentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setSubmissionStatus({
        loading: true,
        error: ""
      });

      try {
        if (!session?.token) {
          throw new Error("Log in as an admin to review submissions.");
        }

        const params = new URLSearchParams({
          studentId
        });

        if (filters.problemId) {
          params.set("problemId", filters.problemId);
        }

        if (filters.status) {
          params.set("status", filters.status);
        }

        if (filters.language) {
          params.set("language", filters.language);
        }

        if (filters.category) {
          params.set("category", filters.category);
        }

        const response = await fetch(`${apiBaseUrl}/submissions?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(session.token)
          }
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredAdminSession(data.message || "Your admin session expired. Please log in again.");
            return;
          }

          throw new Error(data.message || "Unable to load submissions.");
        }

        if (isMounted) {
          setSubmissions(data);
          setSubmissionStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setSubmissionStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [filters.category, filters.language, filters.problemId, filters.status, session?.token, studentId]);

  const courseSubs = submissions.filter((s) => s.category === "course");
  const pbSubs = submissions.filter((s) => s.category === "problem_bank");
  const courseAcc = courseSubs.filter((s) => s.status === "accepted").length;
  const pbAcc = pbSubs.filter((s) => s.status === "accepted").length;

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Submission Audit Console"
      title={student ? `${student.full_name}'s Progress & Attempts` : "Student submission review"}
      subtitle="Separate progress and submission history for Course Workbench assignments vs. Standalone Practice Problem Bank."
      meta={`${submissions.length} visible submissions`}
      actions={
        <Link className="auth-button ghost-button panel-action-button" to="/admin/students">
          Back to students
        </Link>
      }
      sidebarNote="Use this page as a submission audit console: inspect course assignment progress vs practice problem bank attempts independently."
    >
      {studentStatus.loading ? <p className="dashboard-copy">Loading student...</p> : null}
      {studentStatus.error ? <p className="form-status error">{studentStatus.error}</p> : null}

      {/* Category Selection Tabs */}
      <div className="role-pill-bar" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`role-pill-btn student ${filters.category === "" ? "active" : ""}`}
          onClick={() => setFilters((f) => ({ ...f, category: "" }))}
        >
          <span>🌐 All Activity ({submissions.length})</span>
        </button>
        <button
          type="button"
          className={`role-pill-btn faculty ${filters.category === "course" ? "active" : ""}`}
          onClick={() => setFilters((f) => ({ ...f, category: "course" }))}
        >
          <span>📚 Course Workbench</span>
        </button>
        <button
          type="button"
          className={`role-pill-btn admin ${filters.category === "problem_bank" ? "active" : ""}`}
          onClick={() => setFilters((f) => ({ ...f, category: "problem_bank" }))}
        >
          <span>💻 Practice Problem Bank</span>
        </button>
      </div>

      {/* Categorized Statistics Overview */}
      {student ? (
        <PlatformStats
          items={
            filters.category === "course"
              ? [
                  { label: "Course Submissions", value: courseSubs.length, note: "Course assignment attempts" },
                  { label: "Course Accepted", value: courseAcc, note: "Passing course runs" },
                  { label: "Course Success Rate", value: courseSubs.length > 0 ? `${Math.round((courseAcc / courseSubs.length) * 100)}%` : "0%", note: "Accuracy in courses" }
                ]
              : filters.category === "problem_bank"
                ? [
                    { label: "Problem Bank Practice", value: pbSubs.length, note: "Practice problem attempts" },
                    { label: "Practice Accepted", value: pbAcc, note: "Passing practice runs" },
                    { label: "Practice Success Rate", value: pbSubs.length > 0 ? `${Math.round((pbAcc / pbSubs.length) * 100)}%` : "0%", note: "Accuracy in practice bank" }
                  ]
                : [
                    { label: "Course Submissions", value: `${courseAcc} / ${courseSubs.length} Accepted`, note: "Course assignment activity" },
                    { label: "Problem Bank Practice", value: `${pbAcc} / ${pbSubs.length} Accepted`, note: "Standalone practice activity" },
                    { label: "Total Account Activity", value: `${submissions.length} Total Runs`, note: student.email }
                  ]
          }
        />
      ) : null}

      <PlatformSection label="Filters" title="Narrow the submission stream">
        <div className="filter-bar">
          <select
            aria-label="Filter submissions by category"
            className="filter-select"
            name="category"
            value={filters.category}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                category: event.target.value
              }));
            }}
          >
            <option value="">All Categories (Course & Problem Bank)</option>
            <option value="course">Course Workbench</option>
            <option value="problem_bank">Practice Problem Bank</option>
          </select>
          <select
            aria-label="Filter submissions by problem"
            className="filter-select"
            name="problemId"
            value={filters.problemId}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                problemId: event.target.value
              }));
            }}
          >
            <option value="">All questions</option>
            {problems.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter submissions by status"
            className="filter-select"
            name="status"
            value={filters.status}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                status: event.target.value
              }));
            }}
          >
            <option value="">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong answer</option>
            <option value="time_limit">Time limit</option>
          </select>
          <select
            aria-label="Filter submissions by language"
            className="filter-select"
            name="language"
            value={filters.language}
            onChange={(event) => {
              setFilters((currentFilters) => ({
                ...currentFilters,
                language: event.target.value
              }));
            }}
          >
            <option value="">All languages</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </PlatformSection>

      <PlatformSection label="Attempt History" title="Inspect each submission">
        {submissionStatus.loading ? <p className="dashboard-copy">Loading submissions...</p> : null}
        {submissionStatus.error ? <p className="form-status error">{submissionStatus.error}</p> : null}

        {!submissionStatus.loading && !submissionStatus.error ? (
          <>
            {submissions.length === 0 ? (
              <p className="dashboard-copy">No submissions matched the current filters.</p>
            ) : (
              <div className="history-list">
                {submissions.map((submission) => (
                  <article className="history-card" key={submission.id}>
                    <div className="question-card-top" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className={`status-pill ${submission.status}`}>
                        {submission.status.replaceAll("_", " ")}
                      </span>
                      <span
                        className="role-badge-tag"
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.2rem 0.55rem",
                          background: submission.category === "course" ? "rgba(192, 132, 252, 0.18)" : "rgba(56, 189, 248, 0.18)",
                          color: submission.category === "course" ? "#c084fc" : "#38bdf8",
                          border: submission.category === "course" ? "1px solid rgba(192, 132, 252, 0.4)" : "1px solid rgba(56, 189, 248, 0.4)"
                        }}
                      >
                        {submission.category === "course" ? "📚 Course Workbench" : "💻 Practice Problem Bank"}
                      </span>
                      <span className="question-meta" style={{ marginLeft: "auto" }}>
                        {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <strong style={{ fontSize: "1.05rem", display: "block", marginTop: "0.5rem" }}>{submission.problem_title}</strong>
                    <p className="question-meta">
                      {submission.language.toUpperCase()} - {submission.difficulty}
                    </p>
                    {submission.compiler_output ? (
                      <p className="question-meta">{submission.compiler_output.split("\n")[0]}</p>
                    ) : null}
                    <p className="history-snippet">{submission.source_code}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
