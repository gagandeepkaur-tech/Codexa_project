import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";
import { branchOptions, buildSemesterOptions, sectionOptions } from "../../types/course";
import AdminCourseRoster from "./AdminCourseRoster";


const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const initialStudentForm = {
  fullName: "",
  email: "",
  password: "",
  rollNumber: "",
  branch: branchOptions[0],
  semester: buildSemesterOptions()[0],
  section: sectionOptions[0],
  batch: "2024-2028"
};

export default function AdminStudentList() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get("tab") || "list";

  const session = getAdminSession();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    branch: "",
    semester: ""
  });
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [activeResetStudentId, setActiveResetStudentId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState({ message: "", error: "" });
  const [isResetting, setIsResetting] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [submissionFilters, setSubmissionFilters] = useState({
    problemId: "",
    status: "",
    language: ""
  });
  const [submissionStatus, setSubmissionStatus] = useState({
    loading: true,
    error: ""
  });
  const [problems, setProblems] = useState([]);

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    userName: null,
    role: "student",
    isDeleting: false,
    statusMessage: "",
    statusType: ""
  });

  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    rollNumber: "",
    branch: "CSE",
    semester: 1,
    section: "A",
    batch: "2024-2028",
    password: ""
  });
  const [editStatus, setEditStatus] = useState({ loading: false, message: "", error: "" });

  function handleOpenEdit(student) {
    setEditingStudent(student);
    setEditForm({
      fullName: student.full_name || "",
      email: student.email || "",
      rollNumber: student.profile?.roll_number || "",
      branch: student.profile?.branch || "CSE",
      semester: student.profile?.semester || 1,
      section: student.profile?.section || "A",
      batch: student.profile?.batch || "2024-2028",
      password: ""
    });
    setEditStatus({ loading: false, message: "", error: "" });
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingStudent) return;
    setEditStatus({ loading: true, message: "", error: "" });

    try {
      const payload = { ...editForm };
      if (!payload.password || payload.password.trim().length === 0) {
        delete payload.password;
      }
      const response = await fetch(`${apiBaseUrl}/users/${editingStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update student details.");
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...data.user } : s))
      );

      setEditStatus({
        loading: false,
        message: "Student details updated successfully!",
        error: ""
      });

      setTimeout(() => {
        setEditingStudent(null);
        setEditStatus({ loading: false, message: "", error: "" });
      }, 1000);
    } catch (err) {
      setEditStatus({
        loading: false,
        message: "",
        error: err.message
      });
    }
  }


  async function handleCreateStudent(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/student-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(studentForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create student account.");
      }

      setCreateStatus({
        message: data.message || "Student account created successfully.",
        error: ""
      });
      setStudentForm(initialStudentForm);
      await new Promise((resolve) => setTimeout(resolve, 0));
      navigate(0);
    } catch (error) {
      setCreateStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleResetPassword(event, studentId) {
    event.preventDefault();
    if (newPassword.trim().length < 8) {
      setResetStatus({
        message: "",
        error: "Password must be at least 8 characters long."
      });
      return;
    }

    setIsResetting(true);
    setResetStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/${studentId}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setResetStatus({
        message: data.message || "Password reset successfully.",
        error: ""
      });
      setNewPassword("");
      setTimeout(() => {
        setActiveResetStudentId(null);
        setResetStatus({ message: "", error: "" });
      }, 3000);
    } catch (error) {
      setResetStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsResetting(false);
    }
  }

  function handleDeleteStudent(studentId, fullName) {
    setDeleteConfirm({
      show: true,
      userId: studentId,
      userName: fullName,
      role: "student",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  async function confirmDeleteStudent() {
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      const response = await fetch(`${apiBaseUrl}/users/${deleteConfirm.userId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(session?.token)
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete student account.");
      }

      setStudents((prev) => prev.filter((s) => s.id !== deleteConfirm.userId));
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: data.message || "Student account deleted successfully.",
        statusType: "success"
      }));
    } catch (error) {
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: error.message,
        statusType: "error"
      }));
    }
  }

  function closeDeleteModal() {
    setDeleteConfirm({
      show: false,
      userId: null,
      userName: null,
      role: "student",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }



  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setStudents([]);
    setStatus({
      loading: false,
      error: message
    });

    window.setTimeout(() => {
      navigate("/admin/login");
    }, 300);
  }

  useEffect(() => {
    if (activeTab !== "list") return;

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
            error: "Log in as an admin to view students."
          });
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          role: "student"
        });

        if (filters.search.trim()) {
          params.set("search", filters.search.trim());
        }

        const response = await fetch(`${apiBaseUrl}/users?${params.toString()}`, {
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

          throw new Error(data.message || "Unable to load students.");
        }

        if (isMounted) {
          setStudents(data);
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

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [filters.search, session?.token, activeTab]);

  useEffect(() => {
    if (activeTab !== "submissions") return;

    let isMounted = true;

    async function loadProblems() {
      try {
        const response = await fetch(`${apiBaseUrl}/problems`);
        const data = await response.json();
        if (response.ok && isMounted) {
          setProblems(data);
        }
      } catch (error) {
        console.error("Failed to load problems:", error);
      }
    }

    async function loadAllSubmissions() {
      setSubmissionStatus({
        loading: true,
        error: ""
      });

      if (!session?.token) {
        setSubmissionStatus({
          loading: false,
          error: "Log in as an admin to view submissions."
        });
        return;
      }

      try {
        const params = new URLSearchParams();
        if (submissionFilters.problemId) {
          params.set("problemId", submissionFilters.problemId);
        }
        if (submissionFilters.status) {
          params.set("status", submissionFilters.status);
        }
        if (submissionFilters.language) {
          params.set("language", submissionFilters.language);
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

    loadProblems();
    loadAllSubmissions();

    return () => {
      isMounted = false;
    };
  }, [submissionFilters.language, submissionFilters.problemId, submissionFilters.status, session?.token, activeTab]);

  // Determine page meta layout
  let pageTitle = "View all students on the platform";
  let pageSubtitle = "Search the roster, compare submission activity, and open any learner's submission history from one review screen.";
  let pageMeta = `${students.length} students`;

  if (activeTab === "add") {
    pageTitle = "Add Student Login";
    pageSubtitle = "Create student accounts with college credentials, academic details, and temporary passwords.";
    pageMeta = "New registration";
  } else if (activeTab === "submissions") {
    pageTitle = "All Student Submissions";
    pageSubtitle = "Real-time stream of all student coding attempts, code listings, and execution verdicts.";
    pageMeta = `${submissions.length} total attempts`;
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow={activeTab === "add" ? "Register Users" : activeTab === "submissions" ? "Verdicts stream" : "Student Directory"}
      title={pageTitle}
      subtitle={pageSubtitle}
      meta={pageMeta}
      sidebarNote={
        activeTab === "add"
          ? "Create a temporary password for new students. They can update it from their own Settings panel."
          : activeTab === "submissions"
            ? "Filter by specific language, verdict status, or coding problem to audit and debug code runs across all students."
            : "This directory should feel like an assessment platform roster: quick search, visible activity metrics, and one-click drill-down into attempts."
      }
    >
      {/* Role Switcher Tabs (Students / Faculty / Admins) */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem", background: "rgba(15, 23, 42, 0.8)", padding: "5px", borderRadius: "14px", width: "fit-content", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Link
          to="/admin/students"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "linear-gradient(135deg, #7C5CFF, #6366F1)",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(124, 92, 255, 0.4)"
          }}
        >
          👨‍🎓 Students Directory
        </Link>
        <Link
          to="/admin/faculty"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "transparent",
            color: "#94A3B8"
          }}
        >
          👨‍🏫 Faculty Directory
        </Link>
        <Link
          to="/admin/admins"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "transparent",
            color: "#94A3B8"
          }}
        >
          🛡️ Administrators
        </Link>
      </div>

      {activeTab === "list" && <AdminCourseRoster />}

      {activeTab === "list" && (
        <>
          {/* Top Overview Metrics */}
          {(() => {
            const uniqueBranches = Array.from(new Set(students.map((s) => s.profile?.branch).filter(Boolean)));
            const uniqueBatches = Array.from(new Set(students.map((s) => s.profile?.batch).filter(Boolean)));
            return (
              <PlatformStats
                items={[
                  {
                    label: "Enrolled Students",
                    value: students.length,
                    note: "Total student accounts registered"
                  },
                  {
                    label: "Academic Branches",
                    value: uniqueBranches.length > 0 ? uniqueBranches.length : 1,
                    note: uniqueBranches.length > 0 ? uniqueBranches.join(", ") : "All engineering branches"
                  },
                  {
                    label: "Student Batches",
                    value: uniqueBatches.length > 0 ? uniqueBatches.length : 1,
                    note: uniqueBatches.length > 0 ? uniqueBatches.join(", ") : "Enrolled cohorts"
                  }
                ]}
              />
            );
          })()}

          {/* Student Directory Section */}
          {(() => {
            // Group students into cohorts: Semester -> Branch -> Section
            const cohortMap = {};
            students.forEach((st) => {
              const sem = st.profile?.semester || 1;
              const branch = st.profile?.branch || "General";
              const sec = st.profile?.section || "A";
              const batch = st.profile?.batch || "2024-2028";
              const key = `sem${sem}_${branch}_sec${sec}`;
              if (!cohortMap[key]) {
                cohortMap[key] = {
                  key,
                  semester: sem,
                  branch,
                  section: sec,
                  batch,
                  students: []
                };
              }
              cohortMap[key].students.push(st);
            });

            const cohorts = Object.values(cohortMap).sort(
              (a, b) => a.semester - b.semester || a.branch.localeCompare(b.branch) || a.section.localeCompare(b.section)
            );

            // Active selected cohort
            const activeCohortKey = filters.semester && filters.branch && filters.section
              ? `sem${filters.semester}_${filters.branch}_sec${filters.section}`
              : null;

            const activeCohort = activeCohortKey ? cohortMap[activeCohortKey] : null;

            // Students to display: strictly isolated to active cohort, or empty if none selected
            const cohortStudents = activeCohort ? activeCohort.students : [];
            const displayStudents = cohortStudents.filter((student) => {
              if (filters.search.trim()) {
                const q = filters.search.toLowerCase();
                const nameMatch = student.full_name?.toLowerCase().includes(q);
                const emailMatch = student.email?.toLowerCase().includes(q);
                const rollMatch = student.profile?.roll_number?.toLowerCase().includes(q);
                return nameMatch || emailMatch || rollMatch;
              }
              return true;
            });

            const uniqueBranches = Array.from(new Set(students.map((s) => s.profile?.branch).filter(Boolean)));
            const uniqueSemesters = Array.from(new Set(students.map((s) => s.profile?.semester).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
            const uniqueSections = Array.from(new Set(students.map((s) => s.profile?.section).filter(Boolean))).sort();

            return (
              <PlatformSection
                label="Directory"
                title="Student Roster & Accounts"
                actions={
                  <Link className="compact-btn compact-btn-primary" to="/admin/add-user?role=student" style={{ textDecoration: "none" }}>
                    + Add New Student
                  </Link>
                }
              >
                {/* Cohort Selector Header Bar */}
                <div
                  style={{
                    padding: "1.2rem 1.4rem",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "14px",
                    marginBottom: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", color: "#fff", fontWeight: 700 }}>
                        Select Academic Cohort (Semester ➔ Class ➔ Subclass)
                      </h3>
                      <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                        Select a semester, branch, and section to view isolated student records without mixing cohorts.
                      </p>
                    </div>

                    {activeCohort && (
                      <button
                        className="compact-btn compact-btn-secondary"
                        onClick={() => setFilters((prev) => ({ ...prev, semester: "", branch: "", section: "" }))}
                        style={{ fontSize: "0.78rem" }}
                      >
                        ← Back to All Class Sections
                      </button>
                    )}
                  </div>

                  {/* Dropdown Selectors */}
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
                        {uniqueSemesters.map((sem) => (
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
                        {uniqueBranches.map((br) => (
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
                        {uniqueSections.map((sec) => (
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
                    {/* IF NO COHORT IS SELECTED YET: Display Class & Section Directory Grid */}
                    {!activeCohort ? (
                      <div>
                        <div style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.88rem", fontWeight: 600 }}>
                          Select an academic group below to open its student roster:
                        </div>

                        {cohorts.length === 0 ? (
                          <p className="dashboard-copy" style={{ padding: "1.5rem 0", color: "#94a3b8" }}>
                            No student cohorts registered in database yet.
                          </p>
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
                                      semester: String(cohort.semester),
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
                                    {cohort.students.length} {cohort.students.length === 1 ? "student registered" : "students registered"}
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                    <span style={{ color: "#64748b" }}>Class Success: <strong style={{ color: avgSuccess > 50 ? "#22c55e" : "#38bdf8" }}>{avgSuccess}%</strong></span>
                                    <span style={{ color: "#7C5CFF", fontWeight: 700 }}>Open Roster →</span>
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
                        {/* Search Toolbar inside selected cohort */}
                        <div className="roster-toolbar" style={{ marginBottom: "1.2rem" }}>
                          <div className="roster-search-wrapper" style={{ flex: 1 }}>
                            <svg className="roster-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                              aria-label="Search students"
                              className="roster-search-input"
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

                          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>
                            Showing {displayStudents.length} of {cohortStudents.length} students in this section
                          </span>
                        </div>

                        {displayStudents.length === 0 ? (
                          <p className="dashboard-copy" style={{ padding: "1.5rem 0", color: "#94a3b8" }}>
                            No students found matching your search in this section.
                          </p>
                        ) : (
                          <div className="roster-grid">
                            {displayStudents.map((student) => {
                              const acceptedRuns = student.accepted_count || 0;
                              const totalSubmissions = student.submission_count || 0;
                              const progressPct = totalSubmissions > 0 ? Math.min(100, Math.round((acceptedRuns / totalSubmissions) * 100)) : 0;
                              const initials = student.full_name
                                ? student.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "ST";

                              return (
                                <article className="student-roster-card" key={student.id}>
                                  <div className="student-card-header">
                                    <div className="student-info-meta">
                                      <div className="student-avatar-circle">
                                        {initials}
                                      </div>
                                      <div>
                                        <h3 className="student-name">{student.full_name}</h3>
                                        <span className="student-email">{student.email}</span>
                                      </div>
                                    </div>

                                    <div className="student-badges-container">
                                      <span className="roll-number-badge">
                                        ROLL: {student.profile?.roll_number || "N/A"}
                                      </span>
                                      <span className="academic-meta-badge">
                                        {student.profile?.branch || "CSE"} • Sem {student.profile?.semester || "1"} • Sec {student.profile?.section || "A"} • {student.profile?.batch || "2023-2027"}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ margin: "0.85rem 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "600", marginBottom: "6px" }}>
                                      <span style={{ color: "#94a3b8" }}>Platform Success Rate</span>
                                      <span style={{ color: progressPct > 70 ? "#22c55e" : progressPct > 35 ? "#38bdf8" : "#f59e0b" }}>
                                        {progressPct}% ({acceptedRuns} accepted)
                                      </span>
                                    </div>
                                    <div className="progress-meter" style={{ height: "6px", background: "rgba(148, 163, 184, 0.12)", borderRadius: "6px", overflow: "hidden" }}>
                                      <div
                                        className="progress-meter-fill"
                                        style={{
                                          width: `${progressPct}%`,
                                          background: progressPct > 70 ? "linear-gradient(90deg, #22c55e, #16a34a)" : progressPct > 35 ? "linear-gradient(90deg, #38bdf8, #0284c7)" : "linear-gradient(90deg, #f59e0b, #d97706)",
                                          height: "100%",
                                          borderRadius: "6px"
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="compact-action-row">
                                    <Link
                                      className="compact-btn compact-btn-primary"
                                      to={`/admin/students/${student.id}/submissions`}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                      Open Student Progress →
                                    </Link>
                                    <button
                                      className="compact-btn compact-btn-secondary"
                                      type="button"
                                      onClick={() => handleOpenEdit(student)}
                                      style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.35)" }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      Edit Details
                                    </button>
                                    <button
                                      className="compact-btn compact-btn-secondary"
                                      type="button"
                                      onClick={() => {
                                        if (activeResetStudentId === student.id) {
                                          setActiveResetStudentId(null);
                                          setNewPassword("");
                                          setResetStatus({ message: "", error: "" });
                                        } else {
                                          setActiveResetStudentId(student.id);
                                          setNewPassword("");
                                          setResetStatus({ message: "", error: "" });
                                        }
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                      </svg>
                                      {activeResetStudentId === student.id ? "Cancel" : "Reset Password"}
                                    </button>
                                    <button
                                      className="compact-btn compact-btn-danger"
                                      type="button"
                                      onClick={() => handleDeleteStudent(student.id, student.full_name)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>

                                  {activeResetStudentId === student.id ? (
                                    <form
                                      className="auth-form"
                                      onSubmit={(e) => handleResetPassword(e, student.id)}
                                      style={{
                                        marginTop: "1rem",
                                        padding: "1rem",
                                        background: "rgba(15, 23, 42, 0.6)",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255, 255, 255, 0.1)"
                                      }}
                                    >
                                      <strong style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "#f8fafc" }}>
                                        Reset password for {student.full_name}
                                      </strong>
                                      <input
                                        placeholder="Enter new password (min 8 chars)"
                                        required
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "0.55rem 0.8rem",
                                          marginBottom: "0.75rem",
                                          background: "rgba(0, 0, 0, 0.3)",
                                          border: "1px solid rgba(255, 255, 255, 0.15)",
                                          borderRadius: "6px",
                                          color: "#fff",
                                          fontSize: "0.85rem"
                                        }}
                                      />
                                      <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button
                                          className="compact-btn compact-btn-primary"
                                          disabled={isResetting}
                                          type="submit"
                                        >
                                          {isResetting ? "Saving..." : "Update Password"}
                                        </button>
                                        <button
                                          className="compact-btn compact-btn-secondary"
                                          type="button"
                                          onClick={() => {
                                            setActiveResetStudentId(null);
                                            setNewPassword("");
                                            setResetStatus({ message: "", error: "" });
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      {resetStatus.message ? <p className="form-status success" style={{ marginTop: "0.5rem" }}>{resetStatus.message}</p> : null}
                                      {resetStatus.error ? <p className="form-status error" style={{ marginTop: "0.5rem" }}>{resetStatus.error}</p> : null}
                                    </form>
                                  ) : null}
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
            );
          })()}
        </>
      )}

      {activeTab === "submissions" && (
        <>
          <PlatformSection label="Filters" title="Narrow the submission stream">
            <div className="filter-bar">
              <select
                aria-label="Filter submissions by problem"
                className="filter-select"
                name="problemId"
                value={submissionFilters.problemId}
                onChange={(event) => {
                  setSubmissionFilters((currentFilters) => ({
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
                value={submissionFilters.status}
                onChange={(event) => {
                  setSubmissionFilters((currentFilters) => ({
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
                value={submissionFilters.language}
                onChange={(event) => {
                  setSubmissionFilters((currentFilters) => ({
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

          <PlatformSection label="Attempt History" title="Inspect recent submissions across all students">
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
                        <div className="question-card-top">
                          <span className={`status-pill ${submission.status}`}>
                            {submission.status.replaceAll("_", " ")}
                          </span>
                          <span className="question-meta">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                          <strong>{submission.problem_title}</strong>
                          <span className="question-meta" style={{ fontWeight: 500 }}>
                            by {submission.student_name || "Unknown Student"} ({submission.student_email || "no email"})
                          </span>
                        </div>
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
        </>
      )}

      {deleteConfirm.show && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: "#ef4444"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
            </div>
            
            {deleteConfirm.statusMessage ? (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>
                  {deleteConfirm.statusType === "success" ? "Success" : "Error"}
                </h2>
                <p style={{ color: deleteConfirm.statusType === "success" ? "#10b981" : "#ef4444", marginBottom: "1.5rem" }}>
                  {deleteConfirm.statusMessage}
                </p>
                <button
                  className="auth-button admin-button"
                  style={{ width: "100%", marginTop: 0 }}
                  onClick={closeDeleteModal}
                >
                  Okay
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>Delete Student</h2>
                <p style={{ opacity: 0.8, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                  Are you sure you want to permanently delete student <strong>{deleteConfirm.userName}</strong>? This action will cascade delete all associated profiles, enrollments, and submissions.
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="auth-button ghost-button"
                    style={{ flex: 1, marginTop: 0, border: "1px solid rgba(148, 163, 184, 0.3)" }}
                    onClick={closeDeleteModal}
                    disabled={deleteConfirm.isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="auth-button"
                    style={{
                      flex: 1,
                      marginTop: 0,
                      background: "#ef4444",
                      borderColor: "#ef4444",
                      color: "#ffffff"
                    }}
                    onClick={confirmDeleteStudent}
                    disabled={deleteConfirm.isDeleting}
                  >
                    {deleteConfirm.isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div
          className="custom-modal-overlay"
          onClick={(e) => {
            if (e.target.className === "custom-modal-overlay") setEditingStudent(null);
          }}
        >
          <div className="custom-modal" style={{ maxWidth: "620px", width: "94%", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.8rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", margin: 0, color: "#fff" }}>
                  Edit Student Details
                </h2>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Updating record for {editingStudent.full_name}
                </span>
              </div>
              <button
                className="compact-btn compact-btn-secondary"
                type="button"
                onClick={() => setEditingStudent(null)}
                style={{ padding: "0.3rem 0.6rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Full Name</label>
                  <input
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>College Email</label>
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Roll Number</label>
                  <input
                    required
                    value={editForm.rollNumber}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, rollNumber: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Batch / Year</label>
                  <input
                    required
                    value={editForm.batch}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, batch: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Branch (Class)</label>
                  <select
                    value={editForm.branch}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, branch: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="EE">EE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Semester</label>
                  <select
                    value={editForm.semester}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, semester: parseInt(e.target.value, 10) }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Section (Subclass)</label>
                  <select
                    value={editForm.section}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, section: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  >
                    {["A", "B", "C", "D", "E"].map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              {editStatus.message ? (
                <p className="form-status success" style={{ margin: "0.4rem 0" }}>{editStatus.message}</p>
              ) : null}
              {editStatus.error ? (
                <p className="form-status error" style={{ margin: "0.4rem 0" }}>{editStatus.error}</p>
              ) : null}

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.6rem" }}>
                <button
                  type="button"
                  className="compact-btn compact-btn-secondary"
                  style={{ flex: 1, padding: "0.65rem" }}
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="compact-btn compact-btn-primary"
                  style={{ flex: 1, padding: "0.65rem" }}
                  disabled={editStatus.loading}
                >
                  {editStatus.loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
