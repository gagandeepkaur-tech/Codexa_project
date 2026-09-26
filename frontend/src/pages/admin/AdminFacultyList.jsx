import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PlatformLayout, PlatformSection, PlatformStats } from "../../components/PlatformLayout/PlatformLayout";
import { clearAdminSession, getAdminSession, getAuthHeaders } from "../../utils/session";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://codexa-project.onrender.com/api";
const initialFacultyForm = {
  fullName: "",
  email: "",
  password: "",
  employeeId: "",
  department: "CSE",
  designation: "Faculty"
};

export default function AdminFacultyList() {
  const session = getAdminSession();
  const [faculty, setFaculty] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    department: "",
    designation: ""
  });
  const [facultyForm, setFacultyForm] = useState(initialFacultyForm);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const [createStatus, setCreateStatus] = useState({ message: "", error: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    userName: null,
    role: "faculty",
    isDeleting: false,
    statusMessage: "",
    statusType: ""
  });

  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editFacultyForm, setEditFacultyForm] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "CSE",
    designation: "Faculty",
    password: ""
  });
  const [editStatus, setEditStatus] = useState({ loading: false, message: "", error: "" });

  function handleOpenEdit(member) {
    setEditingFaculty(member);
    setEditFacultyForm({
      fullName: member.full_name || "",
      email: member.email || "",
      employeeId: member.profile?.employee_id || "",
      department: member.profile?.department || "CSE",
      designation: member.profile?.designation || "Faculty",
      password: ""
    });
    setEditStatus({ loading: false, message: "", error: "" });
  }

  async function handleSaveEditFaculty(event) {
    event.preventDefault();
    if (!editingFaculty) return;
    setEditStatus({ loading: true, message: "", error: "" });

    try {
      const payload = { ...editFacultyForm };
      if (!payload.password || payload.password.trim().length === 0) {
        delete payload.password;
      }
      const response = await fetch(`${apiBaseUrl}/users/${editingFaculty.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update faculty details.");
      }

      setFaculty((prev) =>
        prev.map((f) => (f.id === editingFaculty.id ? { ...f, ...data.user } : f))
      );

      setEditStatus({
        loading: false,
        message: "Faculty details updated successfully!",
        error: ""
      });

      setTimeout(() => {
        setEditingFaculty(null);
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

  function handleExpiredAdminSession(message = "Your admin session expired. Please log in again.") {
    clearAdminSession();
    setFaculty([]);
    setStatus({
      loading: false,
      error: message
    });
  }

  async function loadFaculty(searchValue = "") {
    setStatus({
      loading: true,
      error: ""
    });

    if (!session?.token) {
      setFaculty([]);
      setStatus({
        loading: false,
        error: "Log in as an admin to view faculty."
      });
      return;
    }

    try {
      const params = new URLSearchParams({
        role: "faculty"
      });

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
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

        throw new Error(data.message || "Unable to load faculty.");
      }

      setFaculty(data);
      setStatus({
        loading: false,
        error: ""
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message
      });
    }
  }

  useEffect(() => {
    loadFaculty();
  }, [session?.token]);

  // Group faculty into cohorts by Department & Designation
  const facultyCohorts = useMemo(() => {
    const map = {};
    faculty.forEach((member) => {
      const dept = member.profile?.department || "CSE";
      const desig = member.profile?.designation || "Faculty";
      const key = `${dept}_${desig}`;

      if (!map[key]) {
        map[key] = {
          key,
          department: dept,
          designation: desig,
          members: []
        };
      }
      map[key].members.push(member);
    });

    return Object.values(map).sort(
      (a, b) => a.department.localeCompare(b.department) || a.designation.localeCompare(b.designation)
    );
  }, [faculty]);

  // Distinct Filter options
  const filterOptions = useMemo(() => {
    const departments = new Set();
    const designations = new Set();

    faculty.forEach((member) => {
      if (member.profile?.department) departments.add(member.profile.department);
      if (member.profile?.designation) designations.add(member.profile.designation);
    });

    return {
      departments: Array.from(departments).sort(),
      designations: Array.from(designations).sort()
    };
  }, [faculty]);

  // Active Selected Cohort
  const activeCohort = useMemo(() => {
    if (!filters.department || !filters.designation) return null;
    return facultyCohorts.find(
      (c) => c.department === filters.department && c.designation === filters.designation
    ) || null;
  }, [facultyCohorts, filters.department, filters.designation]);

  // Filtered Faculty strictly isolated to active cohort
  const displayFaculty = useMemo(() => {
    if (!activeCohort) return [];
    const query = filters.search.toLowerCase().trim();
    if (!query) return activeCohort.members;

    return activeCohort.members.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(query) ||
        member.profile?.employee_id?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
    );
  }, [activeCohort, filters.search]);

  async function handleCreateFaculty(event) {
    event.preventDefault();
    setIsCreating(true);
    setCreateStatus({ message: "", error: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/users/faculty-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(session?.token)
        },
        body: JSON.stringify(facultyForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create faculty account.");
      }

      setCreateStatus({
        message: data.message || "Faculty account created successfully.",
        error: ""
      });
      setFacultyForm(initialFacultyForm);
      loadFaculty();
    } catch (error) {
      setCreateStatus({
        message: "",
        error: error.message
      });
    } finally {
      setIsCreating(false);
    }
  }

  function handleDeleteFaculty(facultyId, fullName) {
    setDeleteConfirm({
      show: true,
      userId: facultyId,
      userName: fullName,
      role: "faculty",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  async function confirmDeleteFaculty() {
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
        throw new Error(data.message || "Failed to delete faculty account.");
      }

      setFaculty((prev) => prev.filter((f) => f.id !== deleteConfirm.userId));
      setDeleteConfirm((prev) => ({
        ...prev,
        isDeleting: false,
        statusMessage: data.message || "Faculty account deleted successfully.",
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
      role: "faculty",
      isDeleting: false,
      statusMessage: "",
      statusType: ""
    });
  }

  return (
    <PlatformLayout
      role="admin"
      eyebrow="Faculty Directory"
      title="Create and review faculty login accounts"
      subtitle="Only admin can issue faculty credentials. Faculty members sign in with the assigned college email and password."
      meta={`${faculty.length} faculty`}
      sidebarNote="Keep faculty access controlled by admin so only approved college accounts can enter the teaching portal."
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
            background: "transparent",
            color: "#94A3B8"
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
            background: "linear-gradient(135deg, #7C5CFF, #6366F1)",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(124, 92, 255, 0.4)"
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

      <PlatformStats
        items={[
          {
            label: "Total Faculty",
            value: faculty.length,
            note: "Registered faculty accounts"
          },
          {
            label: "Departments",
            value: new Set(faculty.map((member) => member.profile?.department).filter(Boolean)).size,
            note: "Represented teaching groups"
          },
          {
            label: "Active Cohorts",
            value: facultyCohorts.length,
            note: "Department & designation groups"
          }
        ]}
      />

      <PlatformSection label="Directory" title="Faculty Department & Designation Roster">
        {/* Cohort Selector Header Bar */}
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
                Select Faculty Cohort (Department ➔ Designation)
              </h3>
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Select a department and designation to view isolated faculty records without mixing groups.
              </p>
            </div>

            {activeCohort && (
              <button
                className="compact-btn compact-btn-secondary"
                onClick={() => setFilters({ search: "", department: "", designation: "" })}
                style={{ fontSize: "0.78rem" }}
              >
                ← Back to All Faculty Groups
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
            {/* 1. Department */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>1. Department:</span>
              <select
                className="roster-filter-select"
                value={filters.department}
                onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                style={{ margin: 0 }}
              >
                <option value="">Choose Department</option>
                {filterOptions.departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* 2. Designation */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>2. Designation:</span>
              <select
                className="roster-filter-select"
                value={filters.designation}
                onChange={(e) => setFilters((prev) => ({ ...prev, designation: e.target.value }))}
                style={{ margin: 0 }}
              >
                <option value="">Choose Designation</option>
                {filterOptions.designations.map((desig) => (
                  <option key={desig} value={desig}>{desig}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {status.loading ? <p className="dashboard-copy">Loading faculty...</p> : null}
        {status.error ? <p className="form-status error">{status.error}</p> : null}

        {!status.loading && !status.error ? (
          <>
            {/* IF NO COHORT IS SELECTED YET: Show Faculty Cohort Directory Cards */}
            {!activeCohort ? (
              <div>
                <div style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.88rem", fontWeight: 600 }}>
                  Select a faculty group below to open its member roster:
                </div>

                {facultyCohorts.length === 0 ? (
                  <p className="dashboard-copy">No faculty accounts registered yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                    {facultyCohorts.map((cohort) => (
                      <div
                        key={cohort.key}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            department: cohort.department,
                            designation: cohort.designation
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
                            {cohort.department}
                          </span>
                          <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                            {cohort.members.length} {cohort.members.length === 1 ? "member" : "members"}
                          </span>
                        </div>

                        <h4 style={{ margin: "0 0 0.3rem 0", color: "#fff", fontSize: "1.1rem", fontWeight: 800 }}>
                          {cohort.designation}
                        </h4>

                        <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "1rem" }}>
                          {cohort.department} Faculty Division
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ color: "#64748b" }}>Role: Teaching</span>
                          <span style={{ color: "#7C5CFF", fontWeight: 700 }}>Open Roster →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* WHEN COHORT IS SELECTED: Show isolated roster for this group only */
              <div>
                {/* Search Bar inside selected cohort */}
                <div className="filter-bar" style={{ marginBottom: "1.2rem" }}>
                  <input
                    aria-label="Search faculty"
                    className="filter-input"
                    name="search"
                    placeholder={`Search faculty in ${activeCohort.department} (${activeCohort.designation})...`}
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
                  Showing {displayFaculty.length} of {activeCohort.members.length} faculty in <strong>{activeCohort.department} — {activeCohort.designation}</strong>
                </div>

                {displayFaculty.length === 0 ? (
                  <p className="dashboard-copy">No faculty matched the search in this group.</p>
                ) : (
                  <div className="question-list">
                    {displayFaculty.map((member) => (
                      <article className="question-card" key={member.id}>
                        <div className="question-card-top">
                          <span className="difficulty-pill medium">
                            {member.profile?.employee_id ? `EMP: ${member.profile.employee_id}` : "Faculty"}
                          </span>
                          <span className="question-meta">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3>{member.full_name}</h3>
                        <p>{member.email}</p>
                        <p className="question-meta">
                          {member.profile?.department || "General"} | {member.profile?.designation || "Faculty"}
                        </p>
                        <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                          <button
                            className="compact-btn compact-btn-secondary"
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.35)", padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: "4px", verticalAlign: "middle" }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Details
                          </button>
                          <button
                            className="auth-button ghost-button detail-link inline-link-button platform-danger-btn"
                            type="button"
                            onClick={() => handleDeleteFaculty(member.id, member.full_name)}
                            style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem", margin: 0 }}
                          >
                            Delete Faculty
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </PlatformSection>

      {/* EDIT FACULTY MODAL */}
      {editingFaculty && (
        <div
          className="custom-modal-overlay"
          onClick={(e) => {
            if (e.target.className === "custom-modal-overlay") setEditingFaculty(null);
          }}
        >
          <div className="custom-modal" style={{ maxWidth: "600px", width: "94%", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.8rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", margin: 0, color: "#fff" }}>
                  Edit Faculty Details
                </h2>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Updating credentials for {editingFaculty.full_name}
                </span>
              </div>
              <button
                className="compact-btn compact-btn-secondary"
                type="button"
                onClick={() => setEditingFaculty(null)}
                style={{ padding: "0.3rem 0.6rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditFaculty} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Full Name</label>
                  <input
                    required
                    value={editFacultyForm.fullName}
                    onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>College Email</label>
                  <input
                    required
                    type="email"
                    value={editFacultyForm.email}
                    onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, email: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Employee ID</label>
                  <input
                    required
                    value={editFacultyForm.employeeId}
                    onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Department</label>
                  <select
                    className="roster-filter-select"
                    value={editFacultyForm.department}
                    onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, department: e.target.value }))}
                    style={{ width: "100%" }}
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="EE">EE</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Designation</label>
                <input
                  required
                  value={editFacultyForm.designation}
                  onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Associate Professor, Assistant Professor"
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.3rem" }}>New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  value={editFacultyForm.password}
                  onChange={(e) => setEditFacultyForm((prev) => ({ ...prev, password: e.target.value }))}
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
                  onClick={() => setEditingFaculty(null)}
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
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h2M10 11v6M14 11v6" />
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
                <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>Delete Faculty</h2>
                <p style={{ opacity: 0.8, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                  Are you sure you want to permanently delete faculty member <strong>{deleteConfirm.userName}</strong>? This action will cascade delete all associated courses, materials, and assignments.
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
                    onClick={confirmDeleteFaculty}
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
    </PlatformLayout>
  );
}
