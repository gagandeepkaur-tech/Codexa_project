import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getStudentSession, getFacultySession, getAdminSession } from "../../utils/session";

export default function StudentProblemList() {
  const isFaculty = window.location.pathname.startsWith("/faculty");
  const isAdmin = window.location.pathname.startsWith("/admin");
  const userRole = isFaculty ? "faculty" : isAdmin ? "admin" : "student";
  const session = isFaculty ? getFacultySession() : isAdmin ? getAdminSession() : getStudentSession();
  const buttonClass = userRole === "admin" ? "admin-button" : "student-button";
  const backToDashboardPath = `/${userRole}/dashboard`;

  const [problems, setProblems] = useState([]);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProblems() {
      try {
        const data = await apiRequest("/problems", {}, session?.token);

        if (isMounted) {
          setProblems(data);
          setStatus({
            loading: false,
            error: ""
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            loading: false,
            error: error.message
          });
        }
      }
    }

    loadProblems();

    return () => {
      isMounted = false;
    };
  }, [session?.token]);

  return (
    <PlatformLayout
      role={userRole}
      eyebrow="Problem Set"
      title="Choose your next coding challenge"
      subtitle="Browse the practice bank the way you would on a modern coding platform, then open a prompt to solve it in the full workspace."
      meta={`${problems.length} problems`}
      actions={
        <Link className={`auth-button ${buttonClass} panel-action-button`} to={backToDashboardPath}>
          Dashboard
        </Link>
      }
      sidebarNote="Use the problem set like a clean challenge catalog: scan difficulty, open statements quickly, and keep your practice loop tight."
    >
      <PlatformStats
        items={[
          {
            label: "Easy",
            value: problems.filter((problem) => problem.difficulty === "easy").length,
            note: "Warm-up prompts"
          },
          {
            label: "Medium",
            value: problems.filter((problem) => problem.difficulty === "medium").length,
            note: "Interview-style rounds"
          },
          {
            label: "Hard",
            value: problems.filter((problem) => problem.difficulty === "hard").length,
            note: "Stretch problems"
          }
        ]}
      />

      <PlatformSection label="Problem Bank" title="Available practice questions">
        {status.loading ? <p className="dashboard-copy">Loading coding questions...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <div className="question-list">
            {problems.map((problem) => (
              <Link
                className="question-card question-link-card"
                key={problem.id}
                to={`/${userRole}/problems/${problem.id}/solve`}
              >
                <div className="question-card-top">
                  <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                  <span className="question-meta">
                    {new Date(problem.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3>{problem.title}</h3>
                <p>{problem.statement}</p>
                <span className="question-cta">Open workspace</span>
              </Link>
            ))}
          </div>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
