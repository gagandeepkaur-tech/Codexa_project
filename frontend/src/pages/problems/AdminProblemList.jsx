import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { apiRequest } from "../../utils/api";
import { getAdminSession } from "../../utils/session";

export default function AdminProblemList() {
  const session = getAdminSession();
  const [problems, setProblems] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    difficulty: "",
    branch: "",
    semester: "",
    batch: ""
  });
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProblems() {
      setStatus((currentStatus) => ({
        ...currentStatus,
        loading: true,
        error: ""
      }));

      try {
        const params = new URLSearchParams();

        if (filters.search.trim()) {
          params.set("q", filters.search.trim());
        }

        if (filters.difficulty) {
          params.set("difficulty", filters.difficulty);
        }

        if (filters.branch) {
          params.set("branch", filters.branch);
        }

        if (filters.semester) {
          params.set("semester", filters.semester);
        }

        if (filters.batch) {
          params.set("batch", filters.batch);
        }

        const query = params.toString();
        const data = await apiRequest(`/problems${query ? `?${query}` : ""}`, {}, session?.token);

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
  }, [filters.batch, filters.branch, filters.difficulty, filters.search, filters.semester, session?.token]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value
    }));
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Problem Bank"
      title="Review and curate coding questions"
      subtitle="Search, filter by branch/semester/batch criteria, and manage faculty editing permissions."
      meta={`${problems.length} questions`}
      actions={
        <Link className="auth-button admin-button panel-action-button" to="/admin/problems/new">
          Add problem
        </Link>
      }
      sidebarNote="Treat this like a professional problem library: filter by cohort criteria, manage faculty edit locks, and keep questions well curated."
    >
      <PlatformStats
        items={[
          { label: "Easy", value: problems.filter((problem) => problem.difficulty === "easy").length, note: "Entry-level prompts" },
          { label: "Medium", value: problems.filter((problem) => problem.difficulty === "medium").length, note: "Core interview problems" },
          { label: "Hard", value: problems.filter((problem) => problem.difficulty === "hard").length, note: "Advanced challenges" }
        ]}
      />

      <PlatformSection label="Filters" title="Search & Filter by Target Cohort">
        <div className="filter-bar" style={{ flexWrap: "wrap" }}>
          <input
            aria-label="Search questions"
            className="filter-input"
            name="search"
            placeholder="Search by title or statement"
            type="search"
            value={filters.search}
            onChange={handleFilterChange}
          />
          <select
            aria-label="Filter by difficulty"
            className="filter-select"
            name="difficulty"
            value={filters.difficulty}
            onChange={handleFilterChange}
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            aria-label="Filter by branch"
            className="filter-select"
            name="branch"
            value={filters.branch}
            onChange={handleFilterChange}
          >
            <option value="">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
            <option value="ME">ME</option>
            <option value="CE">CE</option>
            <option value="EE">EE</option>
          </select>
          <select
            aria-label="Filter by semester"
            className="filter-select"
            name="semester"
            value={filters.semester}
            onChange={handleFilterChange}
          >
            <option value="">All Semesters</option>
            <option value="1">Sem 1</option>
            <option value="2">Sem 2</option>
            <option value="3">Sem 3</option>
            <option value="4">Sem 4</option>
            <option value="5">Sem 5</option>
            <option value="6">Sem 6</option>
            <option value="7">Sem 7</option>
            <option value="8">Sem 8</option>
          </select>
        </div>
      </PlatformSection>

      <PlatformSection label="Question List" title="Open any problem for admin review">
        {status.loading ? <p className="dashboard-copy">Loading coding questions...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <>
            {problems.length === 0 ? (
              <p className="dashboard-copy">
                No questions matched the current search and filter settings.
              </p>
            ) : (
              <div className="question-list">
                {problems.map((problem) => (
                  <Link
                    className="question-card question-link-card"
                    key={problem.id}
                    to={`/admin/problems/${problem.id}`}
                  >
                    <div className="question-card-top" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className={`difficulty-pill ${problem.difficulty}`}>{problem.difficulty}</span>
                      <span
                        className="role-badge-tag"
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.2rem 0.5rem",
                          background: problem.allow_faculty_edit ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: problem.allow_faculty_edit ? "#fde047" : "#f87171",
                          border: problem.allow_faculty_edit ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)"
                        }}
                      >
                        {problem.allow_faculty_edit ? "✏️ Faculty Editable" : "🔒 Admin Only"}
                      </span>
                      <span className="question-meta" style={{ marginLeft: "auto" }}>
                        {new Date(problem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={{ marginTop: "0.5rem" }}>{problem.title}</h3>
                    <p>{problem.statement}</p>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>🎯 {problem.target_branch || "ALL"}</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>• {problem.target_semester === "ALL" ? "All Sem" : `Sem ${problem.target_semester}`}</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>• {problem.target_batch || "ALL"}</span>
                    </div>
                    <span className="question-cta" style={{ marginTop: "0.75rem" }}>Open admin view</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : null}
      </PlatformSection>
    </PlatformLayout>
  );
}
