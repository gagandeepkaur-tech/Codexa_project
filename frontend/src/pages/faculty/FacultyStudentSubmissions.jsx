import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { clearFacultySession, getFacultySession } from "../../utils/session";

export default function FacultyStudentSubmissions() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const session = getFacultySession();
  const [student, setStudent] = useState(null);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({
    problemId: "",
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

  function handleExpiredFacultySession(message = "Your faculty session expired. Please log in again.") {
    clearFacultySession();
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
      navigate("/faculty/login");
    }, 300);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      if (!session?.token) {
        if (isMounted) {
          setStudentStatus({
            loading: false,
            error: "Log in as faculty to review submissions."
          });
        }
        return;
      }

      try {
        const data = await apiRequest(`/users/${studentId}`, {}, session.token);

        if (isMounted) {
          setStudent(data);
          setStudentStatus({
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

          setStudentStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    async function loadProblems() {
      try {
        const data = await apiRequest("/problems", {}, session?.token);

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
          throw new Error("Log in as faculty to review submissions.");
        }

        const params = new URLSearchParams();
        if (filters.problemId) {
          params.set("problemId", filters.problemId);
        }
        if (filters.category) {
          params.set("category", filters.category);
        }

        const data = await apiRequest(`/submissions/student/${studentId}?${params.toString()}`, {}, session.token);

        if (isMounted) {
          setSubmissions(data);
          setSubmissionStatus({
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
  }, [filters.category, filters.problemId, session?.token, studentId]);

  const courseSubs = submissions.filter((s) => s.category === "course");
  const pbSubs = submissions.filter((s) => s.category === "problem_bank");
  const courseAcc = courseSubs.filter((s) => s.status === "accepted").length;
  const pbAcc = pbSubs.filter((s) => s.status === "accepted").length;

  return (
    <PlatformLayout
      role="faculty"
      eyebrow="Submission Audit Console"
      title={student ? `${student.full_name}'s Progress & Attempts` : "Student submission review"}
      subtitle="Inspect coding attempts for students separated by Course Workbench assignments vs Standalone Practice Problem Bank."
      meta={`${submissions.length} submissions`}
      actions={
        <Link className="auth-button ghost-button panel-action-button" to="/faculty/students">
          Back to students
        </Link>
      }
      sidebarNote="This view gives faculty teaching visibility into attempts, clearly distinguishing course assignment submissions from independent practice bank runs."
    >
      {studentStatus.loading ? <p className="dashboard-copy">Loading student...</p> : null}
      {studentStatus.error ? <p className="form-status error">{studentStatus.error}</p> : null}

      <div className="role-pill-bar" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`role-pill-btn student ${filters.category === "" ? "active" : ""}`}
          onClick={() => setFilters((f) => ({ ...f, category: "" }))}
        >
          <span>🌐 All Submissions ({submissions.length})</span>
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
                    { label: "Roster Identity", value: student.profile?.roll_number ? `Roll: ${student.profile.roll_number}` : student.email, note: student.email }
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
                      {submission.language.toUpperCase()} | {submission.difficulty} | {submission.passed_test_cases}/
                      {submission.total_test_cases} tests
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
